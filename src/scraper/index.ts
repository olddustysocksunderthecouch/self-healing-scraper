/**
 * Central module for scraper management and initialization
 */
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { ScraperRegistry } from './ScraperRegistry.js';
import { loadAllScrapers } from './loader.js';

// Dynamic loading of all scrapers
(async () => {
  try {
    await loadAllScrapers();
  } catch (error) {
    console.error('Error loading scrapers:', error);
    
    // Fallback to manual imports if dynamic loading fails
    import('./exampleSite.js').catch(e => console.error('Failed to load exampleSite:', e));
    import('./p24Scraper.js').catch(e => console.error('Failed to load p24Scraper:', e));
    import('./privatepropertyScraper.js').catch(e => console.error('Failed to load privatepropertyScraper:', e));
    import('./seeffScraper.js').catch(e => console.error('Failed to load seeffScraper:', e));
  }
})();

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
  try {
    // Extract domain from URL to check for matching scraper file
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      // Not a valid URL, just try to use it as is
      domain = url.split('/')[0].replace(/^www\./, '');
    }
    
    // Get the base domain without TLD
    const baseDomain = domain.split('.')[0];
    const possibleScraperId = `${baseDomain}Scraper`;
    
    // Try to directly import the scraper if it exists but isn't loaded
    const availableScrapers = getRegistry().getScraperIds();
    if (!availableScrapers.includes(possibleScraperId)) {
      try {
        // Check if the file exists
        await import(`./${possibleScraperId}.js`).catch(() => {
          // Silent failure, just means the file doesn't exist
        });
        
        // Try again after loading
        const newAvailableScrapers = getRegistry().getScraperIds();
        if (newAvailableScrapers.includes(possibleScraperId)) {
          console.log(`✅ Successfully loaded scraper: ${possibleScraperId}`);
        }
      } catch (error) {
        console.error('Error loading scraper:', error);
        // Ignore errors, we'll fall back to other scrapers
      }
    }
  } catch (error) {
    console.error('Error in scrapeUrl:', error);
    // Ignore errors in the scraper auto-detection
  }
  
  // Use the registry to find the best match
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
export async function canHandleUrl(url: string): Promise<{ 
  canHandle: boolean; 
  scraperId?: string;
}> {
  try {
    // Extract domain from URL to check for matching scraper file
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      // Not a valid URL, just try to use it as is
      domain = url.split('/')[0].replace(/^www\./, '');
    }
    
    // Get the base domain without TLD
    const baseDomain = domain.split('.')[0];
    const possibleScraperId = `${baseDomain}Scraper`;
    
    // Try to directly import the scraper if it exists but isn't loaded
    const availableScrapers = getRegistry().getScraperIds();
    if (!availableScrapers.includes(possibleScraperId)) {
      try {
        // Check if the file exists
        await import(`./${possibleScraperId}.js`).catch(() => {
          // Silent failure, just means the file doesn't exist
        });
      } catch (error) {
        // Ignore errors, we'll fall back to other scrapers
      }
    }
  } catch (error) {
    // Ignore errors in the scraper auto-detection
  }
  
  // Check if any scraper can handle this URL
  const match = getRegistry().findScraperForUrl(url);
  
  if (!match) {
    return { canHandle: false };
  }
  
  return { 
    canHandle: true, 
    scraperId: match.scraperId 
  };
}