import type { ScrapeResult } from '../types/ScrapeResult.js';
import { getMissCounter } from '../memory/MissCounter.js';

const DEFAULT_THRESHOLD = Number.parseInt(process.env.MISS_THRESHOLD ?? '3', 10);

/**
 * Drift validator that tracks consecutive occurrences of missing fields.
 * Uses a persistent miss counter to maintain state across process executions.
 * Once a site crosses the configured threshold, `isDrift` returns `true`
 * so the caller may trigger the healing pipeline.
 */
export class DriftValidator {
  private readonly threshold: number;
  private readonly missCounter = getMissCounter();

  constructor(threshold: number = DEFAULT_THRESHOLD) {
    this.threshold = threshold;
  }

  /**
   * Update internal counters and return drift information
   *
   * @param siteId Stable identifier (e.g. `exampleSite`).
   * @param result Result object to evaluate.
   * @param watchedKeys Which keys to treat as mandatory. Empty array → all
   *   top-level keys of ScrapeResult are considered.
   * @returns An object with drift status and missing fields information
   */
  async update(
    siteId: string,
    result: ScrapeResult,
    watchedKeys: (keyof ScrapeResult)[] = [],
  ): Promise<{ 
    isDrift: boolean;
    missingFields: string[];
    missingCount: number;
    consecutiveMisses: number;
    threshold: number;
  }> {
    const keys = watchedKeys.length ? watchedKeys : (Object.keys(result) as (keyof ScrapeResult)[]);

    // Collect all missing fields
    const missingFields: string[] = keys.filter((k) => {
      const val = result[k];
      // Consider empty strings, null, and undefined as missing fields
      // Also treat non-string values that are "falsy" as missing (except for numbers like 0)
      return val === '' || val === null || val === undefined || 
             (typeof val === 'string' && val.trim() === '');
    }).map(k => String(k)); // Convert keyof ScrapeResult to string
    
    const hasMissing = missingFields.length > 0;

    // Get previous miss count from persistent storage
    const prev = await this.missCounter.get(siteId);
    const next = hasMissing ? prev + 1 : 0;
    
    // Update persistent miss counter
    await this.missCounter.set(siteId, next);
    
    // Log details for debugging
    if (hasMissing) {
      const details = missingFields.map(field => {
        const value = result[field as keyof ScrapeResult];
        let valueStr = value === '' ? '""' : String(value);
        if (valueStr.length > 50) {
          valueStr = valueStr.substring(0, 47) + '...';
        }
        return `${field}: ${valueStr}`;
      }).join(', ');
      
      console.log(`Drift detected for ${siteId} (consecutive: ${next}/${this.threshold})`);
      console.log(`Problem fields: ${details}`);
    } else {
      // If no missing fields, log a message and reset counter
      console.log(`✅ All fields present for ${siteId}, resetting miss counter`);
    }
    
    // Determine if drift threshold is exceeded
    const isDrift = next >= this.threshold;

    return {
      isDrift,
      missingFields,
      missingCount: missingFields.length,
      consecutiveMisses: next,
      threshold: this.threshold
    };
  }

  async reset(siteId: string): Promise<void> {
    await this.missCounter.reset(siteId);
  }
}
