import puppeteer, { Browser, Page } from 'puppeteer';
import type { ScrapeResult } from '../types/ScrapeResult.js';

/**
 * Abstract base class that encapsulates repetitive boilerplate around
 * launching a headless browser, navigating to the given URL, executing the
 * extraction logic and shutting everything down again.
 */
export abstract class BaseScraper<R extends ScrapeResult = ScrapeResult> {
  /** Create a Puppeteer browser instance. Override to customise flags. */
  protected async launchBrowser(): Promise<Browser> {
    return puppeteer.launch({ headless: true });
  }

  /** Navigate to URL and return new page. */
  private async openPage(browser: Browser, url: string): Promise<Page> {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    return page;
  }

  /**
   * Public scrape helper that callers should use. It handles the entire
   * lifecycle: create browser → navigate → delegate to subclass for data
   * extraction → close browser.
   * 
   * @param url URL to scrape
   * @param params Optional URL parameters extracted from pattern matching
   * @returns Scraped data with timestamp
   */
  async scrape(url: string, params: Record<string, string> = {}): Promise<R> {
    let browser: Browser | null = null;

    try {
      browser = await this.launchBrowser();
      const page = await this.openPage(browser, url);
      const data = await this.extractData(page, url, params);
      return {
        ...data,
        timestamp: new Date().toISOString(),
      } as R;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Subclasses MUST implement site-specific extraction logic.
   *
   * Implementation should throw on irrecoverable errors – caller will take
   * care of logging / retrying.
   * 
   * @param page Puppeteer page to extract data from
   * @param url Original URL being scraped
   * @param params URL parameters extracted from pattern matching
   * @returns Partial scrape result (timestamp will be added automatically)
   */
  protected abstract extractData(
    page: Page, 
    url: string, 
    params?: Record<string, string>
  ): Promise<Partial<R>>;

  // ------------------------------------------------------------------
  // Convenience helpers
  // ------------------------------------------------------------------

  protected async extractText(page: Page, selector: string): Promise<string> {
    try {
      await page.waitForSelector(selector, { timeout: 5_000 });
      return page.$eval(selector, (el) => el.textContent?.trim() || '');
    } catch {
      return '';
    }
  }

  protected async extractAttribute(
    page: Page,
    selector: string,
    attribute: string,
  ): Promise<string> {
    try {
      await page.waitForSelector(selector, { timeout: 5_000 });
      return page.$eval(selector, (el, attr) => el.getAttribute(attr) || '', attribute);
    } catch {
      return '';
    }
  }
}
