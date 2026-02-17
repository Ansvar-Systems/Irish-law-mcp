import { describe, it, expect } from 'vitest';
import { normalizeAsOfDate } from '../../src/utils/as-of-date.js';

describe('normalizeAsOfDate', () => {
  it('returns undefined for empty-ish input', () => {
    expect(normalizeAsOfDate(undefined)).toBeUndefined();
    expect(normalizeAsOfDate('')).toBeUndefined();
    expect(normalizeAsOfDate('   ')).toBeUndefined();
  });

  it('accepts a valid ISO date', () => {
    expect(normalizeAsOfDate('2025-12-31')).toBe('2025-12-31');
  });

  it('rejects invalid formats and impossible dates', () => {
    expect(() => normalizeAsOfDate('31-12-2025')).toThrow();
    expect(() => normalizeAsOfDate('2025-02-30')).toThrow();
  });
});
