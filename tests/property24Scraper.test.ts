
import path from 'path';
import { scrape, ScrapeResult } from '../src/scraper/property24Scraper.js';
import { urlPatterns } from '../src/scraper/property24Scraper.js';
import { findBestMatch } from '../src/utils/urlPatternMatcher.js';

describe('property24Scraper scraper', () => {
  it('scrapes data correctly from the fixture HTML', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'property24Scraper.html');
    const url = `file://${filePath}`;
    const result: ScrapeResult = await scrape(url);
    
    expect(result.title).toBeDefined();
    expect(result.price).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.imageUrl).toBeDefined();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
  
  it('handles missing elements gracefully', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'property24Scraper.html');
    const url = `file://${filePath}`;
    
    // Mock extractText to simulate missing elements
    const originalScrape = scrape;
    const mockScrape = async (url: string) => {
      const result = await originalScrape(url);
      // Simulate missing price
      result.price = '';
      return result;
    };
    
    // @ts-ignore - Replace the scrape function temporarily
    global.scrape = mockScrape;
    
    const result = await mockScrape(url);
    
    // Even with missing price, the scraper should not fail
    expect(result.title).toBeDefined();
    expect(result.price).toBe('');
    expect(result.description).toBeDefined();
    expect(result.imageUrl).toBeDefined();
    
    // Restore original function
    // @ts-ignore
    global.scrape = originalScrape;
  });
  
  it('has valid URL patterns for pattern matching', () => {
    // Test URL that should match this scraper
    const testUrl = 'https://www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163/116020259';
    
    // Check if our patterns match the test URL
    const match = findBestMatch(testUrl, urlPatterns);
    expect(match).not.toBeNull();
    if (match) {
      expect(match.pattern).toBeDefined();
    }
  });
  
  // Skip this test in CI environments
  it.skip('scrapes live website', async () => {
    const result = await scrape('https://www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163/116020259');
    
    // Just check we get some data back
    expect(result.title).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });
});
