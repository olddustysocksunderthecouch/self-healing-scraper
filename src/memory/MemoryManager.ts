import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { ScrapeResult } from '../types/ScrapeResult.js';

/**
 * Centralized manager for all memory-related functionality.
 * Handles both scraper history and healing memory.
 */
export class MemoryManager {
  private readonly baseDir: string;
  private readonly scrapeHistoryDir: string;
  private readonly healingMemoryDir: string;

  constructor(baseDir: string = path.join(os.homedir(), '.selfheal')) {
    this.baseDir = baseDir;
    this.scrapeHistoryDir = path.join(baseDir, 'data');
    this.healingMemoryDir = path.join(baseDir, 'healing');
  }

  /**
   * Initialize memory directories
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.scrapeHistoryDir, { recursive: true });
    await fs.mkdir(this.healingMemoryDir, { recursive: true });
  }

  /**
   * Get the path to the scrape history file for a specific scraper
   */
  getScrapeHistoryPath(scraperId: string): string {
    return path.join(this.scrapeHistoryDir, `${scraperId}.json`);
  }

  /**
   * Get the path to the healing memory markdown file for a specific scraper
   */
  getHealingMemoryPath(scraperId: string): string {
    return path.join(this.healingMemoryDir, `${scraperId}_HEALING_MEMORY.md`);
  }

  /**
   * Save a scrape result to history
   */
  async saveScrapeResult(scraperId: string, result: ScrapeResult, timestamp: Date): Promise<void> {
    const filePath = this.getScrapeHistoryPath(scraperId);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Read existing history
    let history: (ScrapeResult & { timestamp: string })[] = [];
    try {
      const data = await fs.readFile(filePath, 'utf8');
      history = JSON.parse(data);
    } catch (error) {
      // File probably doesn't exist yet, start with empty array
    }

    // Add new result to history (at the beginning)
    history.unshift({
      ...result,
      timestamp: timestamp.toISOString(),
    });

    // Write updated history back to file
    await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf8');
  }

  /**
   * Export scrape history as JSONL
   */
  async exportScrapeHistoryAsJsonl(scraperId: string, outputPath?: string): Promise<string> {
    const filePath = this.getScrapeHistoryPath(scraperId);
    const defaultOutputPath = path.join(this.scrapeHistoryDir, `${scraperId}.jsonl`);
    const finalOutputPath = outputPath || defaultOutputPath;

    try {
      // Read history
      const data = await fs.readFile(filePath, 'utf8');
      const history = JSON.parse(data) as any[];

      // Convert to JSONL
      const jsonl = history.map(item => JSON.stringify(item)).join('\n');
      
      // Write to output file
      await fs.writeFile(finalOutputPath, jsonl, 'utf8');
      
      return finalOutputPath;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to export history: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get the last N scrape results for a specific scraper
   */
  async getLastScrapeResults(scraperId: string, count: number): Promise<ScrapeResult[]> {
    const filePath = this.getScrapeHistoryPath(scraperId);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const history = JSON.parse(data) as ScrapeResult[];
      return history.slice(0, count);
    } catch (error) {
      // File probably doesn't exist yet
      return [];
    }
  }

  /**
   * Initialize a healing memory markdown file for a scraper if it doesn't exist
   */
  async initializeHealingMemory(scraperId: string): Promise<void> {
    const filePath = this.getHealingMemoryPath(scraperId);
    
    try {
      await fs.access(filePath);
      // File exists, no need to create it
    } catch {
      // File doesn't exist, create it with template
      const template = this.createHealingMemoryTemplate(scraperId);
      await fs.writeFile(filePath, template, 'utf8');
    }
  }

  /**
   * Create a template for the healing memory markdown file
   */
  private createHealingMemoryTemplate(scraperId: string): string {
    return `# Healing Memory for ${scraperId}

This file tracks the healing history for the ${scraperId} scraper.
It is used by Claude to understand previous fixes and make more informed healing decisions.

## Healing Events

<!-- New healing events will be added here -->

`;
  }

  /**
   * Record a healing event in the healing memory markdown file
   */
  async recordHealingEvent(
    scraperId: string, 
    driftInfo: { missingFields: string[] }, 
    success: boolean, 
    changes: string,
    reasoning?: string
  ): Promise<void> {
    const filePath = this.getHealingMemoryPath(scraperId);
    
    // Initialize healing memory file if it doesn't exist
    await this.initializeHealingMemory(scraperId);

    // Read the existing file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Format the new healing event
    const timestamp = new Date().toISOString();
    const missingFields = driftInfo.missingFields.join(', ');
    const status = success ? 'SUCCESS' : 'FAILURE';
    
    const eventContent = `
### Healing Event - ${timestamp}

**Status**: ${status}
**Missing Fields**: ${missingFields}

${reasoning ? `**Reasoning**:\n\n${reasoning}\n` : ''}

**Changes**:

\`\`\`diff
${changes}
\`\`\`

`;

    // Insert the new event after the "Healing Events" header
    const updatedContent = content.replace(
      '## Healing Events\n\n',
      `## Healing Events\n\n${eventContent}`
    );

    // Write back to the file
    await fs.writeFile(filePath, updatedContent, 'utf8');
  }

  /**
   * Read the healing memory for a specific scraper
   */
  async getHealingMemory(scraperId: string): Promise<string> {
    const filePath = this.getHealingMemoryPath(scraperId);
    
    try {
      // Initialize if it doesn't exist
      await this.initializeHealingMemory(scraperId);
      
      // Read the file
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read healing memory: ${error.message}`);
      }
      throw error;
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Singleton accessor                                                        */
/* ------------------------------------------------------------------------- */

let singleton: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!singleton) {
    const baseDir = process.env.MEMORY_DIR ?? path.join(os.homedir(), '.selfheal');
    singleton = new MemoryManager(baseDir);
  }
  return singleton;
}