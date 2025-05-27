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
      // Extract optional flags (currently only --heal)
      const healFlag = args.includes('--heal');

      // Filter out flags from positional args list to get URL
      const positional = args.filter((a) => !a.startsWith('--'));
      const url = positional[1];
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
        console.warn(`⚠️  Drift detected for ${siteId}.`);

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
    const siteId = args[1];
    const url = args[2];

    if (!siteId || !url) {
      console.error('Usage: selfheal setup <siteId> <url>');
      process.exit(1);
      return;
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
  } else {
    console.log(`
Self-Healing Scraper CLI
------------------------
Usage:
  selfheal scrape <url> [--heal]      Scrape the target URL and output JSON.
                                     With --heal the LLM repair pipeline
                                     runs on drift.

  selfheal setup <siteId> <url>       Generate a new scraper for <url>.
                                     Saves HTML snapshot & calls Claude Code.
`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
