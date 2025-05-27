import { ScraperRegistry, ScraperDefinition } from '../../src/scraper/ScraperRegistry.js';
import { BaseScraper } from '../../src/scraper/BaseScraper.js';
import type { ScrapeResult } from '../../src/types/ScrapeResult.js';
import { Page } from 'puppeteer';

// Mock implementation of BaseScraper for testing
class MockScraper extends BaseScraper {
  constructor(private mockResult: Partial<ScrapeResult> = {}) {
    super();
  }

  protected async extractData(
    _page: Page,
    _url: string,
    params?: Record<string, string>
  ): Promise<Partial<ScrapeResult>> {
    return {
      ...this.mockResult,
      params: JSON.stringify(params || {})
    };
  }

  // Override launchBrowser to prevent actual browser launches in tests
  protected async launchBrowser(): Promise<{ newPage: () => Promise<{ goto: () => Promise<unknown>; waitForSelector: () => Promise<unknown>; $eval: () => Promise<string>; close: () => Promise<unknown> }>; close: () => Promise<unknown> }> {
    return {
      newPage: async () => ({
        goto: async () => ({}),
        waitForSelector: async () => ({}),
        $eval: async () => 'mocked',
        close: async () => ({})
      }),
      close: async () => ({})
    };
  }
}

describe('ScraperRegistry', () => {
  let registry: ScraperRegistry;

  beforeEach(() => {
    // Start with a fresh registry for each test
    registry = new ScraperRegistry();
    
    // Clear singleton instance to avoid test interference
    (ScraperRegistry as unknown as { instance: null }).instance = null;
  });

  it('registers and retrieves scrapers', () => {
    const scraper = new MockScraper({ title: 'Test' });
    const definition: ScraperDefinition = {
      scraper,
      urlPatterns: ['example.com']
    };
    
    registry.register('test', definition);
    
    expect(registry.getScraper('test')).toBe(definition);
    expect(registry.getScraperIds()).toEqual(['test']);
  });

  it('finds a scraper for a URL', () => {
    const scraper1 = new MockScraper({ title: 'Scraper 1' });
    const scraper2 = new MockScraper({ title: 'Scraper 2' });
    
    registry.register('scraper1', {
      scraper: scraper1,
      urlPatterns: ['example.com/a/*']
    });
    
    registry.register('scraper2', {
      scraper: scraper2,
      urlPatterns: ['example.com/b/*']
    });
    
    const match = registry.findScraperForUrl('https://example.com/b/test');
    
    expect(match).not.toBeNull();
    expect(match!.scraperId).toBe('scraper2');
    expect(match!.scraper).toBe(scraper2);
  });

  it('returns null when no scraper matches a URL', () => {
    registry.register('test', {
      scraper: new MockScraper(),
      urlPatterns: ['example.com/a/*']
    });
    
    const match = registry.findScraperForUrl('https://example.com/b/test');
    
    expect(match).toBeNull();
  });

  it('scrapes a URL with the appropriate scraper', async () => {
    const scraper1 = new MockScraper({ title: 'Product 1' });
    const scraper2 = new MockScraper({ title: 'Product 2' });
    
    registry.register('scraper1', {
      scraper: scraper1,
      urlPatterns: ['example.com/product/:id']
    });
    
    registry.register('scraper2', {
      scraper: scraper2,
      urlPatterns: ['example.org/*']
    });
    
    const { result, scraperId } = await registry.scrape('https://example.com/product/123');
    
    expect(scraperId).toBe('scraper1');
    expect(result.title).toBe('Product 1');
    expect(result.params).toBe(JSON.stringify({ id: '123' }));
  });

  it('throws an error when no scraper can handle a URL', async () => {
    registry.register('test', {
      scraper: new MockScraper(),
      urlPatterns: ['example.com']
    });
    
    await expect(registry.scrape('https://example.org')).rejects.toThrow(
      'No registered scraper can handle URL: https://example.org'
    );
  });

  it('uses the singleton instance pattern', () => {
    const instance1 = ScraperRegistry.getInstance();
    const instance2 = ScraperRegistry.getInstance();
    
    expect(instance1).toBe(instance2);
  });
});