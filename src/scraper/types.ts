/**
 * Represents the result of a web scraping operation
 */
export interface ScrapeResult {
  /**
   * URL that was scraped
   */
  url: string;

  /**
   * Timestamp when the scraping was performed
   */
  timestamp: string;

  /**
   * Data extracted from the page
   */
  data: Record<string, any>;

  /**
   * Optional metadata about the scraping operation
   */
  meta?: {
    /**
     * Duration of the scraping operation in milliseconds
     */
    durationMs?: number;

    /**
     * Any additional information about the scraping process
     */
    [key: string]: any;
  };
}

/**
 * Error that occurred during scraping
 */
export interface ScrapeError {
  url: string;
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
}
