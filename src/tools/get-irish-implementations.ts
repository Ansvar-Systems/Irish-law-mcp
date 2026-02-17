/**
 * get_irish_implementations — Find Irish statutes implementing an EU directive/regulation.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface GetIrishImplementationsInput {
  eu_document_id: string;
  primary_only?: boolean;
  in_force_only?: boolean;
}

export interface GetIrishImplementationsResult {
  eu_document_id: string;
  eu_title?: string;
  implementations: Array<{
    document_id: string;
    title: string;
    status: string;
    reference_type: string;
    is_primary: boolean;
  }>;
  total: number;
}

export async function getIrishImplementations(
  db: Database,
  input: GetIrishImplementationsInput
): Promise<ToolResponse<GetIrishImplementationsResult>> {
  if (!input.eu_document_id) {
    throw new Error('eu_document_id is required');
  }

  // Get EU document title
  const euDoc = db.prepare(
    'SELECT id, title FROM eu_documents WHERE id = ?'
  ).get(input.eu_document_id) as { id: string; title: string } | undefined;

  let sql = `
    SELECT
      er.document_id,
      ld.title,
      ld.status,
      er.reference_type,
      er.is_primary_implementation
    FROM eu_references er
    JOIN legal_documents ld ON ld.id = er.document_id
    WHERE er.eu_document_id = ?
  `;
  const params: (string | number)[] = [input.eu_document_id];

  if (input.primary_only) {
    sql += ` AND er.is_primary_implementation = 1`;
  }
  if (input.in_force_only) {
    sql += ` AND ld.status = 'in_force'`;
  }

  sql += ` ORDER BY er.is_primary_implementation DESC, ld.title`;

  interface Row {
    document_id: string; title: string; status: string;
    reference_type: string; is_primary_implementation: number;
  }

  const rows = db.prepare(sql).all(...params) as Row[];
  const byDocument = new Map<string, {
    document_id: string;
    title: string;
    status: string;
    reference_type: string;
    is_primary: boolean;
  }>();

  for (const row of rows) {
    const existing = byDocument.get(row.document_id);
    const incomingIsPrimary = row.is_primary_implementation === 1;

    if (!existing) {
      byDocument.set(row.document_id, {
        document_id: row.document_id,
        title: row.title,
        status: row.status,
        reference_type: row.reference_type,
        is_primary: incomingIsPrimary,
      });
      continue;
    }

    // Prefer direct implementation labels if multiple references exist.
    if (existing.reference_type !== 'implements' && row.reference_type === 'implements') {
      existing.reference_type = 'implements';
    }
    existing.is_primary = existing.is_primary || incomingIsPrimary;
  }

  const implementations = Array.from(byDocument.values()).sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });

  return {
    results: {
      eu_document_id: input.eu_document_id,
      eu_title: euDoc?.title,
      implementations,
      total: implementations.length,
    },
    _metadata: generateResponseMetadata(db),
  };
}
