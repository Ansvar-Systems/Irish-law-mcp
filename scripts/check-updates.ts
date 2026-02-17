#!/usr/bin/env tsx
/**
 * Check for newly enacted Irish Acts and date mismatches against the local DB.
 *
 * Usage:
 *   npm run check-updates
 *   npm run check-updates -- --limit-pages 5
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { fetchOireachtasPage, type OireachtasAct } from './lib/fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/database.db');

const PAGE_SIZE = 100;

interface LocalDocument {
  id: string;
  title: string;
  issued_date: string | null;
}

interface RemoteDocument {
  id: string;
  title: string;
  date_signed: string | null;
}

interface CLIOptions {
  limitPages: number;
}

function parseArgs(): CLIOptions {
  const options: CLIOptions = { limitPages: 0 };
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--limit-pages') {
      options.limitPages = Number.parseInt(args[i + 1] ?? '0', 10) || 0;
      i += 1;
    }
  }

  return options;
}

function toSignedDate(act: OireachtasAct | undefined): string | null {
  const raw = act?.dateSigned;
  if (!raw) return null;
  const date = raw.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

async function fetchRemoteActs(limitPages = 0): Promise<Map<string, RemoteDocument>> {
  const remote = new Map<string, RemoteDocument>();
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;
  let page = 0;

  while (skip < total) {
    page += 1;
    if (limitPages > 0 && page > limitPages) {
      break;
    }

    const response = await fetchOireachtasPage(PAGE_SIZE, skip);
    total = response.head.counts.billCount;

    for (const result of response.results) {
      const act = result.bill?.act;
      if (!act) continue;

      const year = Number.parseInt(act.actYear, 10);
      const number = Number.parseInt(act.actNo, 10);
      if (!Number.isFinite(year) || !Number.isFinite(number)) {
        continue;
      }

      const id = `act-${year}-${number}`;
      const incoming: RemoteDocument = {
        id,
        title: act.shortTitleEn?.trim() || id,
        date_signed: toSignedDate(act),
      };

      const existing = remote.get(id);
      if (!existing) {
        remote.set(id, incoming);
        continue;
      }

      // Keep whichever record has a more recent signed date.
      if (incoming.date_signed && (!existing.date_signed || incoming.date_signed > existing.date_signed)) {
        remote.set(id, incoming);
      }
    }

    skip += PAGE_SIZE;
  }

  return remote;
}

function loadLocalActs(): Map<string, LocalDocument> {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`
    SELECT id, title, issued_date
    FROM legal_documents
    WHERE type = 'statute'
    ORDER BY id
  `).all() as LocalDocument[];
  db.close();

  return new Map(rows.map((row) => [row.id, row]));
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('Irish Law MCP - Data Freshness Check');
  console.log('');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    console.error('Run "npm run build:db" first.');
    process.exit(1);
  }

  const local = loadLocalActs();
  console.log(`Local statutes: ${local.size}`);
  console.log(`Fetching enacted acts from Oireachtas API${options.limitPages ? ` (max ${options.limitPages} pages)` : ''}...`);

  const remote = await fetchRemoteActs(options.limitPages);
  console.log(`Remote enacted acts discovered: ${remote.size}`);
  console.log('');

  const newActs: RemoteDocument[] = [];
  const datedChanges: Array<{ id: string; local_date: string | null; remote_date: string | null; title: string }> = [];

  for (const remoteDoc of remote.values()) {
    const localDoc = local.get(remoteDoc.id);
    if (!localDoc) {
      newActs.push(remoteDoc);
      continue;
    }

    if (
      remoteDoc.date_signed
      && (!localDoc.issued_date || remoteDoc.date_signed > localDoc.issued_date)
    ) {
      datedChanges.push({
        id: remoteDoc.id,
        title: remoteDoc.title || localDoc.title,
        local_date: localDoc.issued_date,
        remote_date: remoteDoc.date_signed,
      });
    }
  }

  console.log(`New acts: ${newActs.length}`);
  console.log(`Potential date updates: ${datedChanges.length}`);

  if (newActs.length > 0) {
    console.log('\nNew acts not in local database:');
    for (const act of newActs.slice(0, 25)) {
      console.log(`  + ${act.id} | ${act.title} | signed=${act.date_signed ?? 'unknown'}`);
    }
    if (newActs.length > 25) {
      console.log(`  ... and ${newActs.length - 25} more`);
    }
  }

  if (datedChanges.length > 0) {
    console.log('\nActs with newer signed date upstream:');
    for (const act of datedChanges.slice(0, 25)) {
      console.log(
        `  * ${act.id} | local=${act.local_date ?? 'null'} | remote=${act.remote_date ?? 'null'} | ${act.title}`,
      );
    }
    if (datedChanges.length > 25) {
      console.log(`  ... and ${datedChanges.length - 25} more`);
    }
  }

  if (newActs.length > 0 || datedChanges.length > 0) {
    console.log('\nUpdates detected. Re-run ingestion and rebuild database.');
    process.exit(1);
  }

  console.log('\nNo updates detected.');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Check failed: ${message}`);
  process.exit(2);
});
