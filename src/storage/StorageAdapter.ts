import type { ScrapeResult } from '../types/ScrapeResult.js';

export interface StorageAdapter {
  /**
   * Persist the given JSON serialisable record at the provided timestamp.
   * The timestamp is primarily passed so adapters can use it as primary key
   * in SQL stores without having to rely on the object contents.
   */
  save(ts: Date, data: ScrapeResult): Promise<void>;

  /**
   * Retrieve the N most recent items. Ordering MUST be descending (newest
   * first) so callers can rely on `result[0]` being the latest scrape.
   */
  last(n: number): Promise<ScrapeResult[]>;
}
