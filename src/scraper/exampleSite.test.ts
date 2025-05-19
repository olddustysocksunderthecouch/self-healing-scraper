import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrape, SELECTORS } from './exampleSite';
import { ScrapeResult } from './types';

// Mock the timestamp for consistent testing
const mockDate = new Date('2023-01-01T12:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

describe('exampleSite Scraper', () => {
  let browser: Browser;
  let page: Page;
  let fixtureHtml: string;

  beforeAll(async () => {
    // Load the fixture HTML
    fixtureHtml = fs.readFileSync(
      path.join(__dirname, '../../tests/fixtures/exampleSite.html'),
      'utf-8'
    );

    // Launch browser for tests
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    // Create a new page for each test
    page = await browser.newPage();
    await page.setContent(fixtureHtml);

    // Mock page.goto to use our fixture instead
    jest.spyOn(Page.prototype, 'goto').mockImplementation(async () => {
      await page.setContent(fixtureHtml);
      return {} as any;
    });
  });

  afterEach(async () => {
    await page.close();
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
