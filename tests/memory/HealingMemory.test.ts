import { jest } from '@jest/globals';
import { HealingMemory } from '../../src/memory/HealingMemory';
import { MemoryManager } from '../../src/memory/MemoryManager';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock the getMemoryManager function
jest.mock('../../src/memory/MemoryManager', () => {
  const original = jest.requireActual('../../src/memory/MemoryManager');
  return {
    ...original,
    getMemoryManager: jest.fn()
  };
});

describe('HealingMemory', () => {
  let healingMemory: HealingMemory;
  let testDir: string;
  let memoryManager: MemoryManager;
  
  beforeEach(() => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `selfheal-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create a memory manager with the test directory
    memoryManager = new MemoryManager(testDir);
    
    // Mock the getMemoryManager function to return our test instance
    (MemoryManager as unknown as { getMemoryManager: jest.Mock }).getMemoryManager.mockReturnValue(memoryManager);
    
    // Initialize memory manager
    memoryManager.initialize();
    
    // Create healing memory with test scraper ID
    healingMemory = new HealingMemory('testScraper');
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  test('initialize creates healing memory file if it does not exist', async () => {
    await healingMemory.initialize();
    
    const filePath = healingMemory.getFilePath();
    expect(fs.existsSync(filePath)).toBe(true);
    
    // Check file contents
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('# Healing Memory for testScraper');
  });

  test('addEvent adds a healing event to the memory file', async () => {
    await healingMemory.initialize();
    
    const driftInfo = { missingFields: ['price', 'title'] };
    const changes = 'test changes';
    const reasoning = 'test reasoning';
    
    await healingMemory.addEvent(driftInfo, true, changes, reasoning);
    
    // Check file contents
    const content = fs.readFileSync(healingMemory.getFilePath(), 'utf8');
    
    expect(content).toContain('# Healing Memory for testScraper');
    expect(content).toContain('### Healing Event');
    expect(content).toContain('**Status**: SUCCESS');
    expect(content).toContain('**Missing Fields**: price, title');
    expect(content).toContain('**Reasoning**:');
    expect(content).toContain('test reasoning');
    expect(content).toContain('**Changes**:');
    expect(content).toContain('test changes');
  });

  test('getEvents parses events from the memory file', async () => {
    await healingMemory.initialize();
    
    // Add multiple events
    await healingMemory.addEvent(
      { missingFields: ['price'] }, 
      true, 
      'change 1', 
      'reasoning 1'
    );
    
    await healingMemory.addEvent(
      { missingFields: ['title'] }, 
      false, 
      'change 2', 
      'reasoning 2'
    );
    
    // Get events
    const events = await healingMemory.getEvents();
    
    expect(events.length).toBe(2);
    
    // Events are returned in the order they appear in the file (newest first)
    expect(events[0].status).toBe('FAILURE');
    expect(events[0].missingFields).toEqual(['title']);
    expect(events[0].changes).toBe('change 2');
    expect(events[0].reasoning).toBe('reasoning 2');
    
    expect(events[1].status).toBe('SUCCESS');
    expect(events[1].missingFields).toEqual(['price']);
    expect(events[1].changes).toBe('change 1');
    expect(events[1].reasoning).toBe('reasoning 1');
  });

  test('findSimilarEvents finds events with matching missing fields', async () => {
    await healingMemory.initialize();
    
    // Add events with different missing fields
    await healingMemory.addEvent(
      { missingFields: ['price'] }, 
      true, 
      'price fix', 
      'fixed price'
    );
    
    await healingMemory.addEvent(
      { missingFields: ['title'] }, 
      true, 
      'title fix', 
      'fixed title'
    );
    
    await healingMemory.addEvent(
      { missingFields: ['price', 'description'] }, 
      true, 
      'price and description fix', 
      'fixed price and description'
    );
    
    // Find events with missing price
    const priceEvents = await healingMemory.findSimilarEvents(['price']);
    expect(priceEvents.length).toBe(2);
    
    // Find events with missing title
    const titleEvents = await healingMemory.findSimilarEvents(['title']);
    expect(titleEvents.length).toBe(1);
    
    // Find events with missing description
    const descEvents = await healingMemory.findSimilarEvents(['description']);
    expect(descEvents.length).toBe(1);
    
    // Find events with missing price or title
    const combinedEvents = await healingMemory.findSimilarEvents(['price', 'title']);
    expect(combinedEvents.length).toBe(3);
  });

  test('generateHealingContext creates context for Claude', async () => {
    await healingMemory.initialize();
    
    // Add events
    await healingMemory.addEvent(
      { missingFields: ['price'] }, 
      true, 
      'price fix', 
      'fixed price'
    );
    
    // Generate context
    const context = await healingMemory.generateHealingContext(['price']);
    
    expect(context).toContain('# Previous healing events for testScraper');
    expect(context).toContain('The following healing events might be relevant');
    expect(context).toContain('## Event from');
    expect(context).toContain('Status: SUCCESS');
    expect(context).toContain('Missing fields: price');
    expect(context).toContain('### Reasoning');
    expect(context).toContain('fixed price');
    expect(context).toContain('### Changes');
    expect(context).toContain('price fix');
  });

  test('generateHealingContext handles no matching events', async () => {
    await healingMemory.initialize();
    
    // Generate context without any events
    const context = await healingMemory.generateHealingContext(['price']);
    
    expect(context).toBe('No previous healing events found for these missing fields.');
  });
});