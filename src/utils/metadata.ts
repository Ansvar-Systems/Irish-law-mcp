/**
 * Response metadata for Irish Law MCP tool responses.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface Citation {
  canonical_ref: string;
  display_text: string;
  lookup: {
    tool: string;
    params: Record<string, string>;
  };
}

export interface ResponseMetadata {
  data_age: string;
  disclaimer: string;
  source_authority: string;
  note?: string;
  query_strategy?: string;
}

export interface ToolResponse<T> {
  results: T;
  _meta: ResponseMetadata;
  _citation?: Citation;
}

export function generateResponseMetadata(
  db?: InstanceType<typeof Database>
): ResponseMetadata {
  let data_age = 'unknown';

  if (db) {
    try {
      const row = db.prepare("SELECT value FROM db_metadata WHERE key = 'built_at'").get() as { value: string } | undefined;
      if (row?.value) {
        const builtDate = new Date(row.value);
        data_age = builtDate.toISOString().slice(0, 10);
      }
    } catch {
      // Ignore metadata read errors
    }
  }

  return {
    data_age,
    disclaimer:
      'This data is derived from eISB open data. ' +
      'Verify against official publications when legal certainty is required.',
    source_authority: 'The National Archives (eISB)',
  };
}
