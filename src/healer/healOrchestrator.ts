import { setTimeout as delay } from 'timers/promises';
import { ClaudeWrapper } from './claudeWrapper.js';
import { join } from 'path';
import { HealingMemory } from '../memory/HealingMemory.js';
import { getMemoryManager } from '../memory/MemoryManager.js';
import { execSync } from 'child_process';

/**
 * Healing orchestrator that coordinates multiple Claude Code runs with exponential
 * back-off. It attempts to self-heal the repository in case of selector
 * drift. Upon first successful Claude run (exit code 0) the orchestrator may run
 * an optional callback – by default it commits the changes.
 * 
 * Now includes memory of previous healing attempts to make future healing more effective.
 */
export interface HealingOptions {
  /** Maximum number of Claude attempts (default: 3) */
  maxAttempts?: number;

  /** Initial delay between attempts in milliseconds (default: 5 000 ms) */
  initialDelayMs?: number;

  /** Multiplier applied after every failed attempt (default: 2 ×) */
  backoffFactor?: number;

  /** Scraper ID to be healed */
  scraperId: string;

  /** Information about the drift that triggered healing */
  driftInfo: {
    missingFields: string[];
    consecutiveMisses: number;
    threshold: number;
  };

  /**
   * Callback invoked after a successful Claude patch. If it throws, the error
   * is swallowed and the orchestrator still reports success (healing
   * completed). Allows callers to git-commit or send Slack notifications.
   */
  postSuccess?: () => Promise<void>;
}

export class HealingOrchestrator {
  private readonly claude: ClaudeWrapper;
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;
  private readonly backoffFactor: number;
  private readonly postSuccess?: () => Promise<void>;
  private readonly scraperId: string;
  private readonly driftInfo: { missingFields: string[]; consecutiveMisses: number; threshold: number; };
  private readonly healingMemory: HealingMemory;
  private readonly memoryManager = getMemoryManager();

  constructor(
    claude: ClaudeWrapper = new ClaudeWrapper(undefined, join(process.cwd(), 'CLAUDE.md')),
    {
      maxAttempts = Number.parseInt(process.env.HEAL_MAX_ATTEMPTS ?? '3', 10),
      initialDelayMs = Number.parseInt(process.env.HEAL_DELAY_MS ?? '5000', 10),
      backoffFactor = Number.parseFloat(process.env.HEAL_BACKOFF ?? '2'),
      postSuccess,
      scraperId,
      driftInfo,
    }: HealingOptions,
  ) {
    this.claude = claude;
    this.maxAttempts = Math.max(1, maxAttempts);
    this.initialDelayMs = Math.max(0, initialDelayMs);
    this.backoffFactor = Math.max(1, backoffFactor);
    this.postSuccess = postSuccess;
    this.scraperId = scraperId;
    this.driftInfo = driftInfo;
    this.healingMemory = new HealingMemory(scraperId);
    
    // Initialize memory system
    this.memoryManager.initialize().catch(err => {
      console.warn('Failed to initialize memory system:', err);
    });
  }

  /**
   * Attempt to heal the codebase. Returns `true` if Claude managed to apply a
   * patch that passes tests.
   */
  async heal(): Promise<boolean> {
    let attempt = 0;
    let delayMs = this.initialDelayMs;

    // Get changes before we start healing
    const beforeChanges = this.getCodeDiff();

    while (attempt < this.maxAttempts) {
      attempt += 1;
      console.log(`🔧  Healing attempt ${attempt}/${this.maxAttempts}…`);

      // Try to get relevant history from previous healing attempts
      let healingHistory = "";
      try {
        healingHistory = await this.healingMemory.generateHealingContext(this.driftInfo.missingFields);
        console.log(`📚 Found relevant healing history for ${this.scraperId}`);
      } catch (error) {
        console.warn('⚠️  Could not retrieve healing history:', error);
      }

      // Create a prompt for Claude Code to fix the selectors
      const prompt = `
The scraper has encountered selector drift. Please analyze the HTML fixture and update 
the selectors in the scraper code to fix the issue. The HTML and current scraper code
are provided below.

${healingHistory ? `## Previous Healing Attempts\n\n${healingHistory}\n\n` : ''}

## Current Drift Information
- Missing fields: ${this.driftInfo.missingFields.join(', ')}
- Consecutive misses: ${this.driftInfo.consecutiveMisses}/${this.driftInfo.threshold}

Guidelines:
1. Only modify the selectors, not the core functionality
2. Ensure the updated selectors are specific and robust
3. Run tests to verify your changes work
4. Return the updated code as part of your response
5. Explain your reasoning so it can be saved for future healing attempts

After making your changes, please run the tests to verify they pass.
`;

      console.log(`🤖 Running Claude Code with enhanced prompt including healing history...`);
      
      try {
        // Check if Claude CLI is available
        try {
          const { exec } = await import('child_process');
          exec('which claude', (err, stdout) => {
            if (err || !stdout) {
              console.warn('⚠️  Claude CLI not found in path. Make sure it is installed and in your PATH.');
            }
          });
        } catch (error) {
          // Ignore any errors in the check
        }
        
        // Run Claude; capture output and exit code
        const { exitCode, output } = await this.claude.run(prompt);
      
        // Process the result
        if (exitCode === 0) {
          console.log('✅  Claude Code patch succeeded.');

          // Get the changes that were made
          const afterChanges = this.getCodeDiff();
          
          // Extract reasoning from Claude's output (first 500 chars for brevity)
          const reasoning = output?.substring(0, 500) + (output && output.length > 500 ? '...' : '');
          
          // Record the successful healing event
          try {
            await this.healingMemory.addEvent(
              this.driftInfo,
              true,
              afterChanges || 'No changes detected in diff',
              reasoning
            );
            console.log('📝 Healing event recorded in memory');
          } catch (error) {
            console.warn('⚠️  Failed to record healing event:', error);
          }

          try {
            await this.postSuccess?.();
          } catch {/* ignored – healing counts as success regardless */}

          return true;
        } else {
          // Record the failed healing attempt
          try {
            await this.healingMemory.addEvent(
              this.driftInfo,
              false,
              beforeChanges || 'No changes detected',
              output?.substring(0, 500) + (output && output.length > 500 ? '...' : '')
            );
          } catch (error) {
            console.warn('⚠️  Failed to record failed healing event:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error running Claude Code:', error);
        // Continue with the retry logic
      }

      if (attempt < this.maxAttempts) {
        console.log(`⏳  Waiting ${delayMs} ms before next attempt…`);
        await delay(delayMs);
        delayMs *= this.backoffFactor;
      }
    }

    console.warn('❌  Healing failed – maximum retries exceeded.');
    return false;
  }
  
  /**
   * Get a diff of the current code changes
   */
  private getCodeDiff(): string {
    try {
      // Get the diff of any uncommitted changes
      const diff = execSync('git diff').toString();
      return diff || 'No changes detected';
    } catch (error) {
      console.warn('Failed to get code diff:', error);
      return 'Failed to get diff';
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Default git commit helper                                                  */
/* ------------------------------------------------------------------------- */

/**
 * Simple helper that stages *all* modified files and commits them with a
 * conventional `auto-heal:` prefix. Intended to be used as `postSuccess`
 * callback.
 */
export async function gitAutoCommit(message: string): Promise<void> {
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    exec(`git add -A && git commit -m "auto-heal: ${message.replace(/"/g, '')}"`, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}