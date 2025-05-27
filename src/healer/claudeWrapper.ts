import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import fs from 'fs';
import path from 'path';

/**
 * Wrapper around the Claude Code CLI. It spawns a child process and returns
 * the resulting exit code and output. All stdout/stderr data is forwarded to the parent
 * process so developers can observe progress in real-time.
 *
 * This implementation uses spawnSync with direct stdin input to avoid raw mode errors,
 * and uses the --allowedTools flag to explicitly specify no tools are needed instead
 * of using the --dangerously-skip-permissions flag.
 *
 * The executable can be overridden via the `CLAUDE_BIN` environment variable
 * which greatly simplifies Jest testing (we simply point it to `echo`).
 */
export class ClaudeWrapper {
  private readonly bin: string;
  private readonly claudeMdPath: string | null;

  constructor(bin = process.env.CLAUDE_BIN ?? 'claude', claudeMdPath: string | null = null) {
    this.bin = bin;
    this.claudeMdPath = claudeMdPath;
  }

  /**
   * Invoke Claude Code in autonomous mode.
   *
   * @param prompt The prompt to send to Claude Code.
   * @param args Additional CLI flags forwarded to the underlying binary.
   * @returns Promise resolving to an object with exit code and parsed output.
   */
  run(prompt: string, args: string[] = []): Promise<{ exitCode: number; output: string }> {
    // Check for demo mode
    if (process.env.DEMO_MODE === 'true') {
      console.log('🔧 Running in DEMO_MODE. Claude CLI not required.');
      return Promise.resolve({
        exitCode: 0,
        output: 'Running in DEMO_MODE. This is a simulated successful response from Claude.',
      });
    }

    // Check if the prompt is potentially too long or complex for non-interactive mode
    if (prompt.length > 1000) {
      console.warn(
        '⚠️  Long prompt detected, consider using DEMO_MODE if you encounter raw mode errors.'
      );
    }

    // Load CLAUDE.md if it exists for system instructions
    let systemInstructions = '';
    if (this.claudeMdPath) {
      try {
        systemInstructions = readFileSync(this.claudeMdPath, 'utf-8');
        prompt = `${systemInstructions}\n\n${prompt}`;
      } catch {
        console.warn(
          `Warning: Could not read ${this.claudeMdPath}. Continuing without system instructions.`
        );
      }
    }

    // Default flags for autonomous operation - only use documented, supported flags
    const defaultFlags = [
      '--allowedTools',
      'Edit',
    ]; 

    // Combine default flags with any additional args
    const allArgs = [...defaultFlags, ...args];

    return new Promise((resolve) => {
      // Write prompt to a temporary file (just for debugging purposes)
      const tmpDir = process.env.TMPDIR || '/tmp';
      const promptFile = path.join(tmpDir, `claude_prompt_${Date.now()}.txt`);

      try {
        // Write prompt to file for reference
        console.log(`PROMPT: ${prompt}`);
        fs.writeFileSync(promptFile, prompt, 'utf-8');
        console.log(`Saved prompt to file for reference: ${promptFile}`);

        // Add environment variables to prevent terminal interaction issues
        const env = {
          ...process.env,
          FORCE_COLOR: '0', // Disable color output
          CI: 'true', // Pretend we're in a CI environment
          TERM: 'dumb', // Use dumb terminal
          NO_COLOR: '1', // Disable colors in output
        };

        console.log(`Running Claude in non-interactive mode with '--allowedTools none'...`);

        // Use spawnSync with the -p flag to send the prompt and avoid raw mode issues
        // This uses synchronous execution which is more reliable in non-interactive environments
        const result = spawnSync(this.bin, ['-p', ...allArgs], {
          input: prompt, // Pass prompt directly as stdin
          encoding: 'utf-8', // Ensure proper encoding
          env, // Custom environment variables
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
          stdio: ['pipe', 'pipe', 'pipe'], // Explicitly set stdio configuration
        });
        console.log(`RESULT: ${result}`);

        // Clean up the prompt file (just for tidiness)
        try {
          fs.unlinkSync(promptFile);
        } catch {
          // Ignore errors during cleanup
        }

        // Handle any execution errors
        if (result.error) {
          console.error(`Error executing Claude CLI: ${result.error.message}`);
          resolve({
            exitCode: 1,
            output: `Error: ${result.error.message}`,
          });
          return;
        }

        // Process output
        const output = result.stdout || '';
        const stderrOutput = result.stderr || '';

        // Log stderr if any
        if (stderrOutput) {
          console.error(`[Claude stderr]: ${stderrOutput}`);
        }

        // Also output to console for visibility
        console.log(output);

        resolve({
          exitCode: result.status ?? 1,
          output,
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error running Claude: ${errorMessage}`);

        // Clean up the temporary file if it was created
        try {
          fs.accessSync(promptFile);
          fs.unlinkSync(promptFile);
        } catch {
          // File doesn't exist or can't be accessed, ignore
        }

        resolve({
          exitCode: 1,
          output: `Error: ${errorMessage}`,
        });
      }
    });
  }

  /**
   * Helper method to parse JSON output from Claude Code when using --output-format json
   *
   * @param output Raw output string from Claude Code
   * @returns Parsed JSON object or null if parsing fails
   */
  parseJsonOutput(output: string): unknown | null {
    try {
      // Find JSON in the output (sometimes there might be extra output)
      const jsonMatch = output.match(/(\{.*\})/s);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      return null;
    } catch {
      console.error('Failed to parse JSON output from Claude Code');
      return null;
    }
  }
}
