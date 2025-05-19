/**
 * @jest-environment node
 */
import os from 'os';
import path from 'path';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';

import { FileStore } from '../../src/storage/fileStore.js';
import type { ScrapeResult } from '../../src/types/ScrapeResult.js';

describe('FileStore adapter', () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'selfheal-test-'));
  const store = new FileStore(tmpDir);

  afterAll(() => {
    // Clean up temporary directory
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const sample: ScrapeResult = {
    title: 'Foo',
    price: '$1',
    description: 'bar',
    imageUrl: 'https://example.com/x.jpg',
    timestamp: new Date().toISOString(),
  };

  it('persists and retrieves scrape results', async () => {
    await store.save(new Date(sample.timestamp), sample);
    const latest = await store.last(1);
    expect(latest[0].title).toBe('Foo');
  });

  it('handles requests for more items than available gracefully', async () => {
    const all = await store.last(10);
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('creates data file on first save if missing', async () => {
    const customStoreDir = path.join(tmpDir, 'nested');
    const customStore = new FileStore(customStoreDir);

    await customStore.save(new Date(), sample);

    const filePath = path.join(customStoreDir, 'default.json');
    expect(existsSync(filePath)).toBe(true);
    expect(() => JSON.parse(readFileSync(filePath, 'utf8'))).not.toThrow();
  });
});
