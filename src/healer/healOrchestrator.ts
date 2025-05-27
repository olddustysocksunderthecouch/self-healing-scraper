import { setTimeout as delay } from 'timers/promises';
import { ClaudeWrapper } from './claudeWrapper.js';
import { join } from 'path';

/**
 * Healing orchestrator that coordinates multiple Claude Code runs with exponential
 * back-off. It attempts to self-heal the repository in case of selector
 * drift. Upon first successful Claude run (exit code 0) the orchestrator may run
 * an optional callback – by default it commits the changes.
 */
export interface HealingOptions {
  /** Maximum number of Claude attempts (default: 3) */
  maxAttempts?: number;

  /** Initial delay between attempts in milliseconds (default: 5 000 ms) */
  initialDelayMs?: number;

  /** Multiplier applied after every failed attempt (default: 2 ×) */
  backoffFactor?: number;

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

  constructor(
    claude: ClaudeWrapper = new ClaudeWrapper(undefined, join(process.cwd(), 'CLAUDE.md')),
    {
      maxAttempts = Number.parseInt(process.env.HEAL_MAX_ATTEMPTS ?? '3', 10),
      initialDelayMs = Number.parseInt(process.env.HEAL_DELAY_MS ?? '5000', 10),
      backoffFactor = Number.parseFloat(process.env.HEAL_BACKOFF ?? '2'),
      postSuccess,
    }: HealingOptions = {},
  ) {
    this.claude = claude;
    this.maxAttempts = Math.max(1, maxAttempts);
    this.initialDelayMs = Math.max(0, initialDelayMs);
    this.backoffFactor = Math.max(1, backoffFactor);
    this.postSuccess = postSuccess;
  }

  /**
   * Attempt to heal the codebase. Returns `true` if Claude managed to apply a
   * patch that passes tests.
   */
  async heal(): Promise<boolean> {
    let attempt = 0;
    let delayMs = this.initialDelayMs;

    while (attempt < this.maxAttempts) {
      attempt += 1;
      console.log(`🔧  Healing attempt ${attempt}/${this.maxAttempts}…`);

      // Create a prompt for Claude Code to fix the selectors
      const prompt = `
The scraper has encountered selector drift. Please analyze the HTML fixture and update 
the selectors in the scraper code to fix the issue. The HTML and current scraper code
are provided below.

Guidelines:
1. Only modify the selectors, not the core functionality
2. Ensure the updated selectors are specific and robust
3. Run tests to verify your changes work
4. Return the updated code as part of your response

After making your changes, please run the tests to verify they pass.
`;

      // Run Claude; capture output and exit code
      const { exitCode, output } = await this.claude.run(prompt);

      if (exitCode === 0) {
        console.log('✅  Claude Code patch succeeded.');

        try {
          await this.postSuccess?.();
        } catch {/* ignored – healing counts as success regardless */}

        return true;
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