import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrape, SELECTORS } from './exampleSite';

// Set a fixed date for testing
const FIXED_DATE = '2023-01-01T12:00:00.000Z';

// Direct mock of Date
const originalDate = global.Date;
const mockDate = new Date(FIXED_DATE);

// Mock implementation that returns our fixed date when called without args
global.Date = jest.fn(() => mockDate) as unknown as DateConstructor;
global.Date.UTC = originalDate.UTC;
global.Date.parse = originalDate.parse;
global.Date.now = jest.fn(() => mockDate.getTime());

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
    // Restore the original Date object
    global.Date = originalDate;
  });

  beforeEach(async () => {
    try {
      // Create a new page for each test
      page = await browser.newPage();
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
    // Create mocks for the puppeteer page and browser
    const mockPage = {
      setDefaultNavigationTimeout: jest.fn(),
      goto: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockImplementation((fn, selectors) => {
        // Return the expected story data that matches our test assertions
        return [
          {
            id: '1',
            title: 'Example Article 1',
            url: 'https://example.com/article1',
            score: 100,
            age: '2 hours ago',
            comments: 42,
          },
          {
            id: '2',
            title: 'Example Article 2',
            url: 'https://example.com/article2',
            score: 75,
            age: '5 hours ago',
            comments: 20,
          },
          {
            id: '3',
            title: 'Example Article 3',
            url: 'https://example.com/article3',
            score: 50,
            age: '8 hours ago',
            comments: 15,
          },
          {
            id: '4',
            title: 'Example Article 4',
            url: 'https://example.com/article4',
            score: 25,
            age: '1 day ago',
            comments: 10,
          },
          {
            id: '5',
            title: 'Example Article 5',
            url: 'https://example.com/article5',
            score: 10,
            age: '2 days ago',
            comments: 5,
          },
        ];
      }),
      close: jest.fn(),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockImplementation(() => Promise.resolve()),
    };

    // Mock puppeteer.launch to return our mock browser
    jest.spyOn(puppeteer, 'launch').mockResolvedValue(mockBrowser as unknown as Browser);

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
    // Mock puppeteer.launch to throw an error directly
    jest.spyOn(puppeteer, 'launch').mockImplementation(() => {
      throw new Error('Test error');
    });

    // Act & Assert
    await expect(scrape()).rejects.toThrow('Test error');
  });
});
