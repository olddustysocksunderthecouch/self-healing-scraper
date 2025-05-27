import { jest } from '@jest/globals';
import { MemoryManager } from '../../src/memory/MemoryManager';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `selfheal-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    // Initialize memory manager with test directory
    memoryManager = new MemoryManager(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('initialize creates required directories', async () => {
    await memoryManager.initialize();
    
    // Check that directories were created
    const scrapeHistoryDir = path.join(testDir, 'data');
    const healingMemoryDir = path.join(testDir, 'healing');
    
    expect(fs.existsSync(scrapeHistoryDir)).toBe(true);
    expect(fs.existsSync(healingMemoryDir)).toBe(true);
  });

  test('saveScrapeResult saves result to JSON file', async () => {
    await memoryManager.initialize();
    
    const scraperId = 'testScraper';
    const result = {
      title: 'Test Title',
      price: '$10.00',
      description: 'Test Description',
      imageUrl: 'http://example.com/image.jpg',
      timestamp: new Date().toISOString()
    };
    
    await memoryManager.saveScrapeResult(scraperId, result, new Date());
    
    // Check that file was created
    const filePath = memoryManager.getScrapeHistoryPath(scraperId);
    expect(fs.existsSync(filePath)).toBe(true);
    
    // Check file contents
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].title).toBe('Test Title');
  });

  test('getLastScrapeResults returns most recent results', async () => {
    await memoryManager.initialize();
    
    const scraperId = 'testScraper';
    const result1 = {
      title: 'Test Title 1',
      price: '$10.00',
      description: 'Test Description 1',
      imageUrl: 'http://example.com/image1.jpg',
      timestamp: new Date().toISOString()
    };
    
    const result2 = {
      title: 'Test Title 2',
      price: '$20.00',
      description: 'Test Description 2',
      imageUrl: 'http://example.com/image2.jpg',
      timestamp: new Date().toISOString()
    };
    
    // Save results with a delay to ensure order
    await memoryManager.saveScrapeResult(scraperId, result1, new Date());
    await new Promise(resolve => setTimeout(resolve, 10));
    await memoryManager.saveScrapeResult(scraperId, result2, new Date());
    
    // Get most recent result
    const results = await memoryManager.getLastScrapeResults(scraperId, 1);
    
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Test Title 2');
  });

  test('exportScrapeHistoryAsJsonl exports to JSONL format', async () => {
    await memoryManager.initialize();
    
    const scraperId = 'testScraper';
    const result1 = {
      title: 'Test Title 1',
      price: '$10.00',
      description: 'Test Description 1',
      imageUrl: 'http://example.com/image1.jpg',
      timestamp: new Date().toISOString()
    };
    
    const result2 = {
      title: 'Test Title 2',
      price: '$20.00',
      description: 'Test Description 2',
      imageUrl: 'http://example.com/image2.jpg',
      timestamp: new Date().toISOString()
    };
    
    // Save multiple results
    await memoryManager.saveScrapeResult(scraperId, result1, new Date());
    await memoryManager.saveScrapeResult(scraperId, result2, new Date());
    
    // Export to JSONL
    const outputPath = path.join(testDir, 'export.jsonl');
    const exportPath = await memoryManager.exportScrapeHistoryAsJsonl(scraperId, outputPath);
    
    // Check export file exists
    expect(fs.existsSync(exportPath)).toBe(true);
    
    // Check file contents - should be JSONL format (one JSON object per line)
    const fileContent = fs.readFileSync(exportPath, 'utf8');
    const lines = fileContent.trim().split('\n');
    
    expect(lines.length).toBe(2);
    
    // Parse each line
    const parsed1 = JSON.parse(lines[0]);
    const parsed2 = JSON.parse(lines[1]);
    
    expect(parsed1.title).toEqual(expect.stringMatching(/Test Title [12]/));
    expect(parsed2.title).toEqual(expect.stringMatching(/Test Title [12]/));
  });
});