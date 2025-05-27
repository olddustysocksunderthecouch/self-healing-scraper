
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';
import { ScraperRegistry } from './ScraperRegistry.js';

/**
 * URL patterns that this scraper can handle
 */
export const urlPatterns = [
  'www.privateproperty.co.za',
  'www.privateproperty.co.za/to-rent',
  'www.privateproperty.co.za/*',
  'www.privateproperty.co.za/to-rent/*/*/*/*/*',
  'www.privateproperty.co.za/to-rent/western-cape',
  'www.privateproperty.co.za/to-rent/*',
  'www.privateproperty.co.za/to-rent/western-cape/*/*/*/*',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town',
  'www.privateproperty.co.za/to-rent/western-cape/*',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/*/*/*',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/cape-town-city-bowl',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/*',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/cape-town-city-bowl/*/*',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/cape-town-city-bowl/oranjezicht',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/cape-town-city-bowl/*',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/cape-town-city-bowl/oranjezicht/*',
  'www.privateproperty.co.za/to-rent/western-cape/cape-town/cape-town-city-bowl/oranjezicht/RR4126819'
];

class PrivatepropertyScraperScraper extends BaseScraper<ScrapeResult> {
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

const scraperInstance = new PrivatepropertyScraperScraper();

// Register with pattern-based scraper selection system
ScraperRegistry.getInstance().register('privatepropertyScraper', {
  scraper: scraperInstance,
  urlPatterns
});

// Export function-style API for backward compatibility
export async function scrape(url = 'https://www.privateproperty.co.za/to-rent/western-cape/cape-town/cape-town-city-bowl/oranjezicht/RR4126819'): Promise<ScrapeResult> {
  return scraperInstance.scrape(url);
}

export type { ScrapeResult };
