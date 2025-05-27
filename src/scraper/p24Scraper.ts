import type { ScrapeResult as P24ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';
import { ScraperRegistry } from './ScraperRegistry.js';

/**
 * Property24 scraper implementation for rental listings.
 * 
 * This scraper extracts data from property24.com rental listing pages.
 * It has primary and fallback selectors for most fields to improve resilience
 * against HTML structure changes.
 */
interface Property24Data extends P24ScrapeResult {
  bedrooms?: string;
  bathrooms?: string;
  propertyType?: string;
  location?: string;
  agent?: string;
}

/**
 * URL patterns that this scraper can handle
 */
export const urlPatterns = [
  'property24.com/to-rent/*',
  'property24.com/for-sale/*',
  'property24.com/*/to-rent/*',
  'property24.com/*/for-sale/*',
  'www.property24.com/to-rent/*',
  'www.property24.com/for-sale/*',
  'www.property24.com/*/to-rent/*',
  'www.property24.com/*/for-sale/*',
  'property24.com/*/*/*/*',
  'www.property24.com/*/*/*/*'
];

class Property24Scraper extends BaseScraper<Property24Data> {
  protected async extractData(
    page: Page,
    _url: string,
    params?: Record<string, string>
  ): Promise<Partial<Property24Data>> {
    // Primary selectors for main listing page
    const primarySelectors = {
      title: '.listing-title, h1.p24_title, .p24_propertyTitle, .product-title, h1',
      price: '.p24_price, .listing-price, .propertyPrice, .product-price, [class*="price"]',
      description: '.p24_description, .listing-description, .propertyDescription, .product-description, .description',
      imageUrl: '.p24_mainImage img, .listing-image img, .propertyImage img, .product-image, [class*="image"] img',
      bedrooms: '.p24_features [data-testid="property-features-bedrooms"], .p24_bedrooms, [class*="bedroom"], .property-feature:contains("Bedroom")',
      bathrooms: '.p24_features [data-testid="property-features-bathrooms"], .p24_bathrooms, [class*="bathroom"], .property-feature:contains("Bathroom")',
      propertyType: '.p24_propertyType, .propertyType, [class*="property-type"]',
      location: '.p24_location, .propertyLocation, .property-address, [class*="location"]',
      agent: '.p24_estateAgent, .listing-agent, [class*="agent"]'
    };

    // Extract data using Promise.all for parallel processing
    const [
      title, 
      price, 
      description, 
      imageUrl,
      bedrooms,
      bathrooms,
      propertyType,
      location,
      agent
    ] = await Promise.all([
      this.extractText(page, primarySelectors.title),
      this.extractText(page, primarySelectors.price),
      this.extractText(page, primarySelectors.description),
      this.extractAttribute(page, primarySelectors.imageUrl, 'src'),
      this.extractText(page, primarySelectors.bedrooms),
      this.extractText(page, primarySelectors.bathrooms),
      this.extractText(page, primarySelectors.propertyType),
      this.extractText(page, primarySelectors.location),
      this.extractText(page, primarySelectors.agent)
    ]);

    // Return all extracted data
    return {
      title,
      price,
      description,
      imageUrl,
      bedrooms,
      bathrooms,
      propertyType,
      location,
      agent
    };
  }
}

/* ------------------------------------------------------------------------- */
/* Public API                                                                */
/* ------------------------------------------------------------------------- */

const scraperInstance = new Property24Scraper();

// Register this scraper with the registry
ScraperRegistry.getInstance().register('property24', {
  scraper: scraperInstance,
  urlPatterns
});

// Export a function-style API to maintain consistency with other scrapers
export async function scrape(url = 'https://www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163'): Promise<Property24Data> {
  return scraperInstance.scrape(url);
}

export type { Property24Data as ScrapeResult };