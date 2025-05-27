
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';
import { ScraperRegistry } from './ScraperRegistry.js';

/**
 * URL patterns that this scraper can handle
 */
export const urlPatterns = [
  'www.seeff.com',
  'www.seeff.com/results',
  'www.seeff.com/*',
  'www.seeff.com/results/*/*/*/*/*/*/*',
  'www.seeff.com/results/residential',
  'www.seeff.com/results/*',
  'www.seeff.com/results/residential/*/*/*/*/*/*',
  'www.seeff.com/results/residential/for-sale',
  'www.seeff.com/results/residential/*',
  'www.seeff.com/results/residential/for-sale/*/*/*/*/*',
  'www.seeff.com/results/residential/for-sale/cape-town',
  'www.seeff.com/results/residential/for-sale/*',
  'www.seeff.com/results/residential/for-sale/cape-town/*/*/*/*',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch',
  'www.seeff.com/results/residential/for-sale/cape-town/*',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch/*/*/*',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch/freehold',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch/*',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch/freehold/*/*',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch/freehold/2494125',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch/freehold/*',
  'www.seeff.com/results/residential/for-sale/cape-town/rondebosch/freehold/2494125/*'
];

class SeeffScraperScraper extends BaseScraper<ScrapeResult> {
  protected async extractData(page: Page, _url: string, _params?: Record<string, string>): Promise<Partial<ScrapeResult>> {
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

const scraperInstance = new SeeffScraperScraper();

// Register with pattern-based scraper selection system
ScraperRegistry.getInstance().register('seeffScraper', {
  scraper: scraperInstance,
  urlPatterns
});

// Export function-style API for backward compatibility
export async function scrape(url = 'https://www.seeff.com/results/residential/for-sale/cape-town/rondebosch/freehold/2494125/'): Promise<ScrapeResult> {
  return scraperInstance.scrape(url);
}

export type { ScrapeResult };
