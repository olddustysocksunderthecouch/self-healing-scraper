/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { HealingOrchestrator } from '../../src/healer/healOrchestrator.js';

// Helper that always fails N-1 times and succeeds on last attempt
function createMockCodexWrapper(failuresBeforeSuccess: number) {
  return {
    run: jest.fn().mockImplementation(() => {
      if (failuresBeforeSuccess > 0) {
        failuresBeforeSuccess -= 1;
        return Promise.resolve(1); // failure
      }
      return Promise.resolve(0); // success
    }),
  } as unknown as import('../../src/healer/codexWrapper.js').CodexWrapper;
}

describe('HealingOrchestrator', () => {
  it('succeeds when Codex succeeds within retry limit', async () => {
    const mock = createMockCodexWrapper(1); // fail first attempt, succeed second
    const orchestrator = new HealingOrchestrator(mock, { maxAttempts: 3, initialDelayMs: 0 });
    const result = await orchestrator.heal();

    expect(result).toBe(true);
    expect(mock.run).toHaveBeenCalledTimes(2);
  });

  it('fails when all attempts are exhausted', async () => {
    const mock = createMockCodexWrapper(5); // will never succeed within 3 attempts
    const orchestrator = new HealingOrchestrator(mock, { maxAttempts: 3, initialDelayMs: 0 });
    const result = await orchestrator.heal();

    expect(result).toBe(false);
    expect(mock.run).toHaveBeenCalledTimes(3);
  });
});
