/**
 * @jest-environment node
 */
import { DriftValidator } from '../../src/validator/index.js';
import type { ScrapeResult } from '../../src/types/ScrapeResult.js';

const resultOk: ScrapeResult = {
  title: 'A',
  price: '$1',
  description: 'good',
  imageUrl: 'https://x',
  timestamp: new Date().toISOString(),
};

const resultMissing: ScrapeResult = {
  ...resultOk,
  price: '', // Missing mandatory field
};


describe('DriftValidator', () => {
  it('does not flag drift when all fields present', () => {
    const v = new DriftValidator(2);
    const drift = v.update('test', resultOk, ['price']);
    expect(drift).toBe(false);
  });

  it('flags drift after threshold consecutive misses', () => {
    const v = new DriftValidator(2);
    v.update('test', resultMissing, ['price']);
    const drift = v.update('test', resultMissing, ['price']);
    expect(drift).toBe(true);
  });

  it('resets counter when a good result arrives', () => {
    const v = new DriftValidator(2);
    v.update('test', resultMissing, ['price']);
    v.update('test', resultOk, ['price']);
    const drift = v.update('test', resultMissing, ['price']);
    expect(drift).toBe(false); // only 1 consecutive miss after reset
  });
});
