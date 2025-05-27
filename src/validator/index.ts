import type { ScrapeResult } from '../types/ScrapeResult.js';

const DEFAULT_THRESHOLD = Number.parseInt(process.env.MISS_THRESHOLD ?? '3', 10);

/**
 * In-memory drift validator that tracks consecutive occurrences of missing
 * fields. Once a site crosses the configured threshold, `isDriftExceeded`
 * returns `true` so the caller may trigger the healing pipeline.
 */
export class DriftValidator {
  private readonly threshold: number;

  /** Map<siteId, consecutiveMissingCount> */
  private readonly misses = new Map<string, number>();

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
  update(
    siteId: string,
    result: ScrapeResult,
    watchedKeys: (keyof ScrapeResult)[] = [],
  ): { 
    isDrift: boolean;
    missingFields: string[];
    missingCount: number;
    consecutiveMisses: number;
    threshold: number;
  } {
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

    // Update consecutive misses counter
    const prev = this.misses.get(siteId) ?? 0;
    const next = hasMissing ? prev + 1 : 0;
    this.misses.set(siteId, next);
    
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

  reset(siteId: string): void {
    this.misses.delete(siteId);
  }
}
