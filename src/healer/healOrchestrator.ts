import { setTimeout as delay } from 'timers/promises';
import { CodexWrapper } from './codexWrapper.js';

/**
 * Healing orchestrator that coordinates multiple Codex runs with exponential
 * back-off. It attempts to self-heal the repository in case of selector
 * drift. Upon first successful Codex exit (code 0) the orchestrator may run
 * an optional callback – by default it commits the changes.
 */
export interface HealingOptions {
  /** Maximum number of Codex attempts (default: 3) */
  maxAttempts?: number;

  /** Initial delay between attempts in milliseconds (default: 5 000 ms) */
  initialDelayMs?: number;

  /** Multiplier applied after every failed attempt (default: 2 ×) */
  backoffFactor?: number;

  /**
   * Callback invoked after a successful Codex patch. If it throws, the error
   * is swallowed and the orchestrator still reports success (healing
   * completed). Allows callers to git-commit or send Slack notifications.
   */
  postSuccess?: () => Promise<void>;
}

export class HealingOrchestrator {
  private readonly codex: CodexWrapper;
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;
  private readonly backoffFactor: number;
  private readonly postSuccess?: () => Promise<void>;

  constructor(
    codex: CodexWrapper = new CodexWrapper(),
    {
      maxAttempts = Number.parseInt(process.env.HEAL_MAX_ATTEMPTS ?? '3', 10),
      initialDelayMs = Number.parseInt(process.env.HEAL_DELAY_MS ?? '5000', 10),
      backoffFactor = Number.parseFloat(process.env.HEAL_BACKOFF ?? '2'),
      postSuccess,
    }: HealingOptions = {},
  ) {
    this.codex = codex;
    this.maxAttempts = Math.max(1, maxAttempts);
    this.initialDelayMs = Math.max(0, initialDelayMs);
    this.backoffFactor = Math.max(1, backoffFactor);
    this.postSuccess = postSuccess;
  }

  /**
   * Attempt to heal the codebase. Returns `true` if Codex managed to apply a
   * patch that passes tests.
   */
  async heal(): Promise<boolean> {
    let attempt = 0;
    let delayMs = this.initialDelayMs;

    while (attempt < this.maxAttempts) {
      attempt += 1;
      console.log(`🔧  Healing attempt ${attempt}/${this.maxAttempts}…`);

      // Run Codex; forward current process stdio through wrapper
      // Exit code 0 means success.
      // Any non-zero exit code is considered failure but we will retry.
      const exitCode = await this.codex.run();

      if (exitCode === 0) {
        console.log('✅  Codex patch succeeded.');

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
