/**
 * Tool registry for Irish Law MCP Server.
 * Shared between stdio (index.ts) and HTTP (api/mcp.ts) entry points.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';

import { searchLegislation, SearchLegislationInput } from './search-legislation.js';
import { getProvision, GetProvisionInput } from './get-provision.js';
import { validateCitationTool, ValidateCitationInput } from './validate-citation.js';
import { buildLegalStance, BuildLegalStanceInput } from './build-legal-stance.js';
import { formatCitationTool, FormatCitationInput } from './format-citation.js';
import { checkCurrency, CheckCurrencyInput } from './check-currency.js';
import { getEUBasis, GetEUBasisInput } from './get-eu-basis.js';
import { getIrishImplementations, GetIrishImplementationsInput } from './get-irish-implementations.js';
import { searchEUImplementations, SearchEUImplementationsInput } from './search-eu-implementations.js';
import { getProvisionEUBasis, GetProvisionEUBasisInput } from './get-provision-eu-basis.js';
import { validateEUCompliance, ValidateEUComplianceInput } from './validate-eu-compliance.js';
import { listSources } from './list-sources.js';
import { getAbout, type AboutContext } from './about.js';
export type { AboutContext } from './about.js';

const ABOUT_TOOL: Tool = {
  name: 'about',
  description:
    'Return server metadata, dataset statistics, data freshness, provenance, and security posture. ' +
    'Call this first to verify data coverage, currency, and content basis before relying on results. ' +
    'Returns: server name/version, dataset fingerprint and build date, document/provision counts, ' +
    'source authority details, and security model (read-only, no network/filesystem/code execution). ' +
    'Use this when you need to assess whether this server has the data you need.',
  inputSchema: { type: 'object', properties: {} },
};

export const TOOLS: Tool[] = [
  {
    name: 'search_legislation',
    description:
      'Full-text search across Irish statute provisions using FTS5 with BM25 relevance ranking. ' +
      'Use this to find provisions mentioning specific legal concepts, terms, or phrases. ' +
      'Returns: document_id, document_title, provision_ref, chapter, section, title, text snippet (with >>> <<< highlighting), and relevance score. ' +
      'Supports FTS5 query syntax: quoted phrases ("data protection"), AND/OR/NOT operators. ' +
      'Plain terms are automatically prefix-expanded (e.g., "protect" matches "protection"). ' +
      'To narrow results, use document_id to search within one statute, or status to filter by in_force/amended/repealed. ' +
      'Do NOT use this to retrieve a specific known provision — use get_provision instead. ' +
      'Coverage: 3,972 Irish statutes from 1922 to present sourced from eISB.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query. Plain terms are prefix-expanded. Supports FTS5 syntax: "data protection" (exact phrase), term1 AND term2, term1 OR term2, NOT term. Example: "personal data" AND processing',
        },
        document_id: {
          type: 'string',
          description: 'Filter to a specific statute by its identifier (e.g., "act-2018-7" for Data Protection Act 2018). Use list_sources or search first to discover valid IDs.',
        },
        status: {
          type: 'string',
          enum: ['in_force', 'amended', 'repealed'],
          description: 'Filter by legislative status. Default: all statuses returned.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return. Default: 10, maximum: 50. Higher values use more tokens.',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description:
      'Retrieve the full text of a specific provision (section) from an Irish statute, or all provisions if no section is specified. ' +
      'Use this when you know which statute and optionally which section you need. ' +
      'Returns: document_id, document_title, document_status, provision_ref, chapter, section, title, and full content text. ' +
      'The document_id can be the internal identifier (e.g., "act-2018-7") or the statute title (e.g., "Data Protection Act 2018") — the server resolves both. ' +
      'If only document_id is given (no section/provision_ref), returns ALL provisions for that statute ordered by structure. ' +
      'Warning: retrieving all provisions for a large statute may return significant text. ' +
      'Do NOT use this for keyword searches — use search_legislation instead.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Statute identifier (e.g., "act-2018-7") or title (e.g., "Data Protection Act 2018"). Required.',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "3" or "12"). Maps to provision_ref internally.',
        },
        provision_ref: {
          type: 'string',
          description: 'Direct provision reference (e.g., "s1", "s3"). Takes precedence over section if both provided.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'list_sources',
    description:
      'Enumerate all data sources, coverage scope, provenance metadata, and dataset statistics for this server. ' +
      'Returns: jurisdiction, source names with authority/URL/coverage/license, document and provision counts, ' +
      'year range of legislation, database tier, schema version, and build date. ' +
      'Call this to understand what data is available before performing searches. ' +
      'Useful for verifying whether a specific time period or legal domain is covered.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'validate_citation',
    description:
      'Validate an Irish legal citation against the database to prevent hallucinated references. ' +
      'Parses the citation string, checks whether the statute and provision exist, and reports any issues. ' +
      'Returns: parsed citation components, formatted_citation, valid (boolean), document_exists, provision_exists, and warnings array. ' +
      'Accepted formats: "Section 3, Data Protection Act 2018" (full) or "s. 3 DPA 2018" (short). ' +
      'Use this AFTER generating a citation to verify it references real legislation. ' +
      'Also detects repealed statutes and warns accordingly. ' +
      'Do NOT use this to search for legislation — use search_legislation instead.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'Citation string to validate. Examples: "Section 3, Data Protection Act 2018", "s. 1 Criminal Justice Act 2001"',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'build_legal_stance',
    description:
      'Aggregate relevant provisions across Irish statutes for a legal question or topic. ' +
      'Performs a broad FTS search and returns ranked provisions with context. ' +
      'Returns: array of provisions with document_id, document_title, provision_ref, content, and relevance ranking. ' +
      'Use this when researching a legal topic and you need multiple supporting provisions from different statutes. ' +
      'For a specific known provision, use get_provision. For simple keyword search, use search_legislation.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Legal question or topic to research. Example: "employer obligations for data processing"',
        },
        document_id: {
          type: 'string',
          description: 'Optionally limit results to one statute.',
        },
        limit: {
          type: 'number',
          description: 'Maximum results per category. Default: 5, maximum: 20.',
          default: 5,
          minimum: 1,
          maximum: 20,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'format_citation',
    description:
      'Format an Irish legal citation per standard conventions. ' +
      'Returns the citation in the requested format: full ("Section 1, Data Protection Act 2018"), ' +
      'short ("s. 1 DPA 2018"), or pinpoint ("Data Protection Act 2018, s. 1(2)(a)"). ' +
      'This is a pure formatting operation — it does NOT validate against the database. ' +
      'To validate, use validate_citation after formatting.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'Citation string to format. Example: "Section 1, Data Protection Act 2018"',
        },
        format: {
          type: 'string',
          enum: ['full', 'short', 'pinpoint'],
          description: 'Output format. "full" = verbose, "short" = abbreviated, "pinpoint" = subsection-level. Default: "full".',
          default: 'full',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'check_currency',
    description:
      'Check whether an Irish statute or provision is currently in force, amended, or repealed. ' +
      'Returns: document_id, status, is_current (boolean), and warnings array. ' +
      'Use this to verify legislative currency before citing a provision. ' +
      'Accepts document_id as identifier or title. Optionally check a specific provision_ref.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Statute identifier (e.g., "act-2018-7") or title (e.g., "Data Protection Act 2018").',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional provision reference to check (e.g., "s1").',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_eu_basis',
    description:
      'Get the EU legal basis (directives and regulations) that an Irish statute implements or references. ' +
      'Returns: array of EU documents with CELEX numbers, reference_type (implements/supplements/applies/cites), ' +
      'implementation_status, and optionally specific EU article references. ' +
      'Also returns statistics: total_eu_references, directive_count, regulation_count. ' +
      'Use this to trace Irish law back to its EU legal basis. ' +
      'Ireland is an EU member state — many Irish statutes transpose EU directives. ' +
      'For provision-level EU basis, use get_provision_eu_basis instead.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Irish statute identifier (e.g., "act-2018-7" for Data Protection Act 2018).',
        },
        include_articles: {
          type: 'boolean',
          description: 'Include specific EU article references in the response. Default: false.',
          default: false,
        },
        reference_types: {
          type: 'array',
          items: { type: 'string', enum: ['implements', 'supplements', 'applies', 'cites', 'cites_article'] },
          description: 'Filter by reference type. Default: all types returned.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_irish_implementations',
    description:
      'Find all Irish statutes that implement a specific EU directive or regulation. ' +
      'Returns: array of Irish statutes with document_id, title, status, reference_type, and implementation_status. ' +
      'Use this to find how Ireland has transposed a particular EU instrument into national law. ' +
      'The eu_document_id format is "type:year/number" (e.g., "regulation:2016/679" for GDPR, "directive:2016/680" for LED). ' +
      'Use search_eu_implementations to discover available EU documents first if you do not know the ID.',
    inputSchema: {
      type: 'object',
      properties: {
        eu_document_id: {
          type: 'string',
          description: 'EU document identifier in "type:year/number" format. Examples: "regulation:2016/679" (GDPR), "directive:2016/680" (Law Enforcement Directive).',
        },
        primary_only: {
          type: 'boolean',
          description: 'Return only primary implementing statutes (not supplementary references). Default: false.',
          default: false,
        },
        in_force_only: {
          type: 'boolean',
          description: 'Return only statutes currently in force. Default: false.',
          default: false,
        },
      },
      required: ['eu_document_id'],
    },
  },
  {
    name: 'search_eu_implementations',
    description:
      'Search for EU directives and regulations that have Irish implementation records. ' +
      'Returns: array of EU documents with title, CELEX number, type, year, and Irish implementation count. ' +
      'Use this to discover which EU instruments are covered and how Ireland has implemented them. ' +
      'Supports keyword search and filtering by type (directive/regulation) and year range. ' +
      'To get the actual Irish implementing statutes, pass the eu_document_id to get_irish_implementations.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword search across EU document titles. Example: "data protection", "cybersecurity".',
        },
        type: {
          type: 'string',
          enum: ['directive', 'regulation'],
          description: 'Filter by EU instrument type.',
        },
        year_from: {
          type: 'number',
          description: 'Include EU documents from this year onwards.',
        },
        year_to: {
          type: 'number',
          description: 'Include EU documents up to this year.',
        },
        has_irish_implementation: {
          type: 'boolean',
          description: 'If true, only return EU documents that have at least one Irish implementing statute.',
        },
        limit: {
          type: 'number',
          description: 'Maximum results. Default: 20, maximum: 100.',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_provision_eu_basis',
    description:
      'Get the EU legal basis for a specific provision within an Irish statute. ' +
      'Returns: array of EU references at the provision level with CELEX number, reference_type, and context. ' +
      'More granular than get_eu_basis which operates at the statute level. ' +
      'Use this when you need to know exactly which EU article a specific Irish section implements.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Irish statute identifier (e.g., "act-2018-7").',
        },
        provision_ref: {
          type: 'string',
          description: 'Provision reference within the statute (e.g., "s3", "3").',
        },
      },
      required: ['document_id', 'provision_ref'],
    },
  },
  {
    name: 'validate_eu_compliance',
    description:
      'Validate the EU compliance status of an Irish statute or provision. ' +
      'Checks whether the statute has EU references and reports implementation status (full/partial/pending/unknown). ' +
      'Optionally check compliance with a specific EU document. ' +
      'Returns: compliance assessment with implementation_status, reference details, and any gaps. ' +
      'Use this for compliance audits to verify Irish transposition of EU law.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Irish statute identifier (e.g., "act-2018-7").',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional provision reference for provision-level compliance check.',
        },
        eu_document_id: {
          type: 'string',
          description: 'Optional EU document to check compliance against (e.g., "regulation:2016/679").',
        },
      },
      required: ['document_id'],
    },
  },
];

export function buildTools(context?: AboutContext): Tool[] {
  return context ? [...TOOLS, ABOUT_TOOL] : TOOLS;
}

export function registerTools(
  server: Server,
  db: InstanceType<typeof Database>,
  context?: AboutContext,
): void {
  const allTools = buildTools(context);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_legislation':
          result = await searchLegislation(db, args as unknown as SearchLegislationInput);
          break;
        case 'get_provision':
          result = await getProvision(db, args as unknown as GetProvisionInput);
          break;
        case 'list_sources':
          result = listSources(db);
          break;
        case 'validate_citation':
          result = await validateCitationTool(db, args as unknown as ValidateCitationInput);
          break;
        case 'build_legal_stance':
          result = await buildLegalStance(db, args as unknown as BuildLegalStanceInput);
          break;
        case 'format_citation':
          result = await formatCitationTool(args as unknown as FormatCitationInput);
          break;
        case 'check_currency':
          result = await checkCurrency(db, args as unknown as CheckCurrencyInput);
          break;
        case 'get_eu_basis':
          result = await getEUBasis(db, args as unknown as GetEUBasisInput);
          break;
        case 'get_irish_implementations':
          result = await getIrishImplementations(db, args as unknown as GetIrishImplementationsInput);
          break;
        case 'search_eu_implementations':
          result = await searchEUImplementations(db, args as unknown as SearchEUImplementationsInput);
          break;
        case 'get_provision_eu_basis':
          result = await getProvisionEUBasis(db, args as unknown as GetProvisionEUBasisInput);
          break;
        case 'validate_eu_compliance':
          result = await validateEUCompliance(db, args as unknown as ValidateEUComplianceInput);
          break;
        case 'about':
          if (context) {
            result = getAbout(db, context);
          } else {
            return {
              content: [{ type: 'text', text: 'About tool not configured.' }],
              isError: true,
            };
          }
          break;
        default:
          return {
            content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}
