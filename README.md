# Ireland Law MCP

Production-oriented MCP server for Irish legislation, including:

- Full-text statute/provision search
- Provision retrieval and citation helpers
- EU cross-reference endpoints
- Golden contract tests
- Scheduled freshness/drift automation
- Vercel streamable HTTP deployment

## Requirements

- Node.js 18+ (Node 20/22 recommended)
- npm

## Local Setup

```bash
npm ci
npm run typecheck
npm run build
npm test
```

Run as stdio MCP server:

```bash
npm run dev
```

Use an explicit DB path:

```bash
IRISH_LAW_DB_PATH=/absolute/path/to/database.db npm run dev
```

## Database Pipeline

Fetch/refresh source material:

```bash
npm run ingest
```

Build SQLite from seed files:

```bash
npm run build:db
```

EU cross-reference seed data is loaded from:

`data/source/eu-references.json`

## Testing

Run all tests:

```bash
npm test
```

Run contract/golden suite only:

```bash
npm run test:contract
```

Nightly contract mode (enables upstream assertions):

```bash
CONTRACT_MODE=nightly npm run test:contract
```

## Drift and Freshness Automation

Check upstream data freshness:

```bash
npm run check-updates
```

Detect drift against upstream hash anchors:

```bash
npm run drift:detect
```

Golden hash anchors are defined in `fixtures/golden-hashes.json`.
Initialize or refresh hashes:

```bash
npm run golden:refresh-hashes
```

## Vercel Deployment

This repo deploys `/mcp` (Streamable HTTP), `/health`, and `/version`.

For GitHub Actions deployment, configure repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Deployment workflow:

- `.github/workflows/vercel-deploy.yml`

Vercel build fetches `data/database.db.gz` from the GitHub release matching package version (via `scripts/download-db.sh`).

## GitHub Workflows

- `ci.yml`: build, tests, coverage, contract tests, scheduled nightly contract mode
- `check-updates.yml`: daily freshness check + issue creation on detected updates
- `drift-detect.yml`: nightly drift detection + issue creation on hash mismatch
- `vercel-deploy.yml`: production deploy (when Vercel secrets are set)
