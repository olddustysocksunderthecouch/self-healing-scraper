import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { ScrapeResult } from '../types/ScrapeResult.js';
import type { StorageAdapter } from './StorageAdapter.js';

/**
 * Minimal JSON-on-disk storage adapter. Every site gets its own file that
 * contains an array of `ScrapeResult` objects in reverse chronological order
 * (most recent entry first). This enables extremely fast `last(n)` queries
 * without having to read / sort potentially large datasets.
 */
export class FileStore implements StorageAdapter {
  private readonly baseDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'data')) {
    this.baseDir = baseDir;
  }

  private filePath(siteId: string): string {
    return path.join(this.baseDir, `${siteId}.json`);
  }

  async save(ts: Date, data: ScrapeResult): Promise<void> {
    const siteId = this.resolveSiteId();
    const file = this.filePath(siteId);

    await fs.mkdir(this.baseDir, { recursive: true });

    let existing: ScrapeResult[] = [];
    try {
      const raw = await fs.readFile(file, 'utf8');
      existing = JSON.parse(raw) as ScrapeResult[];
    } catch {
      /* file probably does not exist yet → start with empty array */
    }

    const next = [{ ...data, timestamp: ts.toISOString() }, ...existing];
    await fs.writeFile(file, JSON.stringify(next, null, 2), 'utf8');
  }

  async last(n: number): Promise<ScrapeResult[]> {
    if (n <= 0) return [];

    // The API consumer must indicate which site they are interested in by
    // setting `SCRAPE_SITE_ID` environment variable. This keeps the adapter
    // intentionally dumb – it only deals with a single logical stream at a
    // time.
    const siteId = process.env.SCRAPE_SITE_ID ?? 'default';
    const file = this.filePath(siteId);

    try {
      const raw = await fs.readFile(file, 'utf8');
      const arr = JSON.parse(raw) as ScrapeResult[];
      return arr.slice(0, n);
    } catch {
      return [];
    }
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  private resolveSiteId(): string {
    // Prefer explicit environment variable, otherwise fall back to hardcoded
    // "default" identifier so reads & writes remain symmetrical.
    if (process.env.SCRAPE_SITE_ID) return process.env.SCRAPE_SITE_ID;

    return 'default';
  }
}

/* ------------------------------------------------------------------------- */
/* Convenience factory                                                       */
/* ------------------------------------------------------------------------- */

let singleton: FileStore | null = null;

export function getFileStore(): FileStore {
  if (!singleton) {
    const dir = process.env.STORAGE_DIR ?? path.join(os.homedir(), '.selfheal', 'data');
    singleton = new FileStore(dir);
  }
  return singleton;
}
