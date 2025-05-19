import { spawn } from 'child_process';

/**
 * Thin wrapper around the Codex CLI. It spawns a child process and returns
 * the resulting exit code. All stdout/stderr data is forwarded to the parent
 * process so developers can observe progress in real-time.
 *
 * The executable can be overridden via the `CODEX_BIN` environment variable
 * which greatly simplifies Jest testing (we simply point it to `echo`).
 */
export class CodexWrapper {
  private readonly bin: string;

  constructor(bin = process.env.CODEX_BIN ?? 'codex') {
    this.bin = bin;
  }

  /**
   * Invoke Codex in *full-auto* mode.
   *
   * @param args Additional CLI flags forwarded to the underlying binary.
   * @returns Numeric exit code (0 → success).
   */
  run(args: string[] = ['-a', 'full-auto']): Promise<number> {
    return new Promise((resolve) => {
      const proc = spawn(this.bin, args, {
        stdio: ['ignore', 'inherit', 'inherit'], // pipe through
        env: { ...process.env },
      });

      proc.on('close', (code) => {
        resolve(code ?? 1);
      });

      proc.on('error', () => {
        // Binary missing or failed to spawn
        resolve(1);
      });
    });
  }
}
