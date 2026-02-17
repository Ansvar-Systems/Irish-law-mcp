import { describe, it, expect } from 'vitest';
import { buildTools } from '../../src/tools/registry.js';

describe('tool registry', () => {
  it('includes about tool when context is provided', () => {
    const tools = buildTools({ version: '1.0.0', fingerprint: 'abc', dbBuilt: 'now' });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain('about');
  });

  it('omits about tool when context is not provided', () => {
    const tools = buildTools();
    const names = tools.map((tool) => tool.name);
    expect(names).not.toContain('about');
  });
});
