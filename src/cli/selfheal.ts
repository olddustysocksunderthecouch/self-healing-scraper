#!/usr/bin/env node

import { scrape } from '../scraper/exampleSite.js';
import { getFileStore } from '../storage/fileStore.js';
import { DriftValidator } from '../validator/index.js';

const store = getFileStore();
const validator = new DriftValidator();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'scrape') {
    try {
      // Optional URL can be passed as second argument
      const url = args[1];
      console.log('Starting scraper...');

      const result = await scrape(url);

      // Persist result
      await store.save(new Date(), result);

      // Drift validation
      const siteId = process.env.SCRAPE_SITE_ID ?? 'exampleSite';
      const drift = validator.update(siteId, result, ['title', 'price', 'description', 'imageUrl']);

      // Log the result as formatted JSON
      console.log(JSON.stringify({ ...result, drift }, null, 2));

      if (drift) {
        console.warn(`⚠️  Drift detected for ${siteId}. Healing orchestrator should be triggered.`);
        process.exitCode = 2; // dedicated exit code meaning "drift"
      } else {
        console.log('✅  Scrape successful, no drift detected.');
        process.exitCode = 0;
      }
      return;
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
