/**
 * @jest-environment node
 */

import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

function runCli(args: string[], env: NodeJS.ProcessEnv = {}) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const proc = spawn(
      'node',
      [path.resolve('src/cli/selfheal.ts'), ...args],
      {
        env: {
          ...process.env,
          NODE_OPTIONS: '--loader ts-node/esm',
          CODEX_BIN: 'true', // instant success
          SKIP_GIT_COMMIT: '1',
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

describe('selfheal setup CLI', () => {
  const siteId = 'cliSite';
  const fixtureSrc = path.resolve('tests/fixtures/exampleSite.html');
  const fixtureUrl = `file://${fixtureSrc}`;

  afterAll(() => {
    const p = path.resolve(`tests/fixtures/${siteId}.html`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  it('returns exit code 0 on success', async () => {
    const { code } = await runCli(['setup', siteId, fixtureUrl]);
    expect(code).toBe(0);
  });
});
