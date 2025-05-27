/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { HealingOrchestrator } from '../../src/healer/healOrchestrator.js';

// Helper that always fails N-1 times and succeeds on last attempt
function createMockClaudeWrapper(failuresBeforeSuccess: number) {
  return {
    run: jest.fn().mockImplementation(() => {
      if (failuresBeforeSuccess > 0) {
        failuresBeforeSuccess -= 1;
        return Promise.resolve({ 
          exitCode: 1, 
          output: 'Error occurred during healing process'
        }); // failure
      }
      return Promise.resolve({ 
        exitCode: 0, 
        output: JSON.stringify({ 
          result: 'success', 
          changes: [{ file: 'src/scraper/exampleSite.ts', oldSelector: '.old', newSelector: '.new' }] 
        })
      }); // success
    }),
  } as unknown as import('../../src/healer/claudeWrapper.js').ClaudeWrapper;
}

describe('HealingOrchestrator', () => {
  it('succeeds when Claude succeeds within retry limit', async () => {
    const mock = createMockClaudeWrapper(1); // fail first attempt, succeed second
    const orchestrator = new HealingOrchestrator(mock, { maxAttempts: 3, initialDelayMs: 0 });
    const result = await orchestrator.heal();

    expect(result).toBe(true);
    expect(mock.run).toHaveBeenCalledTimes(2);
  });

  it('fails when all attempts are exhausted', async () => {
    const mock = createMockClaudeWrapper(5); // will never succeed within 3 attempts
    const orchestrator = new HealingOrchestrator(mock, { maxAttempts: 3, initialDelayMs: 0 });
    const result = await orchestrator.heal();

    expect(result).toBe(false);
    expect(mock.run).toHaveBeenCalledTimes(3);
  });

  it('calls postSuccess callback on successful healing', async () => {
    const mock = createMockClaudeWrapper(0); // succeed on first try
    const postSuccess = jest.fn().mockResolvedValue(undefined);
    const orchestrator = new HealingOrchestrator(mock, { 
      maxAttempts: 1, 
      initialDelayMs: 0,
      postSuccess 
    });
    
    await orchestrator.heal();
    
    expect(postSuccess).toHaveBeenCalledTimes(1);
  });

  it('handles postSuccess callback errors gracefully', async () => {
    const mock = createMockClaudeWrapper(0); // succeed on first try
    const postSuccess = jest.fn().mockRejectedValue(new Error('Callback error'));
    const orchestrator = new HealingOrchestrator(mock, { 
      maxAttempts: 1, 
      initialDelayMs: 0,
      postSuccess 
    });
    
    // Should still return true even though callback failed
    const result = await orchestrator.heal();
    
    expect(result).toBe(true);
    expect(postSuccess).toHaveBeenCalledTimes(1);
  });
});