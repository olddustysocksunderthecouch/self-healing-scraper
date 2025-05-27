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
    // Convert wildcards to regex pattern - allows multiple path segments
    .replace(/\*/g, '([^/]*)');
  
  // If pattern doesn't have protocol, make it flexible
  let withProtocol = pattern.includes('://') 
    ? escaped 
    : '(?:https?://)?(?:www\\.)?\\b' + escaped;
  
  // Make the final part of the URL optional (trailing slash)
  withProtocol = withProtocol.replace(/\/\\\*$/, '(?:/.*)?'); // Handle trailing /* specially
  
  // Match the entire URL with optional trailing slash
  const regex = new RegExp(`^${withProtocol}(?:/)?$`);
  // console.log(`Pattern: ${pattern} -> Regex: ${regex}`);
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
  // Extract domain from URL for better matching
  let urlDomain = '';
  try {
    const urlObj = new URL(url);
    urlDomain = urlObj.hostname;
  } catch {
    // If parsing fails, use the original URL
    urlDomain = url.split('/')[0];
  }
  
  // Filter patterns to those matching the domain first
  const domainPatterns = patterns.filter(pattern => {
    // Extract domain from pattern (everything before first / or the whole string)
    const patternDomain = pattern.includes('/') ? pattern.split('/')[0] : pattern;
    
    // Check if this pattern's domain matches the URL domain
    // Handle www. variations and wildcards
    return patternDomain === urlDomain || 
           (patternDomain === 'www.' + urlDomain) || 
           (urlDomain === 'www.' + patternDomain) ||
           patternDomain.includes('*'); // Wildcard domains
  });
  
  // If we found domain-matching patterns, prioritize those
  const patternsToCheck = domainPatterns.length > 0 ? domainPatterns : patterns;
  
  // Sort patterns by specificity (most specific first)
  // - More segments = more specific
  // - Exact segments > parameter segments > wildcard segments
  const sortedPatterns = [...patternsToCheck].sort((a, b) => {
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
  
  // If we didn't find a match with specific patterns, try simpler domain-only patterns
  const domainOnlyPatterns = patterns.filter(p => !p.includes('/'));
  for (const pattern of domainOnlyPatterns) {
    // For domain-only patterns, be more lenient with matching
    if (url.includes(pattern)) {
      return { pattern, params: {} };
    }
  }
  
  return null;
}