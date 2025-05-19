// Increase timeout for all tests since Puppeteer operations can take time
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Filter out puppeteer internal warnings and errors during tests
console.error = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('Puppeteer') || args[0].includes('Protocol error'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('Puppeteer') || args[0].includes('Protocol error'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Clean up after all tests
afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
