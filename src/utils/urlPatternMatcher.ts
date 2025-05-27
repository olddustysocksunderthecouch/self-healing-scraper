/**
 * URL pattern matcher utility
 * 
 * Supports pattern formats:
 * - Exact matches: "example.com/path"
 * - Wildcard matches: "example.com/wildcard/subpath"
 * - Parameter matches: "example.com/param/subpath"
 * - Domain-only matches: "example.com"
 */

/**
 * Converts a URL pattern to a regular expression
 * @param pattern URL pattern with optional wildcards (*) or parameters (:param)
 * @returns Regular expression that matches the pattern
 */
export function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and :
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Convert wildcards to regex pattern
    .replace(/\*/g, '([^/]*)')
    // Convert parameters to named capture groups
    .replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)');
  
  // If pattern doesn't have protocol, make it flexible
  const withProtocol = pattern.includes('://') 
    ? escaped 
    : '(?:https?://)?(?:www\\.)?\\b' + escaped;
  
  // Match the entire URL
  const regex = new RegExp(`^${withProtocol}(?:/)?$`);
  console.log(`Pattern: ${pattern} -> Regex: ${regex}`);
  return regex;
}

/**
 * Checks if a URL matches a pattern
 * @param url URL to check
 * @param pattern Pattern to match against
 * @returns Boolean indicating if URL matches pattern and extracted parameters
 */
export function matchUrlPattern(url: string, pattern: string): { 
  matches: boolean; 
  params: Record<string, string>;
} {
  const regex = patternToRegex(pattern);
  const match = url.match(regex);
  
  if (!match) {
    return { matches: false, params: {} };
  }
  
  // Extract named parameters
  const params: Record<string, string> = {};
  
  if (match.groups) {
    Object.entries(match.groups).forEach(([key, value]) => {
      params[key] = value;
    });
  }
  
  return { matches: true, params };
}

/**
 * Finds the best matching pattern from a list of patterns
 * @param url URL to match
 * @param patterns List of patterns to match against
 * @returns The best matching pattern and extracted parameters, or null if no match
 */
export function findBestMatch(url: string, patterns: string[]): { 
  pattern: string; 
  params: Record<string, string> 
} | null {
  // Sort patterns by specificity (most specific first)
  // - More segments = more specific
  // - Exact segments > parameter segments > wildcard segments
  const sortedPatterns = [...patterns].sort((a, b) => {
    const aSegments = a.split('/').length;
    const bSegments = b.split('/').length;
    
    if (aSegments !== bSegments) {
      return bSegments - aSegments; // More segments = more specific
    }
    
    const aWildcards = (a.match(/[*:]/g) || []).length;
    const bWildcards = (b.match(/[*:]/g) || []).length;
    
    return aWildcards - bWildcards; // Fewer wildcards = more specific
  });
  
  // Find first matching pattern
  for (const pattern of sortedPatterns) {
    const { matches, params } = matchUrlPattern(url, pattern);
    if (matches) {
      return { pattern, params };
    }
  }
  
  return null;
}