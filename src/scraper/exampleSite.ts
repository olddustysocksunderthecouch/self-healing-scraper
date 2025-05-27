import type { ScrapeResult as ExampleScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';
import { ScraperRegistry } from './ScraperRegistry.js';

/**
 * Example implementation for a generic e-commerce product page.
 *
 * The selectors map to classes present in the fixture HTML residing under
 * `tests/fixtures/exampleSite.html`.
 */

/**
 * URL patterns that this scraper can handle
 */
export const urlPatterns = [
  'example.com/product',
  'example.com/product/*',
  'example.com/products/*',
  'www.example.com/product',
  'www.example.com/product/*',
  'www.example.com/products/*'
];

class ExampleSiteScraper extends BaseScraper<ExampleScrapeResult> {
  protected async extractData(
    page: Page,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _url: string,
    params?: Record<string, string>
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

const scraperInstance = new ExampleSiteScraper();

// Register this scraper with the registry
ScraperRegistry.getInstance().register('exampleSite', {
  scraper: scraperInstance,
  urlPatterns
});

// Keep the original function-style API so existing imports in tests & CLI do
// not break. This thin wrapper just forwards to the new class.
export async function scrape(url = 'https://example.com/product'): Promise<ExampleScrapeResult> {
  return scraperInstance.scrape(url);
}

export type { ExampleScrapeResult as ScrapeResult };
