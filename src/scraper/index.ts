/**
 * Central module for scraper management and initialization
 */
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { ScraperRegistry } from './ScraperRegistry.js';

// Import scrapers manually for immediate loading
import './exampleSite.js';
import './p24Scraper.js';
import './privatepropertyScraper.js';
// Add any new scrapers here

/**
 * Get the registry instance
 */
export function getRegistry(): ScraperRegistry {
  return ScraperRegistry.getInstance();
}

/**
 * Scrape a URL by auto-selecting the appropriate scraper based on URL pattern
 * 
 * @param url URL to scrape
 * @returns Scraping result and the ID of the scraper that was used
 * @throws Error if no scraper can handle the URL
 */
export async function scrapeUrl(url: string): Promise<{ 
  result: ScrapeResult;
  scraperId: string; 
}> {
  return getRegistry().scrape(url);
}

/**
 * Get a list of all registered scrapers
 * 
 * @returns Array of scraper IDs
 */
export function getAvailableScrapers(): string[] {
  return getRegistry().getScraperIds();
}

/**
 * Check if a URL can be handled by any registered scraper
 * 
 * @param url URL to check
 * @returns Object with matches flag and scraper ID if found
 */
export function canHandleUrl(url: string): { 
  canHandle: boolean; 
  scraperId?: string;
} {
  const match = getRegistry().findScraperForUrl(url);
  
  if (!match) {
    return { canHandle: false };
  }
  
  return { 
    canHandle: true, 
    scraperId: match.scraperId 
  };
}