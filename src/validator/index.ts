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
   * Update internal counters and return `true` if selector drift is deemed
   * to have occurred for the given site.
   *
   * @param siteId Stable identifier (e.g. `exampleSite`).
   * @param result Result object to evaluate.
   * @param watchedKeys Which keys to treat as mandatory. Empty array → all
   *   top-level keys of ScrapeResult are considered.
   */
  update(
    siteId: string,
    result: ScrapeResult,
    watchedKeys: (keyof ScrapeResult)[] = [],
  ): boolean {
    const keys = watchedKeys.length ? watchedKeys : (Object.keys(result) as (keyof ScrapeResult)[]);

    const hasMissing = keys.some((k) => {
      const val = result[k];
      return val === '' || val === null || val === undefined;
    });

    const prev = this.misses.get(siteId) ?? 0;
    const next = hasMissing ? prev + 1 : 0;
    this.misses.set(siteId, next);

    return next >= this.threshold;
  }

  reset(siteId: string): void {
    this.misses.delete(siteId);
  }
}
