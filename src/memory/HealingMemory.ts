import { promises as fs } from 'fs';
import { getMemoryManager } from './MemoryManager.js';

interface HealingEvent {
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE';
  missingFields: string[];
  reasoning?: string;
  changes: string;
}

/**
 * Specialized class for working with healing memory markdown files.
 * Provides methods to parse, update, and extract information from markdown.
 */
export class HealingMemory {
  private readonly scraperId: string;
  private readonly memoryManager = getMemoryManager();

  constructor(scraperId: string) {
    this.scraperId = scraperId;
  }

  /**
   * Get the full path to the healing memory markdown file
   */
  getFilePath(): string {
    return this.memoryManager.getHealingMemoryPath(this.scraperId);
  }

  /**
   * Initialize a new healing memory file if it doesn't exist
   */
  async initialize(): Promise<void> {
    await this.memoryManager.initializeHealingMemory(this.scraperId);
  }

  /**
   * Add a new healing event to the memory file
   */
  async addEvent(
    driftInfo: { missingFields: string[] },
    success: boolean,
    changes: string,
    reasoning?: string
  ): Promise<void> {
    await this.memoryManager.recordHealingEvent(
      this.scraperId,
      driftInfo,
      success,
      changes,
      reasoning
    );
  }

  /**
   * Extract all healing events from the memory file
   */
  async getEvents(): Promise<HealingEvent[]> {
    // Initialize if needed
    await this.initialize();
    
    // Read the markdown file
    const filePath = this.getFilePath();
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse events using regex
    const eventRegex = /### Healing Event - (.+?)\n\n\*\*Status\*\*: (.+?)\n\*\*Missing Fields\*\*: (.+?)\n\n(?:\*\*Reasoning\*\*:\n\n(.+?)\n\n)?\*\*Changes\*\*:\n\n```diff\n([\s\S]+?)```/g;
    
    const events: HealingEvent[] = [];
    let match;
    
    while ((match = eventRegex.exec(content)) !== null) {
      events.push({
        timestamp: match[1],
        status: match[2] as 'SUCCESS' | 'FAILURE',
        missingFields: match[3].split(',').map(f => f.trim()),
        reasoning: match[4],
        changes: match[5]
      });
    }
    
    return events;
  }

  /**
   * Find similar healing events based on missing fields
   */
  async findSimilarEvents(missingFields: string[]): Promise<HealingEvent[]> {
    const events = await this.getEvents();
    
    // Find events with at least one matching missing field
    return events.filter(event => 
      event.missingFields.some(field => 
        missingFields.includes(field)
      )
    );
  }

  /**
   * Get the most recent successful healing event
   */
  async getLastSuccessfulEvent(): Promise<HealingEvent | null> {
    const events = await this.getEvents();
    return events.find(event => event.status === 'SUCCESS') || null;
  }

  /**
   * Generate a context for Claude to use in healing
   * This extracts relevant past healing events that might help with the current issue
   */
  async generateHealingContext(missingFields: string[]): Promise<string> {
    // Find similar events
    const similarEvents = await this.findSimilarEvents(missingFields);
    
    if (similarEvents.length === 0) {
      return "No previous healing events found for these missing fields.";
    }
    
    // Build context string
    let context = `# Previous healing events for ${this.scraperId}\n\n`;
    context += `The following healing events might be relevant to the current issue:\n\n`;
    
    // Add up to 3 most recent similar events
    similarEvents.slice(0, 3).forEach(event => {
      context += `## Event from ${event.timestamp}\n\n`;
      context += `Status: ${event.status}\n`;
      context += `Missing fields: ${event.missingFields.join(', ')}\n\n`;
      
      if (event.reasoning) {
        context += `### Reasoning\n\n${event.reasoning}\n\n`;
      }
      
      context += `### Changes\n\n\`\`\`diff\n${event.changes}\n\`\`\`\n\n`;
    });
    
    return context;
  }
}

/**
 * Factory function to get a HealingMemory instance for a scraper
 */
export function getHealingMemory(scraperId: string): HealingMemory {
  return new HealingMemory(scraperId);
}