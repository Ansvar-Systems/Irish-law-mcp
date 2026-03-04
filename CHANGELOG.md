# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-02-22

### Added
- Initial release with full Irish legislation corpus (3,972 statutes, 91,528 provisions)
- 14 MCP tools for legal research (search, retrieval, citation, EU cross-references)
- Full-text search across all provisions
- EU cross-reference support (get_eu_basis, get_irish_implementations, validate_eu_compliance)
- Citation validation and formatting tools
- Legal stance builder
- Currency checking
- Golden contract tests and drift detection
- Daily freshness checks against irishstatutebook.ie
- Vercel Streamable HTTP deployment
- 6-layer security CI/CD pipeline (CodeQL, Semgrep, Trivy, Gitleaks, npm audit, OSSF Scorecard)
