/**
 * @jest-environment node
 */

import path from 'path';
import { spawn } from 'child_process';

// Reuse helper similar to selfheal.test.ts but allow env var overrides
function runCli(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const proc = spawn(
      'node',
      [path.resolve('src/cli/selfheal.ts'), ...args],
      {
        env: {
          ...process.env,
          NODE_OPTIONS: '--loader ts-node/esm',
          CODEX_BIN: 'true', // make Codex wrapper exit with 0 instantly
          ...env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (c) => {
      stdout += c.toString();
    });

    proc.stderr.on('data', (c) => {
      stderr += c.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

describe('selfheal CLI --heal', () => {
  it('runs orchestrator when drift detected and returns success exit code', async () => {
    const filePath = path.resolve('tests/fixtures/exampleSite_missing_price.html');

    // We'll create a simple HTML file with missing price so drift triggers.
    // For now, reuse existing fixture but intentionally use a bad selector
    // Not required – orchestrator will run regardless because Validator detects missing fields.

    const url = `file://${filePath}`;

    const { code } = await runCli(['scrape', url, '--heal']);

    expect(code).toBe(0); // healing succeeded (Codex stub returns 0)
  });
});
