/**
 * Dual-source fetcher for Irish legislation.
 *
 * - Oireachtas API: metadata/index of enacted legislation
 * - eISB (Irish Statute Book): full XML text of acts
 *
 * Rate-limited to 500ms between requests. No auth needed.
 */

const OIREACHTAS_BASE = 'https://api.oireachtas.ie/v1';
const EISB_BASE = 'https://www.irishstatutebook.ie';

const USER_AGENT = 'AnsvarIrishLawMCP/1.0 (legal-research; contact: hello@ansvar.ai)';
const RATE_LIMIT_MS = 500;

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch JSON from the Oireachtas API.
 */
export async function fetchOireachtasPage(limit: number, skip: number): Promise<OireachtasResponse> {
  await rateLimit();

  const url = `${OIREACHTAS_BASE}/legislation?bill_status=Enacted&limit=${limit}&skip=${skip}`;
  console.log(`  GET ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Oireachtas API error: ${res.status} ${res.statusText} for ${url}`);
  }

  return res.json() as Promise<OireachtasResponse>;
}

/**
 * Fetch eISB XML for a specific act.
 * Returns null if 404 (older acts may not have XML).
 */
export async function fetchEISBXml(year: number, actNumber: number): Promise<string | null> {
  await rateLimit();

  const url = `${EISB_BASE}/eli/${year}/act/${actNumber}/enacted/en/xml`;
  console.log(`  GET ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/xml' },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`eISB error: ${res.status} ${res.statusText} for ${url}`);
  }

  const text = await res.text();

  // Some responses return HTML error pages instead of XML
  if (text.includes('<!DOCTYPE html') || text.includes('<html')) {
    return null;
  }

  return text;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OireachtasAct {
  actYear: string;
  actNo: string;
  shortTitleEn: string;
  longTitleEn?: string;
  statutebookURI?: string;
  dateSigned?: string;
  dateCommenced?: string;
}

export interface OireachtasBillResult {
  bill: {
    act?: OireachtasAct;
    billNo?: string;
    billType?: string;
    shortTitleEn?: string;
    uri?: string;
  };
}

export interface OireachtasResponse {
  head: {
    counts: {
      billCount: number;
      resultCount: number;
    };
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
  results: OireachtasBillResult[];
}
