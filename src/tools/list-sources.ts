/**
 * list_sources — Enumerate available data sources, coverage, and provenance.
 */

import type Database from '@ansvar/mcp-sqlite';
import { readDbMetadata } from '../capabilities.js';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface ListSourcesResult {
  jurisdiction: string;
  sources: {
    name: string;
    authority: string;
    url: string;
    coverage: string;
    language: string;
    last_ingested: string;
    license: string;
  }[];
  statistics: {
    total_documents: number;
    total_provisions: number;
    eu_documents: number;
    eu_references: number;
    earliest_year: number | null;
    latest_year: number | null;
  };
  database: {
    tier: string;
    schema_version: string;
    built_at: string | null;
  };
}

function safeCount(db: InstanceType<typeof Database>, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

function safeScalar(db: InstanceType<typeof Database>, sql: string): number | null {
  try {
    const row = db.prepare(sql).get() as { val: number } | undefined;
    return row?.val ?? null;
  } catch {
    return null;
  }
}

export function listSources(db: InstanceType<typeof Database>): ToolResponse<ListSourcesResult> {
  const meta = readDbMetadata(db);

  return {
    results: {
      jurisdiction: 'Ireland (IE)',
      sources: [
        {
          name: 'eISB — electronic Irish Statute Book',
          authority: 'Office of the Attorney General',
          url: 'https://www.irishstatutebook.ie',
          coverage: 'Irish Acts and Statutory Instruments from 1922 to present',
          language: 'English',
          last_ingested: meta.built_at ?? 'unknown',
          license: 'Government open data',
        },
        {
          name: 'EUR-Lex (EU cross-references)',
          authority: 'Publications Office of the European Union',
          url: 'https://eur-lex.europa.eu',
          coverage: 'EU directives and regulations referenced by Irish legislation',
          language: 'English',
          last_ingested: meta.built_at ?? 'unknown',
          license: 'EU Open Data',
        },
      ],
      statistics: {
        total_documents: safeCount(db, 'SELECT COUNT(*) as count FROM legal_documents'),
        total_provisions: safeCount(db, 'SELECT COUNT(*) as count FROM legal_provisions'),
        eu_documents: safeCount(db, 'SELECT COUNT(*) as count FROM eu_documents'),
        eu_references: safeCount(db, 'SELECT COUNT(*) as count FROM eu_references'),
        earliest_year: safeScalar(
          db,
          "SELECT MIN(CAST(SUBSTR(issued_date, 1, 4) AS INTEGER)) as val FROM legal_documents WHERE issued_date IS NOT NULL"
        ),
        latest_year: safeScalar(
          db,
          "SELECT MAX(CAST(SUBSTR(issued_date, 1, 4) AS INTEGER)) as val FROM legal_documents WHERE issued_date IS NOT NULL"
        ),
      },
      database: {
        tier: meta.tier,
        schema_version: meta.schema_version,
        built_at: meta.built_at ?? null,
      },
    },
    _metadata: generateResponseMetadata(db),
  };
}
