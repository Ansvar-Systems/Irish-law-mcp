# Irish Law MCP Server

**The Irish Statute Book alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Firish-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/irish-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Ireland-law-mcp?style=social)](https://github.com/Ansvar-Systems/Ireland-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Ireland-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Ireland-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/Ireland-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/Ireland-law-mcp/actions/workflows/check-updates.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](docs/EU_INTEGRATION_GUIDE.md)
[![Provisions](https://img.shields.io/badge/provisions-91%2C528-blue)](docs/EU_INTEGRATION_GUIDE.md)

Query **3,972 Irish statutes** -- from the Data Protection Act 2018 and Criminal Justice Act to the Companies Act 2014, Employment Equality Acts, and more -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Irish legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Irish legal research is scattered across the Irish Statute Book, the Attorney General's office publications, and EUR-Lex. Whether you're:
- A **solicitor or barrister** validating citations in a brief or contract
- A **compliance officer** checking if a statute is still in force or amended
- A **legal tech developer** building tools on Irish law
- A **researcher** tracing legislative provisions across 3,972 statutes

...you shouldn't need dozens of browser tabs and manual cross-referencing. Ask Claude. Get the exact provision. With context.

This MCP server makes Irish law **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version -- zero dependencies, nothing to install.

**Endpoint:** `https://irish-law-mcp.vercel.app/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add irish-law --transport http https://irish-law-mcp.vercel.app/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "irish-law": {
      "type": "url",
      "url": "https://irish-law-mcp.vercel.app/mcp"
    }
  }
}
```

**GitHub Copilot** -- add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "irish-law": {
      "type": "http",
      "url": "https://irish-law-mcp.vercel.app/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/irish-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "irish-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/irish-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "irish-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/irish-law-mcp"]
    }
  }
}
```

---

## Example Queries

Once connected, just ask naturally:

- *"What does the Data Protection Act 2018 say about processing sensitive personal data?"*
- *"Is the Copyright and Related Rights Act 2000 still in force?"*
- *"Find provisions about employment equality in the Employment Equality Acts 1998-2015"*
- *"Which Irish statutes implement the GDPR?"*
- *"What EU directive is the basis for the Companies Act 2014 provisions on annual returns?"*
- *"Validate the citation 'Data Protection Act 2018, s. 71'"*
- *"Build a legal stance on data breach notification requirements under Irish law"*
- *"Compare incident reporting obligations in the Network and Information Systems Directive (NIS) transposition"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Statutes** | 3,972 statutes | Comprehensive Irish legislation from the Irish Statute Book |
| **Provisions** | 91,528 sections | Full-text searchable with FTS5 |
| **Preparatory Works** | 5,926 documents | Oireachtas Bills and Explanatory Memoranda |
| **EU Cross-References** | Included | Directives and regulations linked to Irish transpositions |
| **Database Size** | 220 MB | Optimized SQLite, portable |
| **Daily Updates** | Automated | Freshness checks against irishstatutebook.ie |

**Verified data only** -- every citation is validated against official sources (Irish Statute Book, Attorney General's office). Zero LLM-generated content.

---

## See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from the Irish Statute Book (irishstatutebook.ie) official sources
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains statute text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by Act short title + section number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
Irish Statute Book → Parse → SQLite → FTS5 snippet() → MCP response
                      ↑                      ↑
               Provision parser       Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search Irish Statute Book by Act name | Search by plain English: *"data processing consent"* |
| Navigate multi-part statutes manually | Get the exact provision with context |
| Manual cross-referencing between Acts | `build_legal_stance` aggregates across sources |
| "Is this statute still in force?" → check manually | `check_currency` tool → answer in seconds |
| Find EU basis → dig through EUR-Lex | `get_eu_basis` → linked EU directives instantly |
| Check multiple sites for updates | Daily automated freshness checks |
| No API, no integration | MCP protocol → AI-native |

**Traditional:** Search Irish Statute Book → Navigate Act HTML → Ctrl+F → Cross-reference → Check EUR-Lex for EU basis → Repeat

**This MCP:** *"Which section of the Data Protection Act 2018 transposes GDPR Article 9 on special categories?"* → Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across 91,528 provisions with BM25 ranking |
| `get_provision` | Retrieve specific provision by Act short title + section number |
| `validate_citation` | Validate citation against database -- zero-hallucination check |
| `build_legal_stance` | Aggregate citations from multiple Acts for a legal topic |
| `format_citation` | Format citations per Irish conventions (full/short/pinpoint) |
| `check_currency` | Check if statute is in force, amended, or repealed |
| `list_sources` | List all available statutes with metadata and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### EU Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get EU directives/regulations that underpin an Irish statute |
| `get_irish_implementations` | Find Irish laws implementing a specific EU act |
| `search_eu_implementations` | Search EU documents with Irish implementation counts |
| `get_provision_eu_basis` | Get EU law references for a specific provision |
| `validate_eu_compliance` | Check implementation status of Irish statutes against EU directives |

---

## EU Law Integration

Ireland is an EU member state. Irish legislation directly transposes EU directives and implements EU regulations, creating a traceable mapping between Irish and EU law.

Key areas of EU-Irish law alignment:

- **GDPR (2016/679)** -- implemented via the Data Protection Act 2018 and Data Protection Regulations 2018 (S.I. No. 174/2018)
- **NIS2 Directive (2022/2555)** -- transposed into Irish network and information security legislation
- **eIDAS Regulation (910/2014)** -- applicable directly; supplemented by national electronic signature provisions
- **DORA (2022/2554)** -- financial sector digital operational resilience obligations
- **AI Act (2024/1689)** -- EU regulation applicable directly across all member states
- **Companies Directives** -- Company law harmonisation across the EU single market

The EU bridge tools provide bi-directional lookup: find which Irish statutes implement a given EU act, or find which EU acts underpin a given Irish provision.

| Metric | Value |
|--------|-------|
| **EU Member State** | Since 1973 |
| **Legal System** | Common law (with Irish constitutional overlay) |
| **Official Statute Collection** | Irish Statute Book (irishstatutebook.ie) |
| **Parliament** | Oireachtas (oireachtas.ie) |
| **EUR-Lex Integration** | Automated metadata fetching |

See [EU_INTEGRATION_GUIDE.md](docs/EU_INTEGRATION_GUIDE.md) for detailed documentation and [EU_USAGE_EXAMPLES.md](docs/EU_USAGE_EXAMPLES.md) for practical examples.

---

## Data Sources & Freshness

All content is sourced from authoritative Irish legal databases:

- **[Irish Statute Book](https://www.irishstatutebook.ie/)** -- Official consolidated Acts and Statutory Instruments, Office of the Attorney General
- **[Oireachtas](https://www.oireachtas.ie/)** -- Preparatory works (Bills and Explanatory Memoranda)
- **[EUR-Lex](https://eur-lex.europa.eu/)** -- Official EU law database (metadata only)

### Automated Freshness Checks (Daily)

A [daily GitHub Actions workflow](.github/workflows/check-updates.yml) monitors all data sources:

| Source | Check | Method |
|--------|-------|--------|
| **Statute amendments** | Irish Statute Book comparison | All 3,972 statutes checked |
| **New statutes** | Irish Statute Book publications (90-day window) | Diffed against database |
| **Preparatory works** | Oireachtas Bills feed (30-day window) | New Bills detected |
| **EU reference staleness** | Git commit timestamps | Flagged if >90 days old |

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Docker Security** | Container image scanning + SBOM generation | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **OSSF Scorecard** | OpenSSF best practices scoring | Weekly |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from the Irish Statute Book (Office of the Attorney General). However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Court case coverage is limited** -- do not rely solely on this for case law research
> - **Verify critical citations** against primary sources for court filings
> - **EU cross-references** are extracted from Irish statute text, not EUR-Lex full text
> - **Always confirm** current in-force status via the Irish Statute Book before relying on a provision professionally

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [PRIVACY.md](PRIVACY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment. See [PRIVACY.md](PRIVACY.md) for Law Society of Ireland and Bar Council of Ireland compliance guidance.

---

## Documentation

- **[EU Integration Guide](docs/EU_INTEGRATION_GUIDE.md)** -- Detailed EU cross-reference documentation
- **[EU Usage Examples](docs/EU_USAGE_EXAMPLES.md)** -- Practical EU lookup examples
- **[Security Policy](SECURITY.md)** -- Vulnerability reporting and scanning details
- **[Disclaimer](DISCLAIMER.md)** -- Legal disclaimers and professional use notices
- **[Privacy](PRIVACY.md)** -- Client confidentiality and data handling

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Ireland-law-mcp
cd Ireland-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest              # Ingest statutes from Irish Statute Book
npm run build:db            # Rebuild SQLite database
npm run check-updates       # Check for amendments and new statutes
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** 220 MB (comprehensive corpus)
- **Reliability:** 100% ingestion success rate

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### @ansvar/irish-law-mcp (This Project)
**Query 3,972 Irish statutes directly from Claude** -- Data Protection Act 2018, Companies Act, Criminal Justice Acts, and more. Full provision text with EU cross-references. `npx @ansvar/irish-law-mcp`

### [@ansvar/uk-law-mcp](https://github.com/Ansvar-Systems/UK-law-mcp)
**Query UK statutes directly from Claude** -- common law tradition, post-Brexit landscape. `npx @ansvar/uk-law-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** -- ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

