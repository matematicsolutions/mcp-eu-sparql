# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) +
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-20

Initial public release.

EU legislation + CJEU case law via Publications Office SPARQL (EUR-Lex / Cellar). 3 tools: search_by_celex / search_by_date_range / search_cjeu.

### Highlights

- Node 18+ stdio MCP server, single `dist/index.js` entry.
- LIVE smoke-tested on real data.
- `structuredContent.citations` consumed by [Patron](https://github.com/matematicsolutions/patron)
  and any other MCP-aware legal agent.
- MIT license, 500 ms request throttle, zero secrets required.

[1.0.0]: https://github.com/matematicsolutions/mcp-eu-sparql/releases/tag/v1.0.0
