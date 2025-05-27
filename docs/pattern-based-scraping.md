# Pattern-Based Scraper Selection

The Self-Healing Scraper framework includes a powerful pattern-based scraper selection system that automatically chooses the appropriate scraper based on the URL being processed. This eliminates the need to manually specify which scraper to use for a given URL.

## How It Works

1. Each scraper defines a list of URL patterns it can handle
2. When you provide a URL to scrape, the system matches it against all registered patterns
3. The most specific matching pattern determines which scraper is used
4. URL parameters can be extracted from the pattern and made available to the scraper

## URL Pattern Syntax

The pattern matching system supports several types of patterns:

- **Exact matches**: `example.com/product`
- **Wildcards**: `example.com/*/product` (matches any single path segment)
- **Named parameters**: `example.com/category/:categoryId/product/:productId` (extracts parameters)
- **Domain-only**: `example.com` (matches any URL on the domain)

### Pattern Specificity

When multiple patterns match a URL, the system selects the most specific one based on these rules:

1. More path segments = more specific (e.g., `/a/b/c` is more specific than `/a/b`)
2. Exact segments > named parameters > wildcards (e.g., `/products/123` is more specific than `/products/:id`)

## Creating a Scraper with URL Patterns

When implementing a new scraper, define the URL patterns it can handle:

```typescript
// src/scraper/myScraper.ts
import { BaseScraper } from './BaseScraper.js';
import { ScraperRegistry } from './ScraperRegistry.js';
import { Page } from 'puppeteer';

// Define URL patterns this scraper can handle
export const urlPatterns = [
  'example.com/product/:id',
  'example.com/products/*',
  'www.example.com/product/:id',
  'www.example.com/products/*'
];

class MyScraper extends BaseScraper {
  protected async extractData(
    page: Page, 
    url: string,
    params: Record<string, string> // URL parameters extracted from pattern
  ): Promise<Partial<ScrapeResult>> {
    // Access extracted parameters (e.g., product ID)
    const productId = params.id;
    
    // Rest of your scraping logic...
    // ...
    
    return {
      title,
      price,
      description,
      imageUrl
    };
  }
}

// Register the scraper with the registry
const scraperInstance = new MyScraper();
ScraperRegistry.getInstance().register('myScraper', {
  scraper: scraperInstance,
  urlPatterns
});

// Export function-style API for backward compatibility
export async function scrape(url: string): Promise<ScrapeResult> {
  return scraperInstance.scrape(url);
}
```

## Command Line Usage

The CLI now supports automatic scraper selection:

```bash
# Scrape a URL (automatically selects the appropriate scraper)
pnpm selfheal scrape https://example.com/product/123

# List all available scrapers
pnpm selfheal list

# Generate a new scraper (siteId is now optional and will be auto-generated from the URL)
pnpm selfheal setup https://example.com/product/123
```

## Benefits

- **Simpler user experience**: Users don't need to know which scraper to use
- **URL-based navigation**: Dynamically handle different URL structures
- **Parameter extraction**: Extract and use values from URLs (IDs, slugs, etc.)
- **Automatic ID generation**: CLI can generate scraper IDs from domain names

## Implementation Details

The pattern matching system is implemented in three main components:

1. `urlPatternMatcher.ts`: Utilities for converting patterns to regex and matching URLs
2. `ScraperRegistry.ts`: Registry that manages scrapers and selects the appropriate one for a URL
3. `BaseScraper.ts`: Updated to support URL parameters extracted from patterns

These components work together to provide a seamless experience for both users and developers.