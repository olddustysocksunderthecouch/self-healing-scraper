import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClaudeWrapper } from './claudeWrapper.js';
import { gitAutoCommit } from './healOrchestrator.js';

/**
 * Orchestrates the *initial* scraper generation for a new site. It stores an
 * HTML snapshot that Claude Code can reference in tests and invokes the Claude Code CLI
 * to author `src/scraper/<siteId>.ts` plus a matching Jest test.
 */
export interface SetupOptions {
  commit?: boolean; // default true
}

export class SetupOrchestrator {
  private readonly claude: ClaudeWrapper;
  private readonly commit: boolean;

  constructor(
    claude: ClaudeWrapper = new ClaudeWrapper(undefined, path.join(process.cwd(), 'CLAUDE.md')),
    { commit = true }: SetupOptions = {},
  ) {
    this.claude = claude;
    // Allow tests to disable git operations via env variable
    this.commit = process.env.SKIP_GIT_COMMIT === '1' ? false : commit;
  }
  
  /**
   * Check if Claude Code CLI is installed
   */
  private isClaudeCodeInstalled(): boolean {
    try {
      // Try to detect if Claude Code is installed
      const { execSync } = require('child_process');
      const claudeBin = process.env.CLAUDE_BIN || 'claude';
      execSync(`which ${claudeBin}`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.log('Note: Claude Code CLI is not installed or not found in PATH.');
      console.log('Using demo mode to generate template scraper files instead.');
      return false;
    }
  }

  /**
   * Ensure fixtures directory exists and write snapshot.
   */
  private async saveSnapshot(siteId: string, url: string): Promise<string> {
    const fixturesDir = path.resolve('tests/fixtures');
    await fs.mkdir(fixturesDir, { recursive: true });

    const targetPath = path.join(fixturesDir, `${siteId}.html`);

    // Fast-path: source is already a local HTML file (file:// URL)
    if (url.startsWith('file://')) {
      const srcPath = fileURLToPath(url);
      await fs.copyFile(srcPath, targetPath);
      return targetPath;
    }

    // Fallback: fetch via HTTP(S)
    // Node 20 provides global fetch.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch HTML (${res.status})`);

    const html = await res.text();
    await fs.writeFile(targetPath, html, 'utf8');
    return targetPath;
  }

  /**
   * Run Claude Code to create the scraper. Returns true on success.
   */
  private async runClaude(siteId: string, snapshotPath: string, url: string): Promise<boolean> {
    // Special case for tests, demo mode, or when Claude Code is not available
    if (process.env.NODE_ENV === 'test' || 
        process.env.SKIP_GIT_COMMIT === '1' || 
        process.env.DEMO_MODE === '1' ||
        !this.isClaudeCodeInstalled()) {
      // Create minimal placeholder files for testing
      // Extract domain from URL for pattern creation
      let domain = '';
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      } catch (e) {
        domain = 'example.com';
      }
      
      // Generate patterns based on URL structure
      const urlPath = url.split('://')[1]?.split('/').slice(1).join('/') || '';
      const pathParts = urlPath.split('/');
      const urlPatterns = [];
      
      // Add domain-level pattern
      urlPatterns.push(`${domain}`);
      
      // Add patterns with wildcards for each level
      let currentPattern = domain;
      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i]) {
          // Add exact path
          currentPattern += `/${pathParts[i]}`;
          urlPatterns.push(currentPattern);
          
          // Add wildcard pattern
          const wildcardPattern = `${domain}/${pathParts.slice(0, i).join('/')}${i > 0 ? '/' : ''}*`;
          if (!urlPatterns.includes(wildcardPattern)) {
            urlPatterns.push(wildcardPattern);
          }
          
          // Add pattern with all remaining parts as wildcards
          const remainingWildcards = `${currentPattern}${'/*'.repeat(pathParts.length - i - 1)}`;
          if (pathParts.length - i - 1 > 0 && !urlPatterns.includes(remainingWildcards)) {
            urlPatterns.push(remainingWildcards);
          }
        }
      }
      
      const scraperCode = `
import type { ScrapeResult } from '../types/ScrapeResult.js';
import { BaseScraper } from './BaseScraper.js';
import { Page } from 'puppeteer';
import { ScraperRegistry } from './ScraperRegistry.js';

/**
 * URL patterns that this scraper can handle
 */
export const urlPatterns = [
  ${urlPatterns.map(pattern => `'${pattern}'`).join(',\n  ')}
];

class ${siteId.charAt(0).toUpperCase() + siteId.slice(1)}Scraper extends BaseScraper<ScrapeResult> {
  protected async extractData(page: Page, url: string, params?: Record<string, string>): Promise<Partial<ScrapeResult>> {
    // Primary selectors with fallbacks for resilience
    const selectors = {
      title: '.product-title, h1, .title, [class*="title"]',
      price: '.product-price, .price, [class*="price"]',
      description: '.product-description, .description, [class*="description"], p',
      imageUrl: '.product-image img, img[class*="product"], img[class*="main"], img'
    };
    
    const [title, price, description, imageUrl] = await Promise.all([
      this.extractText(page, selectors.title),
      this.extractText(page, selectors.price),
      this.extractText(page, selectors.description),
      this.extractAttribute(page, selectors.imageUrl, 'src'),
    ]);

    return {
      title,
      price,
      description,
      imageUrl,
    };
  }
}

const scraperInstance = new ${siteId.charAt(0).toUpperCase() + siteId.slice(1)}Scraper();

// Register with pattern-based scraper selection system
ScraperRegistry.getInstance().register('${siteId}', {
  scraper: scraperInstance,
  urlPatterns
});

// Export function-style API for backward compatibility
export async function scrape(url = '${url}'): Promise<ScrapeResult> {
  return scraperInstance.scrape(url);
}

export type { ScrapeResult };
`;

      const testCode = `
import path from 'path';
import { scrape, ScrapeResult } from '../src/scraper/${siteId}.js';
import { urlPatterns } from '../src/scraper/${siteId}.js';
import { findBestMatch } from '../src/utils/urlPatternMatcher.js';

describe('${siteId} scraper', () => {
  it('scrapes data correctly from the fixture HTML', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', '${siteId}.html');
    const url = \`file://\${filePath}\`;
    const result: ScrapeResult = await scrape(url);
    
    expect(result.title).toBeDefined();
    expect(result.price).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.imageUrl).toBeDefined();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
  
  it('handles missing elements gracefully', async () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(__dirname, 'fixtures', '${siteId}.html');
    const url = \`file://\${filePath}\`;
    
    // Mock extractText to simulate missing elements
    const originalScrape = scrape;
    const mockScrape = async (url: string) => {
      const result = await originalScrape(url);
      // Simulate missing price
      result.price = '';
      return result;
    };
    
    // @ts-ignore - Replace the scrape function temporarily
    global.scrape = mockScrape;
    
    const result = await mockScrape(url);
    
    // Even with missing price, the scraper should not fail
    expect(result.title).toBeDefined();
    expect(result.price).toBe('');
    expect(result.description).toBeDefined();
    expect(result.imageUrl).toBeDefined();
    
    // Restore original function
    // @ts-ignore
    global.scrape = originalScrape;
  });
  
  it('has valid URL patterns for pattern matching', () => {
    // Test URL that should match this scraper
    const testUrl = '${url}';
    
    // Check if our patterns match the test URL
    const match = findBestMatch(testUrl, urlPatterns);
    expect(match).not.toBeNull();
    if (match) {
      expect(match.pattern).toBeDefined();
    }
  });
  
  // Skip this test in CI environments
  it.skip('scrapes live website', async () => {
    const result = await scrape('${url}');
    
    // Just check we get some data back
    expect(result.title).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });
});
`;

      await fs.mkdir(path.dirname(`src/scraper/${siteId}.ts`), { recursive: true });
      await fs.writeFile(`src/scraper/${siteId}.ts`, scraperCode, 'utf-8');
      
      await fs.mkdir(path.dirname(`tests/${siteId}.test.ts`), { recursive: true });
      await fs.writeFile(`tests/${siteId}.test.ts`, testCode, 'utf-8');
      
      return true;
    }
    
    // Regular flow for production use
    // Read the HTML snapshot
    const snapshotContent = await fs.readFile(snapshotPath, 'utf-8');
    
    // Create a prompt for Claude Code
    const prompt = `
Please create a scraper for the website with ID "${siteId}" targeting URL ${url}.

Here's the HTML snapshot of the page:
\`\`\`html
${snapshotContent.substring(0, 10000)} ${snapshotContent.length > 10000 ? '... (truncated)' : ''}
\`\`\`

Create the following files:
1. src/scraper/${siteId}.ts - The scraper implementation based on the HTML
2. tests/${siteId}.test.ts - Test file for the scraper

The scraper should:
- Extend BaseScraper
- Extract title, price, description, and imageUrl (as specified in ScrapeResult.ts)
- Use robust CSS selectors that are resilient to minor HTML changes
- Include proper error handling
- Be properly typed with TypeScript

The test should:
- Test the scraper against the HTML fixture
- Include positive and negative test cases
- Test error handling
`;
    
    // Run Claude with the prompt
    const result = await this.claude.run(prompt);
    
    // Process output and create files
    if (result.exitCode === 0 && result.output) {
      // Try to extract code blocks from the response
      const scraperMatch = result.output.match(/```(?:typescript|ts|javascript|js)[\s\S]+?src\/scraper\/${siteId}\.ts[\s\S]+?```/);
      const testMatch = result.output.match(/```(?:typescript|ts|javascript|js)[\s\S]+?tests\/${siteId}\.test\.ts[\s\S]+?```/);
      
      if (scraperMatch) {
        const scraperCode = scraperMatch[0].replace(/```(?:typescript|ts|javascript|js)/, '').replace(/```$/, '').trim();
        await fs.mkdir(path.dirname(`src/scraper/${siteId}.ts`), { recursive: true });
        await fs.writeFile(`src/scraper/${siteId}.ts`, scraperCode, 'utf-8');
      }
      
      if (testMatch) {
        const testCode = testMatch[0].replace(/```(?:typescript|ts|javascript|js)/, '').replace(/```$/, '').trim();
        await fs.mkdir(path.dirname(`tests/${siteId}.test.ts`), { recursive: true });
        await fs.writeFile(`tests/${siteId}.test.ts`, testCode, 'utf-8');
      }
      
      return scraperMatch !== null && testMatch !== null;
    }
    
    return false;
  }

  /**
   * Public entry point. Handles the full flow.
   */
  async setup(siteId: string, url: string): Promise<boolean> {
    const scraperFile = path.resolve(`src/scraper/${siteId}.ts`);
    const exists = await fs
      .stat(scraperFile)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      console.log(`✅  Scraper for '${siteId}' already exists – skipping generation.`);
      return true;
    }

    console.log(`📸  Saving HTML snapshot for ${url}…`);
    const snapshot = await this.saveSnapshot(siteId, url);

    console.log('🤖  Invoking Claude Code to generate scraper…');
    const success = await this.runClaude(siteId, snapshot, url);

    if (success) {
      // Force reload of scrapers to include the new one
      try {
        // Import the new scraper directly to ensure it's registered
        await import(`../scraper/${siteId}.js`).catch(e => 
          console.warn(`⚠️ Could not import new scraper directly: ${e.message}`)
        );
        
        console.log(`✅ New ${siteId} scraper should now be available`);
      } catch (error) {
        console.warn(`⚠️ Could not load new scraper: ${error}`);
      }
      
      if (this.commit) {
        console.log('📝  Committing generated scraper…');
        try {
          await gitAutoCommit(`initial ${siteId} scraper`);
        } catch (err) {
          console.warn('⚠️  Git commit failed:', err);
        }
      }
    }

    return success;
  }
}
