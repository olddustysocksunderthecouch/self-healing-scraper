import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

export interface ScrapeResult {
  title: string;
  price: string;
  description: string;
  imageUrl: string;
  timestamp: string;
}

/**
 * Scrapes data from the example product page
 * @param url URL to scrape, defaults to a demo product page
 * @returns Promise resolving to structured scrape result
 */
export async function scrape(url = 'https://example.com/product'): Promise<ScrapeResult> {
  let browser: Browser | null = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extract data using selectors
    const title = await extractText(page, '.product-title');
    const price = await extractText(page, '.product-price');
    const description = await extractText(page, '.product-description');
    const imageUrl = await extractAttribute(page, '.product-image', 'src');

    // Return structured data
    return {
      title,
      price,
      description,
      imageUrl,
      timestamp: new Date().toISOString(),
    };
  } finally {
    // Ensure browser closes even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Helper function to extract text content from a selector
 */
async function extractText(page: Page, selector: string): Promise<string> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return page.$eval(selector, (element) => element.textContent?.trim() || '');
  } catch (error) {
    console.error(`Failed to extract text from selector: ${selector}`, error);
    return '';
  }
}

/**
 * Helper function to extract an attribute from an element
 */
async function extractAttribute(page: Page, selector: string, attribute: string): Promise<string> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return page.$eval(selector, (element, attr) => element.getAttribute(attr) || '', attribute);
  } catch (error) {
    console.error(`Failed to extract attribute ${attribute} from selector: ${selector}`, error);
    return '';
  }
}
