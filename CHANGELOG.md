# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) +
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-05-25

Retrofit do kanonu MCP MateMatic (pattern z dograh-hq/dograh v1.31.0, BSD-2). **Backward-compatible**.

### Added

- `instructions` w konstruktorze Server (procedural orchestration: kolejnosc wywolan, CELEX kluczowy, wielojezycznosc 24 PL/ENG/FRA/DEU, stateless bez cache, iteracja po bledach).
- `ToolAnnotations` per tool (`readOnlyHint`, `openWorldHint=true` bo SPARQL endpoint live).
- Strukturalne `ErrorCode`: `missing_arg`, `invalid_date`, `upstream_error`, `empty_result`. Format `[code] tekst` + `structuredContent.error_code`.
- Walidacja formatu YYYY-MM-DD i kolejnosci dat (`invalid_date`) przed wyslaniem SPARQL.
- Drift test (`npm run drift`).

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
