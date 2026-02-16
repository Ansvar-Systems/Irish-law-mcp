#!/usr/bin/env tsx
/**
 * Two-phase ingestion pipeline for Irish legislation.
 *
 * Phase 1 (Discovery): Fetch act index from Oireachtas API
 * Phase 2 (Content):   Fetch XML from eISB and produce seed JSON
 *
 * Usage:
 *   npm run ingest                          # full run
 *   npm run ingest -- --limit 20            # first 20 acts
 *   npm run ingest -- --skip-discovery      # skip phase 1, use cached index
 *   npm run ingest -- --year-start 2018     # only acts from 2018 onwards
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchOireachtasPage, fetchEISBXml, type OireachtasAct } from './lib/fetcher.js';
import { parseEISBXml } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const SEED_DIR = path.resolve(__dirname, '../data/seed');
const INDEX_PATH = path.join(SOURCE_DIR, 'act-index.json');

// ─── CLI args ────────────────────────────────────────────────────────────────

interface CLIOptions {
  limit: number;
  skipDiscovery: boolean;
  yearStart: number;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    limit: 0,
    skipDiscovery: false,
    yearStart: 0,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--skip-discovery':
        options.skipDiscovery = true;
        break;
      case '--year-start':
        options.yearStart = parseInt(args[++i], 10);
        break;
    }
  }

  return options;
}

// ─── Index entry ─────────────────────────────────────────────────────────────

interface ActIndexEntry {
  id: string;
  year: number;
  number: number;
  title: string;
  longTitle?: string;
  dateSigned?: string;
  statutebookURI?: string;
}

// ─── Phase 1: Discovery ─────────────────────────────────────────────────────

async function discoverActs(options: CLIOptions): Promise<ActIndexEntry[]> {
  console.log('\n=== Phase 1: Discovery via Oireachtas API ===\n');

  const pageSize = 100;
  const acts: ActIndexEntry[] = [];
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const response = await fetchOireachtasPage(pageSize, skip);
    total = response.head.counts.billCount;
    console.log(`  Page ${Math.floor(skip / pageSize) + 1}: ${response.results.length} results (total: ${total})`);

    for (const result of response.results) {
      const act = result.bill?.act;
      if (!act) continue;

      const year = parseInt(act.actYear, 10);
      const number = parseInt(act.actNo, 10);

      if (isNaN(year) || isNaN(number)) {
        console.log(`  SKIP: invalid year/number for "${act.shortTitleEn}"`);
        continue;
      }

      if (options.yearStart && year < options.yearStart) continue;

      acts.push({
        id: `act-${year}-${number}`,
        year,
        number,
        title: act.shortTitleEn,
        longTitle: act.longTitleEn,
        dateSigned: act.dateSigned,
        statutebookURI: act.statutebookURI,
      });

      if (options.limit && acts.length >= options.limit) break;
    }

    if (options.limit && acts.length >= options.limit) break;
    skip += pageSize;
  }

  // Sort by year desc, then number desc
  acts.sort((a, b) => b.year - a.year || b.number - a.number);

  // Save index
  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(acts, null, 2));
  console.log(`\n  Saved ${acts.length} acts to ${INDEX_PATH}`);

  return acts;
}

// ─── Phase 2: Content ───────────────────────────────────────────────────────

async function fetchContent(acts: ActIndexEntry[]): Promise<void> {
  console.log('\n=== Phase 2: Content via eISB ===\n');
  fs.mkdirSync(SEED_DIR, { recursive: true });

  let fetched = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < acts.length; i++) {
    const act = acts[i];
    const seedPath = path.join(SEED_DIR, `${act.id}.json`);

    // Skip if seed already exists
    if (fs.existsSync(seedPath)) {
      skipped++;
      continue;
    }

    console.log(`  [${i + 1}/${acts.length}] ${act.title} (${act.year} Act ${act.number})`);

    try {
      const xml = await fetchEISBXml(act.year, act.number);

      if (!xml) {
        console.log(`    -> 404 / no XML available`);
        notFound++;

        // Write a minimal seed with no provisions
        const minimalSeed = {
          id: act.id,
          type: 'statute',
          title: act.title,
          status: 'in_force',
          issued_date: act.dateSigned?.split('T')[0] ?? `${act.year}-01-01`,
          url: `https://www.irishstatutebook.ie/eli/${act.year}/act/${act.number}/enacted/en/html`,
          provisions: [],
        };
        fs.writeFileSync(seedPath, JSON.stringify(minimalSeed, null, 2));
        continue;
      }

      const parsed = parseEISBXml(xml);

      const seed = {
        id: act.id,
        type: 'statute',
        title: act.title,
        status: 'in_force',
        issued_date: act.dateSigned?.split('T')[0] ?? `${act.year}-01-01`,
        url: `https://www.irishstatutebook.ie/eli/${act.year}/act/${act.number}/enacted/en/html`,
        provisions: parsed.provisions.map((p, idx) => ({
          provision_ref: p.provision_ref,
          section: p.section,
          title: p.title,
          content: p.content,
          part: p.part,
          chapter: p.chapter,
          order_index: idx,
        })),
      };

      fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2));
      fetched++;
      console.log(`    -> ${parsed.provisions.length} provisions`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`    -> ERROR: ${message}`);
      errors++;
    }
  }

  console.log(`\n  Summary: ${fetched} fetched, ${skipped} skipped (cached), ${notFound} not found, ${errors} errors`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const options = parseArgs();
  console.log('Irish Law MCP — Ingestion Pipeline');
  console.log(`  Options: limit=${options.limit || 'all'}, skipDiscovery=${options.skipDiscovery}, yearStart=${options.yearStart || 'all'}`);

  let acts: ActIndexEntry[];

  if (options.skipDiscovery) {
    if (!fs.existsSync(INDEX_PATH)) {
      console.error(`ERROR: --skip-discovery requires ${INDEX_PATH} to exist. Run discovery first.`);
      process.exit(1);
    }
    acts = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
    console.log(`  Loaded ${acts.length} acts from cached index`);

    if (options.yearStart) {
      acts = acts.filter(a => a.year >= options.yearStart);
    }
    if (options.limit) {
      acts = acts.slice(0, options.limit);
    }
  } else {
    acts = await discoverActs(options);
  }

  await fetchContent(acts);

  console.log('\nIngestion complete.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
