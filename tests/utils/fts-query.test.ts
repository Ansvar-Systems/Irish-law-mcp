import { describe, it, expect } from 'vitest';
import { buildFtsQueryVariants } from '../../src/utils/fts-query.js';

describe('buildFtsQueryVariants', () => {
  it('keeps explicit FTS syntax unchanged', () => {
    const query = '"data protection" AND processing';
    const built = buildFtsQueryVariants(query);
    expect(built.primary).toBe(query);
    expect(built.fallback).toBeUndefined();
  });

  it('builds prefix and fallback OR variants for plain terms', () => {
    const built = buildFtsQueryVariants('data protection');
    expect(built.primary).toBe('"data"* "protection"*');
    expect(built.fallback).toBe('data* OR protection*');
  });

  it('removes punctuation from non-explicit queries', () => {
    const built = buildFtsQueryVariants('criminal, fraud!');
    expect(built.primary).toBe('"criminal"* "fraud"*');
    expect(built.fallback).toBe('criminal* OR fraud*');
  });
});
