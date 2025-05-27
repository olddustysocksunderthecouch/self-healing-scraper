
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';
import { ScraperRegistry } from './ScraperRegistry.js';

/**
 * URL patterns that this scraper can handle
 */
export const urlPatterns = [
  'www.quay1.co.za',
  'www.quay1.co.za/results',
  'www.quay1.co.za/*',
  'www.quay1.co.za/results/*/*/*/*/*/*/*',
  'www.quay1.co.za/results/residential',
  'www.quay1.co.za/results/*',
  'www.quay1.co.za/results/residential/*/*/*/*/*/*',
  'www.quay1.co.za/results/residential/for-sale',
  'www.quay1.co.za/results/residential/*',
  'www.quay1.co.za/results/residential/for-sale/*/*/*/*/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein',
  'www.quay1.co.za/results/residential/for-sale/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/*/*/*/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/*/*/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/house',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/house/*/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/house/6297',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/house/*',
  'www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/house/6297/*'
];

class Quay1ScraperScraper extends BaseScraper<ScrapeResult> {
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

const scraperInstance = new Quay1ScraperScraper();

// Register with pattern-based scraper selection system
ScraperRegistry.getInstance().register('quay1Scraper', {
  scraper: scraperInstance,
  urlPatterns
});

// Export function-style API for backward compatibility
export async function scrape(url = 'https://www.quay1.co.za/results/residential/for-sale/kraaifontein/zoo-park/house/6297/'): Promise<ScrapeResult> {
  return scraperInstance.scrape(url);
}

export type { ScrapeResult };
