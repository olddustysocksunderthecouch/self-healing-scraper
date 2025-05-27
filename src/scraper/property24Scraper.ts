
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';
import { ScraperRegistry } from './ScraperRegistry.js';

/**
 * URL patterns that this scraper can handle
 */
export const urlPatterns = [
  'www.property24.com',
  'www.property24.com/to-rent',
  'www.property24.com/*',
  'www.property24.com/to-rent/*/*/*/*/*',
  'www.property24.com/to-rent/walmer-estate',
  'www.property24.com/to-rent/*',
  'www.property24.com/to-rent/walmer-estate/*/*/*/*',
  'www.property24.com/to-rent/walmer-estate/cape-town',
  'www.property24.com/to-rent/walmer-estate/*',
  'www.property24.com/to-rent/walmer-estate/cape-town/*/*/*',
  'www.property24.com/to-rent/walmer-estate/cape-town/western-cape',
  'www.property24.com/to-rent/walmer-estate/cape-town/*',
  'www.property24.com/to-rent/walmer-estate/cape-town/western-cape/*/*',
  'www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163',
  'www.property24.com/to-rent/walmer-estate/cape-town/western-cape/*',
  'www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163/*',
  'www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163/116020259'
];

class Property24ScraperScraper extends BaseScraper<ScrapeResult> {
  protected async extractData(page: Page, url: string, params?: Record<string, string>): Promise<Partial<ScrapeResult>> {
    // Primary selectors with fallbacks for resilience
    const selectors = {
      title: '.product-title, h1, .title, [class*="title"]',
      price: '.product-price, .price, [class*="price"]',
      description: '.product-description, .description, [class*="description"], p',
      imageUrl: '.product-image img, img[class*="product"], img[class*="main"], img'
    };
    
    const [title, price, description, imageUrl] = await Promise.all([
      this.extractText(page, selectors.title),
      this.extractText(page, selectors.price),
      this.extractText(page, selectors.description),
      this.extractAttribute(page, selectors.imageUrl, 'src'),
    ]);

    return {
      title,
      price,
      description,
      imageUrl,
    };
  }
}

const scraperInstance = new Property24ScraperScraper();

// Register with pattern-based scraper selection system
ScraperRegistry.getInstance().register('property24Scraper', {
  scraper: scraperInstance,
  urlPatterns
});

// Export function-style API for backward compatibility
export async function scrape(url = 'https://www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163/116020259'): Promise<ScrapeResult> {
  return scraperInstance.scrape(url);
}

export type { ScrapeResult };
