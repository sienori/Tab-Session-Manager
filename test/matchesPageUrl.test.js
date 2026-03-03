import { describe, it, expect } from 'vitest';

// Extract the pure function logic for testing
const matchesPageUrl = (pageUrl, urlPattern) => {
  const pattern = urlPattern
    .trim()
    .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, match => (match === "*" ? ".*" : "\\" + match));
  if (pattern === "") return false;
  return RegExp("^" + pattern + "$").test(pageUrl);
};

describe('matchesPageUrl', () => {
  it('should match exact URL', () => {
    expect(matchesPageUrl('https://example.com', 'https://example.com')).toBe(true);
    expect(matchesPageUrl('https://other.com', 'https://example.com')).toBe(false);
  });

  it('should match wildcard pattern *', () => {
    expect(matchesPageUrl('https://example.com/page', 'https://example.com/*')).toBe(true);
    expect(matchesPageUrl('https://example.com/anything/else', 'https://example.com/*')).toBe(true);
    expect(matchesPageUrl('https://other.com/page', 'https://example.com/*')).toBe(false);
  });

  it('should handle empty pattern', () => {
    expect(matchesPageUrl('https://example.com', '')).toBe(false);
  });

  it('should handle pattern with multiple wildcards', () => {
    expect(matchesPageUrl('https://example.com/path/to/page', '*example.com*')).toBe(true);
    expect(matchesPageUrl('https://other.com/path', '*example.com*')).toBe(false);
  });

  it('should handle domain matching with wildcard prefix', () => {
    // The * is converted to .*, so *.example.com becomes .*.example.com
    // The . is escaped to \\., so the pattern is .*\.example\.com
    // This won't match https://sub.example.com/page because the regex ends with "com$"
    // which requires the URL to end with "com", not "/page"
    // It WILL match if the URL ends exactly with the domain
    expect(matchesPageUrl('https://sub.example.com', '*.example.com')).toBe(true);
    expect(matchesPageUrl('https://example.com', '*.example.com')).toBe(false); // requires at least one char before the dot
  });

  it('should escape special regex characters', () => {
    expect(matchesPageUrl('https://example.com/test[1]', 'https://example.com/test[1]')).toBe(true);
    expect(matchesPageUrl('https://example.com/test(1)', 'https://example.com/test(1)')).toBe(true);
  });

  it('should handle pattern with leading/trailing whitespace', () => {
    expect(matchesPageUrl('https://example.com', '  https://example.com  ')).toBe(true);
  });
});
