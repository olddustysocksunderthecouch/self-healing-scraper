#!/usr/bin/env node

import { scrape } from '../scraper/exampleSite.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'scrape') {
    try {
      // Optional URL can be passed as second argument
      const url = args[1];
      console.log('Starting scraper...');

      const result = await scrape(url);

      // Log the result as formatted JSON
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('Error during scraping:', error);
      process.exit(1);
    }
  } else {
    console.log(`
Self-Healing Scraper CLI
------------------------
Usage:
  selfheal scrape [url]    Scrape the target URL and output JSON result
    `);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
