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
   */
  async scrape(url: string): Promise<R> {
    let browser: Browser | null = null;

    try {
      browser = await this.launchBrowser();
      const page = await this.openPage(browser, url);
      const data = await this.extractData(page, url);
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
   */
  protected abstract extractData(page: Page, url: string): Promise<Partial<R>>;

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
