import path from 'path';
import { scrape, ScrapeResult } from '../src/scraper/exampleSite.js';

describe('exampleSite scraper', () => {
  it('scrapes data correctly from the fixture HTML', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'exampleSite.html');
    const url = `file://${filePath}`;
    const result: ScrapeResult = await scrape(url);
    expect(result.title).toBe('Premium Wireless Headphones');
    expect(result.price).toBe('$129.99');
    expect(result.description).toMatch(
      /^Experience crystal-clear sound with our premium wireless headphones\./
    );
    expect(result.imageUrl).toBe('https://example.com/images/headphones.jpg');
    // Timestamp should be a valid ISO string equal to its own ISO representation
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});