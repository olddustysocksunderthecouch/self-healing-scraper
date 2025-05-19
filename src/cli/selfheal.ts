#!/usr/bin/env node

import { Command } from 'commander';
import { scrape } from '../scraper/exampleSite';

// Create the CLI program
const program = new Command();

program.name('selfheal').description('Self-Healing Scraper CLI').version('0.1.0');

// Add the scrape command
program
  .command('scrape')
  .description('Scrape a website and output the result as JSON')
  .argument('[url]', 'URL to scrape (defaults to example site)')
  .option('-p, --pretty', 'Pretty print the JSON output')
  .action(async (url, options) => {
    try {
      const result = await scrape(url);

      // Output result as JSON
      if (options.pretty) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(JSON.stringify(result));
      }

      process.exit(0);
    } catch (error) {
      console.error('Error during scraping:');
      console.error(error);
      process.exit(1);
    }
  });

// Parse arguments and execute
if (require.main === module) {
  program.parse(process.argv);
}
