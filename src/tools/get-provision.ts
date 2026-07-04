/**
 * get_provision — Retrieve a specific provision from an Irish statute.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { resolveExistingStatuteId } from '../utils/statute-id.js';
import { generateResponseMetadata, type ToolResponse, type Citation } from '../utils/metadata.js';

export interface GetProvisionInput {
  document_id: string;
  part?: string;
  chapter?: string;
  section?: string;
  article?: string;
  provision_ref?: string;
}

export interface ProvisionResult {
  document_id: string;
  document_title: string;
  document_status: string;
  provision_ref: string;
  chapter: string | null;
  section: string;
  title: string | null;
  content: string;
}

interface ProvisionRow {
  document_id: string;
  document_title: string;
  document_status: string;
  provision_ref: string;
  chapter: string | null;
  section: string;
  title: string | null;
  content: string;
}

function buildProvisionCitation(row: ProvisionRow): Citation {
  return {
    canonical_ref: `${row.document_id}/${row.provision_ref}`,
    display_text: row.title
      ? `${row.title}, ${row.document_title}`
      : `${row.provision_ref}, ${row.document_title}`,
    lookup: { tool: 'get_provision', params: { document_id: row.document_id, provision_ref: row.provision_ref } },
  };
}

export async function getProvision(
  db: Database,
  input: GetProvisionInput
): Promise<ToolResponse<ProvisionResult | ProvisionResult[] | null>> {
  if (!input.document_id) {
    throw new Error('document_id is required');
  }

  const resolvedDocumentId = resolveExistingStatuteId(db, input.document_id) ?? input.document_id;

  const provisionRef = input.provision_ref ?? input.section ?? (input as any).article;

  // If no specific provision, return all provisions for the document
  if (!provisionRef) {
    const rows = db.prepare(`
      SELECT
        lp.document_id,
        ld.title as document_title,
        ld.status as document_status,
        lp.provision_ref,
        lp.chapter,
        lp.section,
        lp.title,
        lp.content
      FROM legal_provisions lp
      JOIN legal_documents ld ON ld.id = lp.document_id
      WHERE lp.document_id = ?
      ORDER BY lp.order_index
    `).all(resolvedDocumentId) as ProvisionRow[];

    return {
      results: rows,
      _meta: generateResponseMetadata(db),
      _citation: rows.length > 0
        ? { canonical_ref: resolvedDocumentId, display_text: rows[0].document_title, lookup: { tool: 'get_provision', params: { document_id: resolvedDocumentId } } }
        : undefined,
    };
  }

  const row = db.prepare(`
    SELECT
      lp.document_id,
      ld.title as document_title,
      ld.status as document_status,
      lp.provision_ref,
      lp.chapter,
      lp.section,
      lp.title,
      lp.content
    FROM legal_provisions lp
    JOIN legal_documents ld ON ld.id = lp.document_id
    WHERE lp.document_id = ? AND (lp.provision_ref = ? OR lp.section = ?)
  `).get(resolvedDocumentId, provisionRef, provisionRef) as ProvisionRow | undefined;

  if (!row) {
    return {
      results: null,
      _meta: generateResponseMetadata(db)
    };
  }

  return {
    results: row,
    _meta: generateResponseMetadata(db),
    _citation: buildProvisionCitation(row),
  };
}
