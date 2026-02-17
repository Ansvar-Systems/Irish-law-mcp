#!/usr/bin/env tsx
/**
 * Database builder for Irish Law MCP server.
 *
 * Builds the SQLite database from seed JSON files in data/seed/.
 *
 * Usage: npm run build:db
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DIR = path.resolve(__dirname, '../data/seed');
const EU_REFERENCE_SEED_PATH = path.resolve(__dirname, '../data/source/eu-references.json');
const DB_PATH = path.resolve(__dirname, '../data/database.db');

// ─── Seed file types ─────────────────────────────────────────────────────────

interface DocumentSeed {
  id: string;
  type: string;
  title: string;
  title_en?: string;
  short_name?: string;
  status: string;
  issued_date?: string;
  in_force_date?: string;
  url?: string;
  description?: string;
  provisions?: ProvisionSeed[];
}

interface ProvisionSeed {
  provision_ref: string;
  chapter?: string;
  part?: string;
  section: string;
  title?: string;
  content: string;
  order_index?: number;
  valid_from?: string;
  valid_to?: string;
}

interface EUDocumentSeed {
  id: string;
  type: 'directive' | 'regulation';
  year: number;
  number: number;
  community: 'EU' | 'EC' | 'EEC' | 'Euratom';
  celex_number?: string;
  title?: string;
  short_name?: string;
  url_eur_lex?: string;
  in_force?: boolean;
  amended_by?: string;
  repeals?: string;
}

interface EUReferenceSeed {
  document_id: string;
  eu_document_id: string;
  provision_ref?: string;
  eu_article?: string;
  reference_type?: 'implements' | 'supplements' | 'applies' | 'cites' | 'cites_article';
  is_primary_implementation?: boolean;
  implementation_status?: 'full' | 'partial' | 'pending' | 'unknown';
  full_citation?: string;
  reference_context?: string;
}

interface EUReferenceSeedFile {
  version: string;
  eu_documents: EUDocumentSeed[];
  references: EUReferenceSeed[];
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const SCHEMA = `
-- Legal documents (statutes)
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'statute',
  title TEXT NOT NULL,
  title_en TEXT,
  short_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_force'
    CHECK(status IN ('in_force', 'amended', 'repealed', 'not_yet_in_force')),
  issued_date TEXT,
  in_force_date TEXT,
  url TEXT,
  description TEXT,
  last_updated TEXT DEFAULT (datetime('now'))
);

-- Individual provisions from statutes
CREATE TABLE legal_provisions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  order_index INTEGER,
  valid_from TEXT,
  valid_to TEXT,
  UNIQUE(document_id, provision_ref)
);

CREATE INDEX idx_provisions_doc ON legal_provisions(document_id);
CREATE INDEX idx_provisions_chapter ON legal_provisions(document_id, chapter);

-- FTS5 for provision search
CREATE VIRTUAL TABLE provisions_fts USING fts5(
  content, title,
  content='legal_provisions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER provisions_ai AFTER INSERT ON legal_provisions BEGIN
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TRIGGER provisions_ad AFTER DELETE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
END;

CREATE TRIGGER provisions_au AFTER UPDATE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

-- EU Documents (directives and regulations)
CREATE TABLE eu_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('directive', 'regulation')),
  year INTEGER NOT NULL CHECK (year >= 1957 AND year <= 2100),
  number INTEGER NOT NULL CHECK (number > 0),
  community TEXT CHECK (community IN ('EU', 'EC', 'EEC', 'Euratom')),
  celex_number TEXT,
  title TEXT,
  short_name TEXT,
  url_eur_lex TEXT,
  in_force BOOLEAN DEFAULT 1,
  amended_by TEXT,
  repeals TEXT
);

-- EU References (links national provisions to EU documents)
CREATE TABLE eu_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  eu_document_id TEXT NOT NULL REFERENCES eu_documents(id),
  provision_id INTEGER REFERENCES legal_provisions(id),
  eu_article TEXT,
  reference_type TEXT NOT NULL DEFAULT 'implements',
  is_primary_implementation BOOLEAN DEFAULT 0,
  implementation_status TEXT,
  full_citation TEXT,
  reference_context TEXT
);

CREATE INDEX idx_eu_references_document ON eu_references(document_id);
CREATE INDEX idx_eu_references_eu_document ON eu_references(eu_document_id);

-- Build metadata
CREATE TABLE db_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function dedupeProvisions(provisions: ProvisionSeed[]): ProvisionSeed[] {
  const byRef = new Map<string, ProvisionSeed>();
  let dupes = 0;

  for (const prov of provisions) {
    const ref = prov.provision_ref.trim();
    const existing = byRef.get(ref);

    if (!existing) {
      byRef.set(ref, { ...prov, provision_ref: ref });
      continue;
    }

    dupes++;
    // Keep the version with more content
    const existingLen = normalizeWhitespace(existing.content).length;
    const incomingLen = normalizeWhitespace(prov.content).length;
    if (incomingLen > existingLen) {
      byRef.set(ref, { ...prov, provision_ref: ref, title: prov.title ?? existing.title });
    }
  }

  if (dupes > 0) {
    console.log(`    ${dupes} duplicate provision refs resolved`);
  }

  return Array.from(byRef.values());
}

function loadEUReferenceSeed(): EUReferenceSeedFile {
  if (!fs.existsSync(EU_REFERENCE_SEED_PATH)) {
    return { version: '1.0', eu_documents: [], references: [] };
  }

  try {
    const content = fs.readFileSync(EU_REFERENCE_SEED_PATH, 'utf-8');
    const parsed = JSON.parse(content) as Partial<EUReferenceSeedFile>;
    return {
      version: parsed.version ?? '1.0',
      eu_documents: Array.isArray(parsed.eu_documents) ? parsed.eu_documents : [],
      references: Array.isArray(parsed.references) ? parsed.references : [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`WARNING: Failed to load EU seed file (${EU_REFERENCE_SEED_PATH}): ${message}`);
    return { version: '1.0', eu_documents: [], references: [] };
  }
}

// ─── Build ───────────────────────────────────────────────────────────────────

function buildDatabase(): void {
  console.log('Building Irish Law MCP database...\n');

  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = DELETE');

  db.exec(SCHEMA);

  // Prepared statements
  const insertDoc = db.prepare(`
    INSERT INTO legal_documents (id, type, title, title_en, short_name, status, issued_date, in_force_date, url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProvision = db.prepare(`
    INSERT INTO legal_provisions (document_id, provision_ref, chapter, section, title, content, order_index, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEUDocument = db.prepare(`
    INSERT OR IGNORE INTO eu_documents (
      id, type, year, number, community, celex_number, title, short_name, url_eur_lex, in_force, amended_by, repeals
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEUReference = db.prepare(`
    INSERT INTO eu_references (
      document_id, eu_document_id, provision_id, eu_article, reference_type, is_primary_implementation,
      implementation_status, full_citation, reference_context
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const selectDocumentId = db.prepare('SELECT id FROM legal_documents WHERE id = ? LIMIT 1');
  const selectEUDocumentId = db.prepare('SELECT id FROM eu_documents WHERE id = ? LIMIT 1');
  const selectProvisionId = db.prepare(`
    SELECT id
    FROM legal_provisions
    WHERE document_id = ? AND (provision_ref = ? OR section = ?)
    LIMIT 1
  `);

  // Load seed files
  if (!fs.existsSync(SEED_DIR)) {
    console.log(`No seed directory at ${SEED_DIR} -- creating empty database.`);
    insertMetadata(db);
    db.close();
    return;
  }

  const seedFiles = fs.readdirSync(SEED_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('.') && !f.startsWith('_'));

  if (seedFiles.length === 0) {
    console.log('No seed files found. Database created with empty schema.');
    insertMetadata(db);
    db.close();
    return;
  }

  let totalDocs = 0;
  let totalProvisions = 0;
  let emptyDocs = 0;
  let totalEUDocuments = 0;
  let totalEUReferences = 0;

  const loadAll = db.transaction(() => {
    for (const file of seedFiles) {
      const filePath = path.join(SEED_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const seed = JSON.parse(content) as DocumentSeed;

      insertDoc.run(
        seed.id,
        seed.type ?? 'statute',
        seed.title,
        seed.title_en ?? null,
        seed.short_name ?? null,
        seed.status ?? 'in_force',
        seed.issued_date ?? null,
        seed.in_force_date ?? null,
        seed.url ?? null,
        seed.description ?? null,
      );
      totalDocs++;

      const provisions = dedupeProvisions(seed.provisions ?? []);
      if (provisions.length === 0) {
        emptyDocs++;
      }

      for (const prov of provisions) {
        insertProvision.run(
          seed.id,
          prov.provision_ref,
          prov.chapter ?? prov.part ?? null,
          prov.section,
          prov.title ?? null,
          prov.content,
          prov.order_index ?? null,
          prov.valid_from ?? null,
          prov.valid_to ?? null,
        );
        totalProvisions++;
      }
    }
  });

  loadAll();

  const euSeed = loadEUReferenceSeed();
  const loadEU = db.transaction(() => {
    for (const euDoc of euSeed.eu_documents) {
      insertEUDocument.run(
        euDoc.id,
        euDoc.type,
        euDoc.year,
        euDoc.number,
        euDoc.community,
        euDoc.celex_number ?? null,
        euDoc.title ?? null,
        euDoc.short_name ?? null,
        euDoc.url_eur_lex ?? null,
        euDoc.in_force === false ? 0 : 1,
        euDoc.amended_by ?? null,
        euDoc.repeals ?? null,
      );
      totalEUDocuments += 1;
    }

    for (const ref of euSeed.references) {
      const docExists = selectDocumentId.get(ref.document_id) as { id: string } | undefined;
      if (!docExists) {
        continue;
      }

      const euDocExists = selectEUDocumentId.get(ref.eu_document_id) as { id: string } | undefined;
      if (!euDocExists) {
        continue;
      }

      let provisionId: number | null = null;
      if (ref.provision_ref?.trim()) {
        const provision = selectProvisionId.get(
          ref.document_id,
          ref.provision_ref,
          ref.provision_ref.replace(/^s/i, ''),
        ) as { id: number } | undefined;
        provisionId = provision?.id ?? null;
      }

      insertEUReference.run(
        ref.document_id,
        ref.eu_document_id,
        provisionId,
        ref.eu_article ?? null,
        ref.reference_type ?? 'implements',
        ref.is_primary_implementation ? 1 : 0,
        ref.implementation_status ?? null,
        ref.full_citation ?? null,
        ref.reference_context ?? null,
      );
      totalEUReferences += 1;
    }
  });
  loadEU();

  insertMetadata(db);

  db.exec('ANALYZE');
  db.exec('VACUUM');
  db.close();

  const size = fs.statSync(DB_PATH).size;
  console.log(
    `\nBuild complete: ${totalDocs} documents, ${totalProvisions} provisions` +
    (emptyDocs > 0 ? ` (${emptyDocs} documents with no provisions)` : ''),
  );
  console.log(`EU build: ${totalEUDocuments} EU documents seeded, ${totalEUReferences} EU references seeded`);
  console.log(`Output: ${DB_PATH} (${(size / 1024).toFixed(1)} KB)`);
}

function insertMetadata(db: InstanceType<typeof Database>): void {
  const insertMeta = db.prepare('INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)');
  const writeMeta = db.transaction(() => {
    insertMeta.run('tier', 'free');
    insertMeta.run('schema_version', '1');
    insertMeta.run('jurisdiction', 'IE');
    insertMeta.run('built_at', new Date().toISOString());
    insertMeta.run('builder', 'build-db.ts');
  });
  writeMeta();
}

buildDatabase();
