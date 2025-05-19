import type { ScrapeResult as ExampleScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';

/**
 * Example implementation for a generic e-commerce product page.
 *
 * The selectors map to classes present in the fixture HTML residing under
 * `tests/fixtures/exampleSite.html`.
 */
import { Page } from 'puppeteer';

class ExampleSiteScraper extends BaseScraper<ExampleScrapeResult> {
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async extractData(
    page: Page,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _url: string,
  ): Promise<Partial<ExampleScrapeResult>> {
    const [title, price, description, imageUrl] = await Promise.all([
      this.extractText(page, '.product-title'),
      this.extractText(page, '.product-price'),
      this.extractText(page, '.product-description'),
      this.extractAttribute(page, '.product-image', 'src'),
    ]);

    return {
      title,
      price,
      description,
      imageUrl,
    };
  }
}

/* ------------------------------------------------------------------------- */
/* Public API                                                                */
/* ------------------------------------------------------------------------- */

const scraper = new ExampleSiteScraper();

// Keep the original function-style API so existing imports in tests & CLI do
// not break. This thin wrapper just forwards to the new class.
export async function scrape(url = 'https://example.com/product'): Promise<ExampleScrapeResult> {
  return scraper.scrape(url);
}

export type { ExampleScrapeResult as ScrapeResult };
