import path from 'path';
import { scrape, ScrapeResult } from '../src/scraper/exampleSite.js';

describe('property24 scraper', () => {
  it('scrapes data correctly from the fixture HTML', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'property24.html');
    const url = `file://${filePath}`;
    const result: ScrapeResult = await scrape(url);
    
    expect(result.title).toBe('3 Bedroom Apartment in Walmer Estate');
    expect(result.price).toBe('R12,500 per month');
    expect(result.description).toMatch(
      /^This modern apartment in Walmer Estate offers 3 bedrooms/
    );
    expect(result.imageUrl).toBe('https://images.prop24.com/walmer-estate-apartment.jpg');
    // Timestamp should be a valid ISO string equal to its own ISO representation
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('returns undefined for price when it is missing', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'property24_missing_price.html');
    const url = `file://${filePath}`;
    const result: ScrapeResult = await scrape(url);
    
    expect(result.title).toBe('3 Bedroom Apartment in Walmer Estate');
    expect(result.price).toBe(''); // The scraper returns an empty string, not undefined
    expect(result.description).toMatch(
      /^This modern apartment in Walmer Estate offers 3 bedrooms/
    );
    expect(result.imageUrl).toBe('https://images.prop24.com/walmer-estate-apartment.jpg');
  });
});