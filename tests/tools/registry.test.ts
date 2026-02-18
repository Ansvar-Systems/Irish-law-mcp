import { describe, it, expect } from 'vitest';
import { buildTools, TOOLS } from '../../src/tools/registry.js';

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

  it('exposes 12 standard tools (excluding about)', () => {
    expect(TOOLS).toHaveLength(12);
  });

  it('exposes 13 tools total when about is included', () => {
    const tools = buildTools({ version: '1.0.0', fingerprint: 'abc', dbBuilt: 'now' });
    expect(tools).toHaveLength(13);
  });

  it('includes all required standard law MCP tools', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toContain('search_legislation');
    expect(names).toContain('get_provision');
    expect(names).toContain('list_sources');
    expect(names).toContain('validate_citation');
    expect(names).toContain('check_currency');
    expect(names).toContain('get_eu_basis');
  });

  it('all tool names match ChatGPT constraint pattern', () => {
    const pattern = /^[a-zA-Z0-9_-]{1,64}$/;
    const allTools = buildTools({ version: '1.0.0', fingerprint: 'abc', dbBuilt: 'now' });
    for (const tool of allTools) {
      expect(tool.name, `Tool name "${tool.name}" must match ChatGPT pattern`).toMatch(pattern);
    }
  });

  it('every tool has a non-empty description', () => {
    const allTools = buildTools({ version: '1.0.0', fingerprint: 'abc', dbBuilt: 'now' });
    for (const tool of allTools) {
      expect(tool.description?.length, `Tool "${tool.name}" description is too short`).toBeGreaterThan(50);
    }
  });

  it('every tool has an inputSchema with type "object"', () => {
    const allTools = buildTools({ version: '1.0.0', fingerprint: 'abc', dbBuilt: 'now' });
    for (const tool of allTools) {
      expect(tool.inputSchema.type, `Tool "${tool.name}" inputSchema.type`).toBe('object');
    }
  });
});
