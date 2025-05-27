/**
 * Scraper loader - ensures all scrapers are loaded and registered
 * 
 * This module dynamically loads all scrapers in the directory.
 * It should be imported before any scraper operations to ensure all scrapers are registered.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load all .js files in the directory (will be .js after compilation)
export async function loadAllScrapers(): Promise<void> {
  try {
    // Read the directory
    const files = await fs.promises.readdir(__dirname);
    
    // Import each scraper file except this one and the registry
    for (const file of files) {
      if (file.endsWith('.js') && 
          file !== 'index.js' && 
          file !== 'loader.js' && 
          file !== 'ScraperRegistry.js' &&
          file !== 'BaseScraper.js') {
        try {
          console.log(`Loading scraper: ${file}`);
          await import(`./${file}`);
        } catch (error) {
          console.error(`Error loading scraper ${file}:`, error);
        }
      }
    }
    console.log('All scrapers loaded');
  } catch (error) {
    console.error('Error loading scrapers:', error);
  }
}