### [@ansvar/sanctions-mcp](https://github.com/Ansvar-Systems/Sanctions-MCP)
**Offline-capable sanctions screening** -- OFAC, EU, UN sanctions lists. `pip install ansvar-sanctions-mcp`

**70+ national law MCPs** covering Australia, Brazil, Canada, Denmark, Finland, France, Germany, Greece, Hungary, Iceland, Lithuania, Netherlands, Norway, Sweden, and more.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Court case law expansion (Supreme Court, Court of Appeal)
- EU Regulations MCP integration (full EU law text, CJEU case law)
- Historical statute versions and amendment tracking
- Statutory Instruments (secondary legislation) expansion

---

## Roadmap

- [x] Core statute database with FTS5 search
- [x] Full corpus ingestion (3,972 statutes, 91,528 provisions)
- [x] Preparatory works ingestion (5,926 documents)
- [x] EU law integration tools
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [x] Daily freshness checks
- [ ] Case law expansion (Supreme Court, Court of Appeal)
- [ ] Historical statute versions (amendment tracking)
- [ ] Statutory Instruments expansion

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{irish_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Irish Law MCP Server: Production-Grade Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Ireland-law-mcp},
  note = {Comprehensive Irish legal database with 3,972 statutes and 91,528 provisions}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Office of the Attorney General Ireland (public domain)
- **Preparatory Works:** Houses of the Oireachtas (public domain)
- **EU Metadata:** EUR-Lex (EU public domain)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the European market. This MCP server started as our internal reference tool for Irish law -- turns out everyone building for the Irish and EU markets has the same research frustrations.

So we're open-sourcing it. Navigating 3,972 statutes shouldn't require a law degree.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
