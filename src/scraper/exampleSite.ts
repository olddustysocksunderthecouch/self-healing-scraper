import puppeteer, { Browser, Page } from 'puppeteer';
import { ScrapeResult } from './types';

// Default example URL to scrape
const DEFAULT_URL = 'https://news.ycombinator.com/';

// Selectors for the Hacker News example
const SELECTORS = {
  stories: '.athing',
  title: '.titleline > a',
  score: '.score',
  age: '.age > a',
  comments: '.subtext > a:last-child',
};

/**
 * Scrapes data from the target URL (defaults to Hacker News)
 *
 * @param url - The URL to scrape (optional, defaults to Hacker News)
 * @returns A promise that resolves to the scraped data
 */
export async function scrape(url: string = DEFAULT_URL): Promise<ScrapeResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await extractData(page);

    return {
      url,
      timestamp: new Date().toISOString(),
      data,
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extracts structured data from the page
 *
 * @param page - Puppeteer page object
 * @returns Object containing the extracted data
 */
async function extractData(page: Page): Promise<Record<string, any>> {
  // Extract story elements
  const stories = await page.evaluate((selectors) => {
    const storyElements = Array.from(document.querySelectorAll(selectors.stories));

    return storyElements.map((storyEl) => {
      const id = storyEl.getAttribute('id');
      const titleEl = storyEl.querySelector(selectors.title);

      // Find the row with score, age, etc. (next sibling)
      const detailsRow = storyEl.nextElementSibling;
      const scoreEl = detailsRow?.querySelector(selectors.score);
      const ageEl = detailsRow?.querySelector(selectors.age);
      const commentsEl = detailsRow?.querySelector(selectors.comments);

      // Extract text content
      const title = titleEl?.textContent?.trim() || '';
      const url = titleEl?.getAttribute('href') || '';
      const score = scoreEl?.textContent?.trim() || '0 points';
      const age = ageEl?.textContent?.trim() || '';
      const commentsText = commentsEl?.textContent?.trim() || '0 comments';

      // Parse numeric values
      const scoreNum = parseInt(score.match(/\d+/)?.[0] || '0', 10);
      const commentsNum = parseInt(commentsText.match(/\d+/)?.[0] || '0', 10);

      return {
        id,
        title,
        url,
        score: scoreNum,
        age,
        comments: commentsNum,
      };
    });
  }, SELECTORS);

  return {
    stories,
    count: stories.length,
    siteInfo: {
      name: 'Hacker News',
      scrapedAt: new Date().toISOString(),
    },
  };
}

// Export the SELECTORS to allow tests to validate them
export { SELECTORS };
