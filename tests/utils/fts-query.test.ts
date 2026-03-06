import { describe, it, expect } from 'vitest';
import { buildFtsQueryVariants, sanitizeFtsInput } from '../../src/utils/fts-query.js';

describe('buildFtsQueryVariants', () => {
  it('keeps explicit FTS syntax unchanged (boolean passthrough)', () => {
    const query = '"data protection" AND processing';
    const sanitized = sanitizeFtsInput(query);
    const variants = buildFtsQueryVariants(sanitized);
    expect(variants).toHaveLength(1);
    expect(variants[0]).toBe(sanitized);
  });

  it('builds multiple variants for plain terms', () => {
    const variants = buildFtsQueryVariants(sanitizeFtsInput('data protection'));
    expect(variants.length).toBeGreaterThanOrEqual(2);
    // First variant should be exact phrase
    expect(variants[0]).toBe('"data protection"');
    // Last variant should be broadest (OR)
    expect(variants[variants.length - 1]).toBe('data OR protection');
  });

  it('removes punctuation from non-explicit queries', () => {
    const variants = buildFtsQueryVariants(sanitizeFtsInput('criminal, fraud!'));
    expect(variants.length).toBeGreaterThanOrEqual(2);
    // First variant should be exact phrase
    expect(variants[0]).toBe('"criminal fraud"');
  });

  it('preserves trailing wildcard for prefix search', () => {
    const sanitized = sanitizeFtsInput('protect*');
    expect(sanitized).toContain('*');
  });
});
