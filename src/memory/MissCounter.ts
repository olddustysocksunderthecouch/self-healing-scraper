import { promises as fs } from 'fs';
import path from 'path';
import { getMemoryManager } from './MemoryManager.js';

interface MissCountRecord {
  scraperId: string;
  consecutiveMisses: number;
  lastUpdated: string;
}

/**
 * Persistent miss counter for tracking consecutive misses across script executions
 */
export class MissCounter {
  private filePath: string;
  private cache: Map<string, number> = new Map();
  private loaded = false;

  constructor() {
    const memoryManager = getMemoryManager();
    this.filePath = path.join(
      path.dirname(memoryManager.getScrapeHistoryPath('dummy')), 
      'miss_counter.json'
    );
  }

  /**
   * Load the miss counter state from disk
   */
  private async load(): Promise<void> {
    if (this.loaded) return;

    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      try {
        const data = await fs.readFile(this.filePath, 'utf8');
        const records = JSON.parse(data) as MissCountRecord[];
        
        // Load into cache
        records.forEach(record => {
          this.cache.set(record.scraperId, record.consecutiveMisses);
        });
      } catch (error) {
        // File probably doesn't exist yet - start with empty cache
        this.cache = new Map();
      }
      
      this.loaded = true;
    } catch (error) {
      console.warn('Failed to load miss counter state:', error);
      // Continue with empty cache in case of error
      this.cache = new Map();
      this.loaded = true;
    }
  }

  /**
   * Save the miss counter state to disk
   */
  private async save(): Promise<void> {
    try {
      const records: MissCountRecord[] = Array.from(this.cache.entries()).map(([scraperId, count]) => ({
        scraperId,
        consecutiveMisses: count,
        lastUpdated: new Date().toISOString()
      }));
      
      await fs.writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to save miss counter state:', error);
    }
  }

  /**
   * Get the current miss count for a scraper
   */
  async get(scraperId: string): Promise<number> {
    await this.load();
    return this.cache.get(scraperId) ?? 0;
  }

  /**
   * Set the miss count for a scraper
   */
  async set(scraperId: string, count: number): Promise<void> {
    await this.load();
    this.cache.set(scraperId, count);
    await this.save();
  }

  /**
   * Reset the miss count for a scraper
   */
  async reset(scraperId: string): Promise<void> {
    await this.set(scraperId, 0);
  }
}

// Singleton
let instance: MissCounter | null = null;

export function getMissCounter(): MissCounter {
  if (!instance) {
    instance = new MissCounter();
  }
  return instance;
}