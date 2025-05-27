/**
 * @jest-environment node
 */

import fs from 'fs/promises';
import path from 'path';
// jest import removed - not needed for this test
import { SetupOrchestrator } from '../../src/healer/setupOrchestrator.js';

describe('SetupOrchestrator', () => {
  const siteId = 'testsite';
  const fixtureSrc = path.resolve('tests/fixtures/exampleSite.html');
  const fixtureUrl = `file://${fixtureSrc}`;

  afterEach(async () => {
    const target = path.resolve(`tests/fixtures/${siteId}.html`);
    await fs.rm(target, { force: true });
    
    // Also clean up generated files if they exist
    try {
      await fs.rm(path.resolve(`src/scraper/${siteId}.ts`), { force: true });
      await fs.rm(path.resolve(`tests/${siteId}.test.ts`), { force: true });
    } catch {
      // Ignore errors if files don't exist
    }
  });

  it('creates snapshot and succeeds when Claude Code exits with 0', async () => {
    // Use the current environment setting to bypass the actual Claude call
    const orchestrator = new SetupOrchestrator(undefined, { commit: false });
    const ok = await orchestrator.setup(siteId, fixtureUrl);

    expect(ok).toBe(true);

    const snapshotPath = path.resolve(`tests/fixtures/${siteId}.html`);
    const exists = await fs
      .stat(snapshotPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});