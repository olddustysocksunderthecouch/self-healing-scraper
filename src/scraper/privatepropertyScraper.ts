
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
  protected async extractData(page: Page, _url: string, _params?: Record<string, string>): Promise<Partial<ScrapeResult>> {
    // Primary selectors with fallbacks for resilience
    const selectors = {
      title: '.product-title, h1, .title, [class*="title"]',
      price: '.product-price, .price, [class*="price"]',
      description: '.product-description, .description, [class*="description"], p',
      imageUrl: '.photo-gallery img:first-child, img[src*="_dhd.jpg"], img[src*="photos"], .product-image img, img[class*="product"], img[class*="main"], img'
    };
    
    // Wait a bit longer for images to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // First try to get all images and select the first one with a valid src
    let imageUrl = '';
    try {
      const imgSrcs = await page.$$eval('img', imgs => 
        imgs.map(img => img.getAttribute('src'))
          .filter(src => src && (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg')))
      );
      
      if (imgSrcs && imgSrcs.length > 0) {
        imageUrl = imgSrcs[0] || '';
      }
    } catch (error) {
      console.warn('Error extracting images:', error);
    }
    
    // If no image found, fall back to the selectors
    if (!imageUrl) {
      imageUrl = await this.extractAttribute(page, selectors.imageUrl, 'src');
    }
    
    const [title, price, description] = await Promise.all([
      this.extractText(page, selectors.title),
      this.extractText(page, selectors.price),
      this.extractText(page, selectors.description),
    ]);

    // If we still couldn't find an image, use a placeholder
    if (!imageUrl) {
      const urlObj = new URL(url);
      const propertyId = urlObj.pathname.split('/').pop() || '';
      
      // Try to construct a likely image URL based on property ID pattern
      if (propertyId.startsWith('RR')) {
        imageUrl = `https://images.privateproperty.co.za/photos/${propertyId}_dhd.jpg`;
      } else {
        // Generic placeholder
        imageUrl = 'https://www.privateproperty.co.za/content/images/privateproperty-logo.svg';
      }
    }
  
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
