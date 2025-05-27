#!/usr/bin/env node

import { getFileStore } from '../storage/fileStore.js';
import { DriftValidator } from '../validator/index.js';
import { scrapeUrl, canHandleUrl, getAvailableScrapers } from '../scraper/index.js';

const store = getFileStore();
const validator = new DriftValidator();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'scrape') {
    try {
      // Extract optional flags (currently only --heal)
      const healFlag = args.includes('--heal');

      // Filter out flags from positional args list to get URL
      const positional = args.filter((a) => !a.startsWith('--'));
      const url = positional[1];
      
      if (!url) {
        console.error('Error: URL is required for scrape command');
        console.log('Usage: selfheal scrape <url> [--heal]');
        process.exit(1);
        return;
      }

      // Check if URL can be handled by any registered scraper
      console.log(`Checking if any scraper can handle URL: ${url}`);
      const { canHandle, scraperId } = canHandleUrl(url);
      
      if (!canHandle) {
        console.log(`Warning: No pattern explicitly matches URL: ${url}`);
        console.log('Available scrapers:');
        getAvailableScrapers().forEach(id => console.log(`- ${id}`));
        
        // Extract domain from URL
        let domain = '';
        try {
          domain = new URL(url).hostname;
        } catch (e) {
          domain = url.split('/')[0];
        }
        
        console.log(`Attempting to find a scraper by domain: ${domain}`);
        console.log('Will use best-match scraper for this domain if available');
      }
      
      if (scraperId) {
        console.log(`Starting scraper for ${url} (using ${scraperId} scraper)...`);
      } else {
        console.log(`Starting scraper for ${url} (using best-match scraper)...`);
      }

      // Use the registry to select and run the appropriate scraper
      const { result, scraperId: usedScraperId } = await scrapeUrl(url);

      // Persist result
      await store.save(new Date(), result);

      // Drift validation
      const drift = validator.update(usedScraperId, result, ['title', 'price', 'description', 'imageUrl']);

      // Log the result as formatted JSON
      console.log(JSON.stringify({ ...result, drift, scraperId: usedScraperId }, null, 2));

      if (drift) {
        console.warn(`⚠️  Drift detected for ${usedScraperId}.`);

        if (healFlag) {
          console.log('🩹  --heal flag supplied – invoking healing orchestrator…');

          const { HealingOrchestrator } = await import('../healer/healOrchestrator.js');
          const orchestrator = new HealingOrchestrator();
          const healed = await orchestrator.heal();

          process.exitCode = healed ? 0 : 3; // 3 → healing failed
        } else {
          console.warn('Healing orchestrator not run (missing --heal flag).');
          process.exitCode = 2; // dedicated exit code meaning "drift"
        }
      } else {
        console.log('✅  Scrape successful, no drift detected.');
        process.exitCode = 0;
      }
      return;
    } catch (error) {
      console.error('Error during scraping:', error);
      process.exit(1);
    }
  } else if (command === 'setup' || command === 'scraper-setup') {
    const url = args[1];
    let siteId = args[2]; // Make siteId optional

    if (!url) {
      console.error('Usage: selfheal setup <url> [siteId]');
      process.exit(1);
      return;
    }

    // If siteId is not provided, try to derive it from the URL
    if (!siteId) {
      try {
        const urlObj = new URL(url);
        // Extract domain without www. prefix and remove .com, .org, etc.
        siteId = urlObj.hostname.replace(/^www\./, '').split('.')[0] + 'Scraper';
        console.log(`Auto-generated scraper ID: ${siteId}`);
      } catch (error) {
        console.error('Could not parse URL to auto-generate scraper ID. Please provide one.');
        process.exit(1);
        return;
      }
    }

    try {
      const { SetupOrchestrator } = await import('../healer/setupOrchestrator.js');
      const orchestrator = new SetupOrchestrator();
      const ok = await orchestrator.setup(siteId, url);
      process.exitCode = ok ? 0 : 4; // 4 = setup failed
      return;
    } catch (err) {
      console.error('Setup failed:', err);
      process.exit(1);
      return;
    }
  } else if (command === 'list') {
    // List all available scrapers
    console.log('Available scrapers:');
    const scrapers = getAvailableScrapers();
    
    if (scrapers.length === 0) {
      console.log('No scrapers registered');
    } else {
      scrapers.forEach(id => console.log(`- ${id}`));
    }
    return;
  } else {
    console.log(`
Self-Healing Scraper CLI
------------------------
Usage:
  selfheal scrape <url> [--heal]      Scrape the target URL and output JSON.
                                     Automatically selects the appropriate scraper.
                                     With --heal the LLM repair pipeline
                                     runs on drift.

  selfheal setup <url> [siteId]       Generate a new scraper for <url>.
                                     Saves HTML snapshot & calls Claude Code.
                                     If siteId is not provided, it will be
                                     auto-generated from the URL domain.

  selfheal list                       List all available scrapers.
`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
