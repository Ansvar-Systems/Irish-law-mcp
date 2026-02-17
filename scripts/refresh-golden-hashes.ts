#!/usr/bin/env tsx
/**
 * Refresh expected hashes for drift anchors in fixtures/golden-hashes.json.
 *
 * Usage:
 *   npm run golden:refresh-hashes
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HASHES_PATH = join(__dirname, '..', 'fixtures', 'golden-hashes.json');

interface GoldenHashEntry {
  id: string;
  description: string;
  upstream_url: string;
  selector_hint: string;
  expected_sha256: string;
  expected_snippet: string;
}

interface GoldenHashesFile {
  $schema?: string;
  version: string;
  mcp_name: string;
  jurisdiction?: string;
  description?: string;
  provisions: GoldenHashEntry[];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function sha256(text: string): string {
  return createHash('sha256').update(normalizeText(text)).digest('hex');
}

async function main(): Promise<void> {
  const parsed = JSON.parse(readFileSync(HASHES_PATH, 'utf-8')) as GoldenHashesFile;

  if (!Array.isArray(parsed.provisions) || parsed.provisions.length === 0) {
    throw new Error('No provisions array found in golden hash fixture.');
  }

  let updated = 0;

  for (const provision of parsed.provisions) {
    console.log(`Fetching ${provision.id} -> ${provision.upstream_url}`);
    const response = await fetch(provision.upstream_url, {
      headers: { 'User-Agent': 'Ansvar-IrelandLaw-GoldenHashRefresh/1.0' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${provision.upstream_url}`);
    }

    const body = await response.text();
    provision.expected_sha256 = sha256(body);
    updated += 1;
  }

  writeFileSync(HASHES_PATH, JSON.stringify(parsed, null, 2) + '\n');
  console.log(`Updated hashes for ${updated} provision anchor(s).`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Refresh failed: ${message}`);
  process.exit(1);
});
