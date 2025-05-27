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

// Load all scraper files in the directory
export async function loadAllScrapers(): Promise<string[]> {
  const loadedScrapers: string[] = [];
  
  try {
    // Read the directory
    const files = await fs.promises.readdir(__dirname);
    
    // Filter files to find scrapers - they'll have .js extension in production build
    // and .ts extension in development
    const scraperFiles = files.filter(file => {
      const ext = path.extname(file);
      const baseName = path.basename(file, ext);
      
      // Skip non-scraper files
      if (baseName === 'index' || 
          baseName === 'loader' || 
          baseName === 'ScraperRegistry' ||
          baseName === 'BaseScraper') {
        return false;
      }
      
      // Check for JS files in production build
      if (ext === '.js') {
        return true;
      }
      
      // Check for TS files in development
      if (ext === '.ts' && !file.endsWith('.d.ts')) {
        return true;
      }
      
      return false;
    });
    
    // Import each scraper file
    for (const file of scraperFiles) {
      try {
        // Extract extension
        const ext = path.extname(file);
        const baseName = path.basename(file, ext);
        
        // Ensure we use .js extension for imports, regardless of original file
        console.log(`Loading scraper: ${baseName}`);
        
        // In production, we import .js files
        await import(`./${baseName}.js`);
        loadedScrapers.push(baseName);
      } catch (error) {
        console.error(`Error loading scraper ${file}:`, error);
      }
    }
    
    if (loadedScrapers.length > 0) {
      console.log(`Loaded ${loadedScrapers.length} scrapers: ${loadedScrapers.join(', ')}`);
    } else {
      console.warn('No scrapers found to load!');
    }
  } catch (error) {
    console.error('Error loading scrapers:', error);
  }
  
  return loadedScrapers;
}