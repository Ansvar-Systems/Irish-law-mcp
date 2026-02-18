import type { VercelRequest, VercelResponse } from '@vercel/node';
import { existsSync } from 'fs';
import { join } from 'path';

const SERVER_NAME = 'irish-legal-citations';
const SERVER_VERSION = '1.0.0';
const REPO_URL = 'https://github.com/Ansvar-Systems/Ireland-law-mcp';

function checkDbAccessible(): { ok: boolean; path: string } {
  const paths = [
    '/tmp/database.db',
    join(process.cwd(), 'data', 'database.db'),
  ];
  for (const p of paths) {
    if (existsSync(p)) return { ok: true, path: p };
  }
  return { ok: false, path: paths[0] };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `https://${host}`);

  if (url.pathname === '/version' || url.searchParams.has('version')) {
    res.status(200).json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      node_version: process.version,
      transport: ['stdio', 'streamable-http'],
      capabilities: ['statutes', 'eu_cross_references'],
      tier: 'free',
      source_schema_version: '1.0',
      repo_url: REPO_URL,
      report_issue_url: `${REPO_URL}/issues/new?template=data-error.md`,
    });
    return;
  }

  const dbCheck = checkDbAccessible();
  const status = dbCheck.ok ? 'ok' : 'degraded';

  res.status(dbCheck.ok ? 200 : 503).json({
    status,
    server: SERVER_NAME,
    version: SERVER_VERSION,
    uptime_seconds: Math.floor(process.uptime()),
    database_accessible: dbCheck.ok,
    data_freshness: {
      max_age_days: 30,
      note: 'Serving bundled free-tier database',
    },
    capabilities: ['statutes', 'eu_cross_references'],
    tier: 'free',
  });
}
