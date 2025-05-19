import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrape, SELECTORS } from './exampleSite';
import { ScrapeResult } from './types';

// Set a fixed date for testing
const FIXED_DATE = '2023-01-01T12:00:00Z';
const mockDate = new Date(FIXED_DATE);

// Mock for Date
jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
  if (args.length === 0) {
    return mockDate;
  }
  return new (Function.prototype.bind.apply(Date, [null].concat(args) as any))();
});

describe('exampleSite Scraper', () => {
  let browser: Browser;
  let page: Page;
  let fixtureHtml: string;

  beforeAll(async () => {
    // Load the fixture HTML only once
    try {
      fixtureHtml = fs.readFileSync(
        path.join(__dirname, '../../tests/fixtures/exampleSite.html'),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to load fixture HTML:', error);
      throw error;
    }

    try {
      // Launch browser for tests
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    try {
      // Create a new page for each test
      page = await browser.newPage();

      // Load the fixture HTML into the page
      await page.setContent(fixtureHtml);

      // Mock page.goto to use our fixture instead
      jest.spyOn(Page.prototype, 'goto').mockImplementation(async () => {
        await page.setContent(fixtureHtml);
        return { ok: () => true } as any;
      });
    } catch (error) {
      console.error('Failed in beforeEach:', error);
      throw error;
    }
  });

  afterEach(async () => {
    if (page) {
      await page.close().catch((e) => console.error('Error closing page:', e));
    }
    jest.restoreAllMocks();
  });

  it('should export SELECTORS for testing', () => {
    expect(SELECTORS).toBeDefined();
    expect(SELECTORS.stories).toBe('.athing');
    expect(SELECTORS.title).toBe('.titleline > a');
  });

  it('should scrape example site correctly', async () => {
    // Act
    const result = await scrape('https://test-url.com');

    // Assert
    expect(result).toBeDefined();
    expect(result.url).toBe('https://test-url.com');
    expect(result.timestamp).toBe('2023-01-01T12:00:00.000Z');

    // Check the data structure
    expect(result.data).toHaveProperty('stories');
    expect(result.data).toHaveProperty('count');
    expect(result.data).toHaveProperty('siteInfo');

    // Check the stories array
    expect(Array.isArray(result.data.stories)).toBe(true);
    expect(result.data.stories.length).toBe(5);

    // Check data for first story
    const firstStory = result.data.stories[0];
    expect(firstStory.id).toBe('1');
    expect(firstStory.title).toBe('Example Article 1');
    expect(firstStory.url).toBe('https://example.com/article1');
    expect(firstStory.score).toBe(100);
    expect(firstStory.comments).toBe(42);

    // Check the count
    expect(result.data.count).toBe(5);
  });

  it('should handle errors gracefully', async () => {
    // Arrange - make the browser.newPage throw an error
    jest.spyOn(Browser.prototype, 'newPage').mockImplementation(() => {
      throw new Error('Test error');
    });

    // Act & Assert
    await expect(scrape()).rejects.toThrow('Test error');
  });
});
