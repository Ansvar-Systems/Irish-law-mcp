import { describe, it, expect } from 'vitest';
import { parseCitation } from '../../src/citation/parser.js';

describe('parseCitation', () => {
  it('parses full citation format', () => {
    const parsed = parseCitation('Section 1, Data Protection Act 2018');
    expect(parsed.valid).toBe(true);
    expect(parsed.section).toBe('1');
    expect(parsed.title).toBe('Data Protection Act');
    expect(parsed.year).toBe(2018);
  });

  it('parses subsection and paragraph in short format', () => {
    const parsed = parseCitation('s. 3(1)(a) DPA 2018');
    expect(parsed.valid).toBe(true);
    expect(parsed.section).toBe('3');
    expect(parsed.subsection).toBe('1');
    expect(parsed.paragraph).toBe('a');
  });

  it('returns invalid for unsupported citation', () => {
    const parsed = parseCitation('not-a-citation');
    expect(parsed.valid).toBe(false);
    expect(parsed.type).toBe('unknown');
  });
});
