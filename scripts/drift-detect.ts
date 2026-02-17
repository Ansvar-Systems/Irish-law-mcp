#!/usr/bin/env tsx
/**
 * Upstream drift detection for stable legal source anchors.
 *
 * Exit codes:
 *   0 = no drift
 *   1 = fetch/runtime errors
 *   2 = drift detected
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface GoldenHashEntry {
  id: string;
  description: string;
  upstream_url: string;
  selector_hint: string;
  expected_sha256: string;
  expected_snippet: string;
}

interface GoldenHashes {
  provisions: GoldenHashEntry[];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function sha256(text: string): string {
  return createHash('sha256').update(normalizeText(text)).digest('hex');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const hashesPath = join(__dirname, '..', 'fixtures', 'golden-hashes.json');
  const hashes: GoldenHashes = JSON.parse(readFileSync(hashesPath, 'utf-8')) as GoldenHashes;

  if (!Array.isArray(hashes.provisions) || hashes.provisions.length === 0) {
    console.log('No golden hash anchors configured in fixtures/golden-hashes.json');
    process.exit(0);
  }

  let driftCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  console.log(`Drift detection: checking ${hashes.provisions.length} provision anchor(s)...\n`);

  for (const entry of hashes.provisions) {
    if (entry.expected_sha256 === 'COMPUTE_ON_FIRST_RUN') {
      console.log(`  SKIP  ${entry.id}: ${entry.description} (hash not initialized)`);
      skippedCount += 1;
      await sleep(1000);
      continue;
    }

    try {
      const response = await fetch(entry.upstream_url, {
        headers: { 'User-Agent': 'Ansvar-IrelandLaw-DriftDetect/1.0' },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        console.log(`  ERROR ${entry.id}: HTTP ${response.status} for ${entry.upstream_url}`);
        errorCount += 1;
        await sleep(1000);
        continue;
      }

      const body = await response.text();
      const actualHash = sha256(body);

      if (actualHash !== entry.expected_sha256) {
        console.log(`  DRIFT ${entry.id}: ${entry.description}`);
        console.log(`         Expected: ${entry.expected_sha256}`);
        console.log(`         Got:      ${actualHash}`);
        driftCount += 1;
      } else {
        console.log(`  OK    ${entry.id}: ${entry.description}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ERROR ${entry.id}: ${message}`);
      errorCount += 1;
    }

    await sleep(1000);
  }

  const okCount = hashes.provisions.length - driftCount - errorCount - skippedCount;
  console.log(`\nResults: ${okCount} OK, ${driftCount} drift, ${errorCount} errors, ${skippedCount} skipped`);

  if (driftCount > 0) process.exit(2);
  if (errorCount > 0) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});
