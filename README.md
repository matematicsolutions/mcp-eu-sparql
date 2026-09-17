# mcp-eu-sparql

## Installation (one command)

Published on npm + the MCP Registry (`io.github.matematicsolutions/mcp-eu-sparql`). Run without cloning:

```bash
npx -y @matematicsolutions/mcp-eu-sparql
```

MCP client configuration (stdio):

```json
{ "mcpServers": { "mcp-eu-sparql": { "command": "npx", "args": ["-y", "@matematicsolutions/mcp-eu-sparql"] } } }
```

(Building from source - below.)

[![MCP](https://img.shields.io/badge/MCP-Server-blue)](https://modelcontextprotocol.io) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE) [![Node](https://img.shields.io/badge/Node-18%2B-brightgreen)](https://nodejs.org)

MCP server for EU law and CJEU case law via the Publications Office SPARQL
endpoint (Cellar / EUR-Lex), plus national data-protection authority decisions via GDPRhub.

CJEU corpus in Cellar (SPARQL COUNT, 2026-07-08): **34,261 judgments (JUDG),
8,362 orders (ORDER), 14,480 Advocate-General opinions (OPIN_AG)** -
57,103 judgments and opinions in total, each with CELEX + ECLI.

## Tools

- **`search_by_celex(celex, lang?)`** - act or judgment by CELEX number
  (e.g. `32016R0679` = GDPR, `62018CJ0311` = Schrems II).
- **`search_by_date_range(date_from, date_to, document_type?, lang?, limit?)`**
  - acts within a date range, optionally narrowed to a type (REG / DIR / DEC / RECO / OPIN).
- **`search_cjeu(query?, date_from?, date_to?, document_type?, lang?, limit?)`** -
  judgments (JUDG), orders (ORDER) and Advocate-General opinions (OPIN_AG)
  of the Court of Justice of the EU; optional keyword in the title (parties to the case,
  case number, keywords of the judgment).
- **`search_cjeu_by_ecli(ecli, lang?)`** - CJEU judgment by ECLI
  identifier (e.g. `ECLI:EU:C:2020:559` = Schrems II).
- **`search_gdprhub(query, limit?)`** - full-text search in
  [GDPRhub](https://gdprhub.eu) (the noyb project wiki): decisions of national
  data-protection authorities across the EU + commentary on GDPR articles. **Content license:
  CC BY-NC-SA 4.0** - flagged in the `license` field of every citation.

Every response includes `structuredContent.citations` with the fields `title`, `url`,
`celex?`, `ecli?`, `publication_date?`, `document_type?`, `snippet?`, `license?` -
Patron reads this field and renders it in the UI panel as the "EU legal acts (EUR-Lex / CJEU)" section.

## Stack

- Node 18+
- `@modelcontextprotocol/sdk`
- Stdio transport (like `mcp-saos`)
- Backend: HTTP POST to `https://publications.europa.eu/webapi/rdf/sparql`
  with `format=application/sparql-results+json`; GET to `https://gdprhub.eu/api.php`
  (MediaWiki API)

## Build + run

```bash
npm install
npm run build
node dist/index.js   # starts the server on stdio
```

## Wiring into Patron

In `patron/backend/mcp-servers.json`:

```json
[
  {
    "name": "saos",
    "transport": "stdio",
    "command": "node",
    "args": ["C:/Users/<YOUR-USER>/mcp-saos/dist/index.js"]
  },
  {
    "name": "eu-sparql",
    "transport": "stdio",
    "command": "node",
    "args": ["C:/Users/<YOUR-USER>/mcp-eu-sparql/dist/index.js"]
  }
]
```

## Tests

```bash
npm run drift          # offline: INSTRUCTIONS consistent with TOOLS and ErrorCode
npm run test:offline   # offline: query builders + parsers on fixtures (no network)
npm run smoke          # live: all 5 tools against Cellar + GDPRhub
```

## License

MIT.

## Part of MateMatic

This connector queries its source live. It is one of the Polish and EU source connectors bundled in [PATRON](https://github.com/matematicsolutions/patron) and works with any MCP client.

- Poland, one server for all sources: [prawo-pl-mcp](https://github.com/matematicsolutions/prawo-pl-mcp) · each source on its own: [mcp-saos](https://github.com/matematicsolutions/mcp-saos) · [mcp-nsa](https://github.com/matematicsolutions/mcp-nsa) · [mcp-isap](https://github.com/matematicsolutions/mcp-isap) · [mcp-krs](https://github.com/matematicsolutions/mcp-krs) · [mcp-eureka](https://github.com/matematicsolutions/mcp-eureka) · [kio-orzeczenia-mcp](https://github.com/matematicsolutions/kio-orzeczenia-mcp)
- European Union: **mcp-eu-sparql** (this repo) (live) · [mcp-eu-compliance](https://github.com/matematicsolutions/mcp-eu-compliance) (offline corpus)
- A prepared corpus of Polish and EU law with a citation graph: [Repertorium](https://github.com/matematicsolutions/repertorium)

`mcp-saos`, `mcp-nsa`, `mcp-isap`, `mcp-krs` and `mcp-eu-sparql` share one `structuredContent.citations`
contract: each tool returns an array of `{title, url, snippet?, ...metadata}`
that legal agents can render directly in their citation panel.

See [matematicsolutions/.github](https://github.com/matematicsolutions)
for the full org profile.
