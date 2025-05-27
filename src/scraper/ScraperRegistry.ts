import type { ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { findBestMatch } from '../utils/urlPatternMatcher.js';

/**
 * Interface for scraper module definition with URL patterns
 */
export interface ScraperDefinition<R extends ScrapeResult = ScrapeResult> {
  scraper: BaseScraper<R>;
  urlPatterns: string[];
}

/**
 * Registry for managing scrapers and selecting them based on URL patterns
 */
export class ScraperRegistry {
  private scrapers: Map<string, ScraperDefinition> = new Map();
  private static instance: ScraperRegistry;

  /**
   * Get singleton instance of ScraperRegistry
   */
  public static getInstance(): ScraperRegistry {
    if (!ScraperRegistry.instance) {
      ScraperRegistry.instance = new ScraperRegistry();
    }
    return ScraperRegistry.instance;
  }

  /**
   * Register a scraper with URL patterns
   * @param id Unique identifier for the scraper
   * @param definition Scraper definition with URL patterns
   */
  public register(id: string, definition: ScraperDefinition): void {
    this.scrapers.set(id, definition);
  }

  /**
   * Find a scraper that can handle a given URL
   * @param url URL to find a scraper for
   * @returns Scraper ID, scraper instance, and extracted URL params if found
   */
  public findScraperForUrl(url: string): { 
    scraperId: string; 
    scraper: BaseScraper; 
    params: Record<string, string>;
  } | null {
    for (const [id, definition] of this.scrapers.entries()) {
      const match = findBestMatch(url, definition.urlPatterns);
      
      if (match) {
        return {
          scraperId: id,
          scraper: definition.scraper,
          params: match.params
        };
      }
    }
    
    return null;
  }

  /**
   * Get a scraper by ID
   * @param id Scraper ID
   * @returns Scraper definition if found
   */
  public getScraper(id: string): ScraperDefinition | undefined {
    return this.scrapers.get(id);
  }

  /**
   * Get all registered scraper IDs
   * @returns Array of scraper IDs
   */
  public getScraperIds(): string[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Scrape a URL by automatically selecting the appropriate scraper
   * @param url URL to scrape
   * @returns Scrape result and scraper ID
   * @throws Error if no scraper is found for the URL
   */
  public async scrape(url: string): Promise<{ result: ScrapeResult; scraperId: string }> {
    const match = this.findScraperForUrl(url);
    
    if (!match) {
      console.log("No pattern match found. Falling back to 'property24' scraper for debugging");
      
      // For debugging/testing, use property24 scraper for now
      const scraper = this.getScraper('property24')?.scraper;
      
      if (!scraper) {
        throw new Error(`No registered scraper can handle URL: ${url}`);
      }
      
      const result = await scraper.scrape(url, {});
      return { result, scraperId: 'property24' };
    }
    
    const { scraperId, scraper, params } = match;
    
    // Pass URL params to scraper via context
    const result = await scraper.scrape(url, params);
    
    return { result, scraperId };
  }

  /**
   * Clear all registered scrapers (mainly for testing)
   */
  public clear(): void {
    this.scrapers.clear();
  }
}