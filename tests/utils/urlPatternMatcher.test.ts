import { 
  patternToRegex, 
  matchUrlPattern, 
  findBestMatch 
} from '../../src/utils/urlPatternMatcher.js';

describe('URL Pattern Matcher', () => {
  describe('patternToRegex', () => {
    it('converts simple patterns to regex', () => {
      const regex = patternToRegex('example.com');
      expect('https://example.com').toMatch(regex);
      expect('http://example.com').toMatch(regex);
      expect('https://www.example.com').toMatch(regex);
      expect('example.com').toMatch(regex);
      expect('notexample.com').not.toMatch(regex);
    });

    it('handles wildcards', () => {
      const regex = patternToRegex('example.com/*/page');
      expect('https://example.com/category/page').toMatch(regex);
      expect('https://example.com/123/page').toMatch(regex);
      expect('https://example.com/page').not.toMatch(regex);
    });

    it('handles named parameters', () => {
      const regex = patternToRegex('example.com/product/:id');
      expect('https://example.com/product/123').toMatch(regex);
      expect('https://example.com/product/abc').toMatch(regex);
      expect('https://example.com/product').not.toMatch(regex);
      expect('https://example.com/products/123').not.toMatch(regex);
    });

    it('handles patterns with protocol', () => {
      const regex = patternToRegex('https://example.com');
      expect('https://example.com').toMatch(regex);
      expect('http://example.com').not.toMatch(regex);
    });

    it('escapes special regex characters', () => {
      const regex = patternToRegex('example.com/search?q=test');
      expect('https://example.com/search?q=test').toMatch(regex);
    });
  });

  describe('matchUrlPattern', () => {
    it('matches simple patterns', () => {
      const { matches } = matchUrlPattern('https://example.com', 'example.com');
      expect(matches).toBe(true);
    });

    it('extracts parameters from URL', () => {
      const { matches, params } = matchUrlPattern(
        'https://example.com/product/123',
        'example.com/product/:id'
      );
      expect(matches).toBe(true);
      expect(params).toEqual({ id: '123' });
    });

    it('extracts multiple parameters', () => {
      const { matches, params } = matchUrlPattern(
        'https://example.com/category/electronics/product/123',
        'example.com/category/:category/product/:id'
      );
      expect(matches).toBe(true);
      expect(params).toEqual({ category: 'electronics', id: '123' });
    });

    it('handles non-matching URLs', () => {
      const { matches, params } = matchUrlPattern(
        'https://example.com/product',
        'example.com/product/:id'
      );
      expect(matches).toBe(false);
      expect(params).toEqual({});
    });
  });

  describe('findBestMatch', () => {
    const patterns = [
      'example.com',
      'example.com/product',
      'example.com/product/:id',
      'example.com/*/product',
      'example.com/category/:category/product/:id'
    ];

    it('finds the most specific match', () => {
      const match = findBestMatch(
        'https://example.com/category/electronics/product/123',
        patterns
      );
      expect(match).not.toBeNull();
      expect(match!.pattern).toBe('example.com/category/:category/product/:id');
      expect(match!.params).toEqual({ category: 'electronics', id: '123' });
    });

    it('prefers exact matches over wildcards', () => {
      const match = findBestMatch('https://example.com/product', patterns);
      expect(match).not.toBeNull();
      expect(match!.pattern).toBe('example.com/product');
    });

    it('prefers named parameters over wildcards', () => {
      const match = findBestMatch('https://example.com/product/123', patterns);
      expect(match).not.toBeNull();
      expect(match!.pattern).toBe('example.com/product/:id');
    });

    it('returns null for non-matching URLs', () => {
      const match = findBestMatch('https://example.com/category', patterns);
      expect(match).toBeNull();
    });
  });
});