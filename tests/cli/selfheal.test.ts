/**
 * @jest-environment node
 */

import path from 'path';
import { spawn } from 'child_process';

// The CLI is authored in TypeScript, so we leverage ts-node/register via Jest
// transform. We spawn a new Node process pointing to the compiled source file.

function runCli(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('node', [
      path.resolve('src/cli/selfheal.ts'),
      ...args,
    ], {
      env: { ...process.env, NODE_OPTIONS: '--loader ts-node/esm' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

describe('selfheal CLI', () => {
  it('runs scrape command and outputs JSON', async () => {
    const filePath = path.resolve('tests/fixtures/exampleSite.html');
    const url = `file://${filePath}`;

    const { code, stdout } = await runCli(['scrape', url]);

    expect(code === 0 || code === 2).toBe(true); // Accept drift exit code 2 as well

    // stdout should contain JSON object with title property
    const lines = stdout.split('\n');
    const startIdx = lines.findIndex((l) => l.trim().startsWith('{'));
    const endIdx = lines.findIndex((l, idx) => idx >= startIdx && l.trim().startsWith('}'));

    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(endIdx).toBeGreaterThanOrEqual(startIdx);

    const jsonStr = lines.slice(startIdx, endIdx + 1).join('\n');
    const payload = JSON.parse(jsonStr);
    expect(payload.title).toBe('Premium Wireless Headphones');
  });
});
