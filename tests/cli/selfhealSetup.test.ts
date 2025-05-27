/**
 * @jest-environment node
 */

import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

function runCli(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const proc = spawn(
      'node',
      [path.resolve('src/cli/selfheal.ts'), ...args],
      {
        env: {
          ...process.env,
          NODE_OPTIONS: '--loader ts-node/esm',
          CLAUDE_BIN: 'echo', // Mock Claude with echo command that will return success
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

  // Clean up before and after tests
  beforeAll(() => {
    // Make sure to clean up any existing files from previous test runs
    const htmlPath = path.resolve(`tests/fixtures/${siteId}.html`);
    const scraperPath = path.resolve(`src/scraper/${siteId}.ts`);
    const testPath = path.resolve(`tests/${siteId}.test.ts`);
    
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(scraperPath)) fs.unlinkSync(scraperPath);
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
    
    // Copy the example fixture to the expected location
    fs.copyFileSync(fixtureSrc, htmlPath);
  });
  
  afterAll(() => {
    // Clean up files created during the test
    const htmlPath = path.resolve(`tests/fixtures/${siteId}.html`);
    const scraperPath = path.resolve(`src/scraper/${siteId}.ts`);
    const testPath = path.resolve(`tests/${siteId}.test.ts`);
    
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(scraperPath)) fs.unlinkSync(scraperPath);
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });

  it('returns exit code 0 on success', async () => {
    const { code } = await runCli(['setup', siteId, fixtureUrl]);
    expect(code).toBe(0);
  });
});
