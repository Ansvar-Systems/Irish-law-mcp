# Privacy & Client Confidentiality

**IMPORTANT READING FOR LEGAL PROFESSIONALS**

This document addresses privacy and confidentiality considerations when using this Tool, with particular attention to professional obligations under Irish bar association and solicitor rules.

---

## Executive Summary

**Key Risks:**
- Queries through Claude API flow via Anthropic cloud infrastructure
- Query content may reveal client matters and privileged information
- Irish professional conduct rules (Law Society of Ireland, Bar of Ireland) require strict client confidentiality and data processing controls

**Safe Use Options:**
1. **General Legal Research**: Use Tool for non-client-specific queries
2. **Local npm Package**: Install `@ansvar/irish-law-mcp` locally — database queries stay on your machine
3. **Remote Endpoint**: Vercel Streamable HTTP endpoint — queries transit Vercel infrastructure
4. **On-Premise Deployment**: Self-host with local LLM for privileged matters

---

## Data Flows and Infrastructure

### MCP (Model Context Protocol) Architecture

This Tool uses the **Model Context Protocol (MCP)** to communicate with AI clients:

```
User Query -> MCP Client (Claude Desktop/Cursor/API) -> Anthropic Cloud -> MCP Server -> Database
```

### Deployment Options

#### 1. Local npm Package (Most Private)

```bash
npx @ansvar/irish-law-mcp
```

- Database is local SQLite file on your machine
- No data transmitted to external servers (except to AI client for LLM processing)
- Full control over data at rest

#### 2. Remote Endpoint (Vercel)

```
Endpoint: https://irish-law-mcp.vercel.app/mcp
```

- Queries transit Vercel infrastructure
- Tool responses return through the same path
- Subject to Vercel's privacy policy

### What Gets Transmitted

When you use this Tool through an AI client:

- **Query Text**: Your search queries and tool parameters
- **Tool Responses**: Statute text, provision content, search results
- **Metadata**: Timestamps, request identifiers

**What Does NOT Get Transmitted:**
- Files on your computer
- Your full conversation history (depends on AI client configuration)

---

## Professional Obligations (Ireland)

### Law Society of Ireland

Solicitors in Ireland are regulated by the **Law Society of Ireland** under the Solicitors Acts 1954–2015 and the Law Society's Practice Directions. Key obligations when using AI tools:

#### Duty of Confidentiality

- All client communications are confidential under the Solicitors (Amendment) Act 1994 and Law Society Practice Directions
- Client identity may itself be confidential in sensitive matters
- Case strategy and legal analysis are protected
- Information that could identify clients or matters must be safeguarded
- Breach may result in Law Society disciplinary proceedings before the Solicitors Disciplinary Tribunal

### Bar of Ireland (The Bar Council of Ireland)

Barristers in Ireland are regulated by the **Bar of Ireland** under the Legal Services Regulation Act 2015 and the Bar of Ireland's Code of Conduct. Key obligations:

- Barristers must maintain the confidentiality of all information concerning their clients
- Consider whether AI tool use constitutes disclosure to a third party requiring client consent
- Follow Bar of Ireland guidance on technology and professional conduct

### Legal Services Regulatory Authority (LSRA)

The **Legal Services Regulatory Authority (LSRA)** oversees both solicitors and barristers in Ireland under the Legal Services Regulation Act 2015. Consult LSRA guidance on the use of technology and AI in legal services.

### GDPR and the Data Protection Act 2018

Under **GDPR** and the **Data Protection Act 2018**, when using services that process client data:

- You are the **Data Controller**
- AI service providers (Anthropic, Vercel) may be **Data Processors**
- A **Data Processing Agreement** may be required before transmitting any personal data
- Ensure adequate technical and organisational measures are in place
- The **Data Protection Commission (DPC)** oversees compliance in Ireland — dataprotection.ie
- International transfers of personal data (e.g., to US-based Anthropic) require appropriate safeguards under GDPR Chapter V

---

## Risk Assessment by Use Case

### LOW RISK: General Legal Research

**Safe to use through any deployment:**

```
Example: "What does Section 2 of the Non-Fatal Offences Against the Person Act 1997 say about assault?"
```

- No client identity involved
- No case-specific facts
- Publicly available legal information

### MEDIUM RISK: Anonymized Queries

**Use with caution:**

```
Example: "What are the penalties for tax evasion under the Taxes Consolidation Act 1997?"
```

- Query pattern may reveal the nature of a matter you are working on
- Anthropic/Vercel logs may link queries to your API key

### HIGH RISK: Client-Specific Queries

**DO NOT USE through cloud AI services:**

- Remove ALL identifying details
- Use the local npm package with a self-hosted LLM
- Or use commercial legal databases (Westlaw Ireland, LexisNexis Ireland) with proper data processing agreements

---

## Data Collection by This Tool

### What This Tool Collects

**Nothing.** This Tool:

- Does NOT log queries
- Does NOT store user data
- Does NOT track usage
- Does NOT use analytics
- Does NOT set cookies

The database is read-only. No user data is written to disk.

### What Third Parties May Collect

- **Anthropic** (if using Claude): Subject to [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy)
- **Vercel** (if using remote endpoint): Subject to [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)

---

## Recommendations

### For Solo Practitioners / Small Firms

1. Use local npm package for maximum privacy
2. General research: Cloud AI is acceptable for non-client queries
3. Client matters: Use commercial legal databases (Westlaw Ireland, LexisNexis Ireland) with proper data processing agreements

### For Large Firms / Corporate Legal

1. Negotiate Data Processing Agreements with AI service providers before any client data is transmitted
2. Consider on-premise deployment with self-hosted LLM
3. Train staff on safe vs. unsafe query patterns
4. Review DPC guidance on AI and data protection

### For Government / Public Sector

1. Use self-hosted deployment, no external APIs
2. Follow Irish government IT security requirements
3. Air-gapped option available for sensitive matters

---

## Questions and Support

- **Privacy Questions**: Open issue on [GitHub](https://github.com/Ansvar-Systems/Irish-law-mcp/issues)
- **Anthropic Privacy**: Contact privacy@anthropic.com
- **Law Society Guidance**: Consult the Law Society of Ireland ethics guidance at lawsociety.ie
- **Bar of Ireland Guidance**: Consult Bar of Ireland professional guidance at lawlibrary.ie
- **DPC Guidance**: Consult dataprotection.ie for data protection queries

---

**Last Updated**: 2026-03-06
**Tool Version**: 1.0.0
