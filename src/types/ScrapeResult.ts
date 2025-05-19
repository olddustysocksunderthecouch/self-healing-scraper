/**
 * Common shape returned by every site-specific scraper.
 *
 * Additional optional keys may be present on a per-site basis, but core
 * properties listed here MUST exist so that downstream services (validator,
 * storage, ML models, …) can depend on them.
 */
export interface ScrapeResult {
  /** Human readable title of the product / article */
  title: string;

  /** Price string as displayed on the website, e.g. "$19.99" */
  price: string;

  /** Long form description or summary */
  description: string;

  /** Absolute URL to primary image */
  imageUrl: string;

  /** ISO timestamp (UTC) when the data was captured */
  timestamp: string;

  [key: string]: unknown; // Allow extensions while keeping strong guarantees above
}
