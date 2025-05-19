/**
 * @jest-environment node
 */

import { CodexWrapper } from '../../src/healer/codexWrapper.js';

describe('CodexWrapper', () => {
  it('resolves with exit code of spawned process', async () => {
    // Point wrapper to `true` binary which exits with 0.
    const wrapper = new CodexWrapper('true');
    const code = await wrapper.run([]);
    expect(code).toBe(0);

    // Point wrapper to `false` binary which exits with 1.
    const badWrapper = new CodexWrapper('false');
    const badCode = await badWrapper.run([]);
    expect(badCode).toBe(1);
  });
});
