/**
 * @jest-environment node
 */

import fs from 'fs/promises';
import path from 'path';
import { jest } from '@jest/globals';
import { SetupOrchestrator } from '../../src/healer/setupOrchestrator.js';

function createMockCodexWrapper(exitCode = 0) {
  return {
    run: jest.fn().mockResolvedValue(exitCode),
  } as unknown as import('../../src/healer/codexWrapper.js').CodexWrapper;
}

describe('SetupOrchestrator', () => {
  const siteId = 'testsite';
  const fixtureSrc = path.resolve('tests/fixtures/exampleSite.html');
  const fixtureUrl = `file://${fixtureSrc}`;

  afterEach(async () => {
    const target = path.resolve(`tests/fixtures/${siteId}.html`);
    await fs.rm(target, { force: true });
  });

  it('creates snapshot and succeeds when Codex exits with 0', async () => {
    const codex = createMockCodexWrapper(0);
    const orchestrator = new SetupOrchestrator(codex, { commit: false });
    const ok = await orchestrator.setup(siteId, fixtureUrl);

    expect(ok).toBe(true);
    expect(codex.run).toHaveBeenCalledTimes(1);

    const snapshotPath = path.resolve(`tests/fixtures/${siteId}.html`);
    const exists = await fs
      .stat(snapshotPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});
