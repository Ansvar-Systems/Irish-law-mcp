/**
 * search_preparatory_works — Search Irish legislative preparatory materials.
 * Requires a professional-tier database with the preparatory_works table.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { generateResponseMetadata, type ToolResponse, type Citation } from '../utils/metadata.js';
import { upgradeMessage } from '../capabilities.js';

export interface SearchPreparatoryWorksInput {
  query: string;
  document_id?: string;
  type?: string;
  limit?: number;
}

export interface PreparatoryWork {
  id: string | number;
  document_id: string | null;
  title: string | null;
  type: string | null;
  content: string;
  _citation: Citation;
}

export interface SearchPreparatoryWorksResult {
  query: string;
  works: PreparatoryWork[];
  total_results: number;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function tableExists(db: Database, name: string): boolean {
  const row = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
  ).get(name) as { 1: number } | undefined;
  return !!row;
}

export async function searchPreparatoryWorks(
  db: Database,
  input: SearchPreparatoryWorksInput
): Promise<ToolResponse<SearchPreparatoryWorksResult>> {
  if (!tableExists(db, 'preparatory_works')) {
    return {
      results: { query: input.query ?? '', works: [], total_results: 0 },
      _meta: {
        ...generateResponseMetadata(db),
        note: upgradeMessage('search_preparatory_works'),
      },
    };
  }

  if (!input.query?.trim()) {
    return {
      results: { query: '', works: [], total_results: 0 },
      _meta: generateResponseMetadata(db),
    };
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const hasFts = tableExists(db, 'preparatory_works_fts');

  interface RawRow {
    id: string | number;
    document_id: string | null;
    title: string | null;
    type: string | null;
    content: string;
  }

  let rows: RawRow[] = [];

  if (hasFts) {
    let sql = `
      SELECT pw.id, pw.document_id, pw.title, pw.type, pw.content
      FROM preparatory_works_fts
      JOIN preparatory_works pw ON pw.id = preparatory_works_fts.rowid
      WHERE preparatory_works_fts MATCH ?
    `;
    const params: (string | number)[] = [input.query.trim()];
    if (input.document_id) { sql += ' AND pw.document_id = ?'; params.push(input.document_id); }
    if (input.type) { sql += ' AND pw.type = ?'; params.push(input.type); }
    sql += ' ORDER BY bm25(preparatory_works_fts) LIMIT ?';
    params.push(limit);
    try {
      rows = db.prepare(sql).all(...params) as RawRow[];
    } catch {
      rows = [];
    }
  }

  if (rows.length === 0) {
    const likePattern = `%${input.query.trim()}%`;
    let sql = `
      SELECT id, document_id, title, type, content
      FROM preparatory_works
      WHERE (title LIKE ? OR content LIKE ?)
    `;
    const params: (string | number)[] = [likePattern, likePattern];
    if (input.document_id) { sql += ' AND document_id = ?'; params.push(input.document_id); }
    if (input.type) { sql += ' AND type = ?'; params.push(input.type); }
    sql += ' LIMIT ?';
    params.push(limit);
    rows = db.prepare(sql).all(...params) as RawRow[];
  }

  const works: PreparatoryWork[] = rows.map(row => ({
    id: row.id,
    document_id: row.document_id,
    title: row.title,
    type: row.type,
    content: row.content,
    _citation: {
      canonical_ref: `preparatory_works/${row.id}`,
      display_text: row.title ?? `Preparatory work ${row.id}`,
      lookup: {
        tool: 'search_preparatory_works',
        params: { query: String(row.id) },
      },
    },
  }));

  return {
    results: { query: input.query, works, total_results: works.length },
    _meta: generateResponseMetadata(db),
  };
}
