import { ClaudeWrapper } from '../../src/healer/claudeWrapper.js';

// Create a simplified test that doesn't try to mock modules
describe('ClaudeWrapper', () => {
  it('parses JSON output correctly', () => {
    const wrapper = new ClaudeWrapper();
    
    // Test with valid JSON
    const validJson = '{"key": "value", "number": 42}';
    expect(wrapper.parseJsonOutput(validJson)).toEqual({ key: 'value', number: 42 });
    
    // Test with JSON embedded in other text
    const embeddedJson = 'Some text before {"key": "value"} some text after';
    expect(wrapper.parseJsonOutput(embeddedJson)).toEqual({ key: 'value' });
    
    // Test with invalid JSON
    const invalidJson = 'Not JSON at all';
    expect(wrapper.parseJsonOutput(invalidJson)).toBeNull();
  });
});