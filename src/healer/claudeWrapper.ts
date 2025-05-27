import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import fs from 'fs';
import path from 'path';

/**
 * Wrapper around the Claude Code CLI. It spawns a child process and returns
 * the resulting exit code and output. All stdout/stderr data is forwarded to the parent
 * process so developers can observe progress in real-time.
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
    // Load CLAUDE.md if it exists for system instructions
    let systemInstructions = '';
    if (this.claudeMdPath) {
      try {
        systemInstructions = readFileSync(this.claudeMdPath, 'utf-8');
        prompt = `${systemInstructions}\n\n${prompt}`;
      } catch (error) {
        console.warn(`Warning: Could not read ${this.claudeMdPath}. Continuing without system instructions.`);
      }
    }

    // Default flags for autonomous operation
    const defaultFlags = [
      '--dangerously-skip-permissions',
      '--output-format', 'json',
      // Add flags to avoid stdin/raw mode issues
      '--no-interactive',
      '--disable-raw-mode'
    ];

    // Combine default flags with any additional args
    const allArgs = [...defaultFlags, ...args];

    return new Promise(async (resolve) => {
      let output = '';
      
      // Write prompt to a temporary file
      const tmpDir = process.env.TMPDIR || '/tmp';
      const promptFile = path.join(tmpDir, `claude_prompt_${Date.now()}.txt`);
      
      try {
        await fs.promises.writeFile(promptFile, prompt, 'utf-8');
        
        // Add the prompt file to the arguments
        allArgs.push('--prompt-file', promptFile);
        
        const proc = spawn(this.bin, allArgs, {
          stdio: ['ignore', 'pipe', 'inherit'], // Ignore stdin, capture stdout, inherit stderr
          env: { ...process.env },
        });

      // Collect stdout
      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        // Also output to console for visibility
        process.stdout.write(chunk);
      });

      proc.on('close', (code) => {
        // Clean up the temporary file
        fs.promises.unlink(promptFile).catch(() => {
          // Ignore errors during cleanup
        });
        
        resolve({
          exitCode: code ?? 1,
          output
        });
      });

      proc.on('error', (err) => {
        // Binary missing or failed to spawn
        console.error(`Error spawning Claude Code: ${err.message}`);
        
        // Clean up the temporary file
        fs.promises.unlink(promptFile).catch(() => {
          // Ignore errors during cleanup
        });
        
        resolve({
          exitCode: 1,
          output: `Error: ${err.message}`
        });
      });
      } catch (err) {
        console.error(`Error creating prompt file: ${err.message}`);
        resolve({
          exitCode: 1,
          output: `Error: ${err.message}`
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
  parseJsonOutput(output: string): any | null {
    try {
      // Find JSON in the output (sometimes there might be extra output)
      const jsonMatch = output.match(/(\{.*\})/s);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      return null;
    } catch (error) {
      console.error('Failed to parse JSON output from Claude Code');
      return null;
    }
  }
}