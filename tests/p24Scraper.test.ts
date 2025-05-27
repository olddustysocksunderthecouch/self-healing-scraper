import path from 'path';
import { scrape, ScrapeResult } from '../src/scraper/p24Scraper.js';

describe('Property24 scraper', () => {
  it('scrapes data correctly from the fixture HTML', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'property24.html');
    const url = `file://${filePath}`;
    const result: ScrapeResult = await scrape(url);
    
    // Test core fields (required by ScrapeResult interface)
    expect(result.title).toBe('3 Bedroom Apartment in Walmer Estate');
    expect(result.price).toBe('R12,500 per month');
    expect(result.description).toMatch(
      /^This modern apartment in Walmer Estate offers 3 bedrooms/
    );
    expect(result.imageUrl).toBe('https://images.prop24.com/walmer-estate-apartment.jpg');
    
    // Test timestamp is a valid ISO string
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('returns empty string for price when it is missing', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'property24_missing_price.html');
    const url = `file://${filePath}`;
    const result: ScrapeResult = await scrape(url);
    
    expect(result.title).toBe('3 Bedroom Apartment in Walmer Estate');
    expect(result.price).toBe('');
    expect(result.description).toMatch(
      /^This modern apartment in Walmer Estate offers 3 bedrooms/
    );
    expect(result.imageUrl).toBe('https://images.prop24.com/walmer-estate-apartment.jpg');
  });
  
  // Test with actual live URL to ensure our selectors work with the real site
  // This test may fail if the network is unstable or the site structure changes
  it.skip('scrapes data from live Property24 website - needs manual verification', async () => {
    // NOTE: This test is skipped by default since it requires network access and 
    // the live site may change. Remove .skip when you want to manually verify the scraper.
    
    const liveUrl = 'https://www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163';
    
    try {
      const result: ScrapeResult = await scrape(liveUrl);
      
      // Basic validation to ensure we got some data
      expect(typeof result.title).toBe('string');
      
      // We don't expect specific fields since the live site may change
      // Just verify we have a timestamp
      expect(result.timestamp).toBeTruthy();
      
      // Log the result for manual inspection
      console.log('Live scraping result:', {
        title: result.title || '(empty)',
        price: result.price || '(empty)',
        description: result.description ? (result.description.substring(0, 50) + '...') : '(empty)',
        imageUrl: result.imageUrl || '(empty)',
        bedrooms: result.bedrooms || '(empty)',
        bathrooms: result.bathrooms || '(empty)',
        propertyType: result.propertyType || '(empty)',
        location: result.location || '(empty)',
        agent: result.agent ? (result.agent.substring(0, 30) + '...') : '(empty)'
      });
      
      // At minimum, we should get a title
      expect(result.title.length).toBeGreaterThan(0);
    } catch (error) {
      console.error(`Error scraping live site: ${error.message}`);
      throw error;
    }
  });
});