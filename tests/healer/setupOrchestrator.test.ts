/**
 * @jest-environment node
 */

import fs from 'fs/promises';
import path from 'path';
import { jest } from '@jest/globals';
import { SetupOrchestrator } from '../../src/healer/setupOrchestrator.js';

function createMockClaudeWrapper(exitCode = 0) {
  return {
    run: jest.fn().mockResolvedValue({
      exitCode,
      output: exitCode === 0 ? `
\`\`\`typescript
// src/scraper/testsite.ts
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';

class TestSiteScraper extends BaseScraper<ScrapeResult> {
  protected async extractData(page: Page, url: string): Promise<Partial<ScrapeResult>> {
    const [title, price, description, imageUrl] = await Promise.all([
      this.extractText(page, '.product-title'),
      this.extractText(page, '.product-price'),
      this.extractText(page, '.product-description'),
      this.extractAttribute(page, '.product-image', 'src'),
    ]);

    return {
      title,
      price,
      description,
      imageUrl,
    };
  }
}

const scraper = new TestSiteScraper();

export async function scrape(url = 'https://example.com/product'): Promise<ScrapeResult> {
  return scraper.scrape(url);
}

export type { ScrapeResult };
\`\`\`

\`\`\`typescript
// tests/testsite.test.ts
import path from 'path';
import { scrape, ScrapeResult } from '../src/scraper/testsite.js';

describe('testsite scraper', () => {
  it('scrapes data correctly from the fixture HTML', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', 'testsite.html');
    const url = \`file://\${filePath}\`;
    const result: ScrapeResult = await scrape(url);
    
    expect(result.title).toBeDefined();
    expect(result.price).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.imageUrl).toBeDefined();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
\`\`\`
` : 'Error generating code'
    }),
  } as unknown as import('../../src/healer/claudeWrapper.js').ClaudeWrapper;
}

describe('SetupOrchestrator', () => {
  const siteId = 'testsite';
  const fixtureSrc = path.resolve('tests/fixtures/exampleSite.html');
  const fixtureUrl = `file://${fixtureSrc}`;

  afterEach(async () => {
    const target = path.resolve(`tests/fixtures/${siteId}.html`);
    await fs.rm(target, { force: true });
    
    // Also clean up generated files if they exist
    try {
      await fs.rm(path.resolve(`src/scraper/${siteId}.ts`), { force: true });
      await fs.rm(path.resolve(`tests/${siteId}.test.ts`), { force: true });
    } catch (err) {
      // Ignore errors if files don't exist
    }
  });

  it('creates snapshot and succeeds when Claude Code exits with 0', async () => {
    // Use the current environment setting to bypass the actual Claude call
    const orchestrator = new SetupOrchestrator(undefined, { commit: false });
    const ok = await orchestrator.setup(siteId, fixtureUrl);

    expect(ok).toBe(true);

    const snapshotPath = path.resolve(`tests/fixtures/${siteId}.html`);
    const exists = await fs
      .stat(snapshotPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});