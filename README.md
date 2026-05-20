# mcp-eu-sparql

MCP server dla prawa UE i orzecznictwa CJEU przez Publications Office SPARQL
(Cellar / EUR-Lex).

## Tooly

- **`search_by_celex(celex, lang?)`** — pojedynczy akt po numerze CELEX
  (np. `32016R0679` = RODO).
- **`search_by_date_range(date_from, date_to, document_type?, lang?, limit?)`**
  — akty z zakresu dat, opcjonalnie zawęzone do typu (REG / DIR / DEC / RECO / OPIN).
- **`search_cjeu(date_from?, date_to?, lang?, limit?)`** — wyroki (JUDG)
  i postanowienia (ORDER) Trybunału Sprawiedliwości UE.

Każda zwrotka zawiera `structuredContent.citations` z polami `title`, `url` (EUR-Lex),
`celex`, `publication_date`, `document_type` — Patron czyta to pole i wystawia
w panelu UI jako sekcję "Akty prawa UE (EUR-Lex / CJEU)".

## Stack

- Node 18+
- `@modelcontextprotocol/sdk`
- Stdio transport (jak `mcp-saos`)
- Backend: HTTP POST na `https://publications.europa.eu/webapi/rdf/sparql`
  z `format=application/sparql-results+json`

## Build + uruchomienie

```bash
npm install
npm run build
node dist/index.js   # uruchomi serwer na stdio
```

## Wpięcie do Patrona

W `patron/backend/mcp-servers.json`:

```json
[
  {
    "name": "saos",
    "transport": "stdio",
    "command": "node",
    "args": ["C:/Users/Wieslaw/mcp-saos/dist/index.js"]
  },
  {
    "name": "eu-sparql",
    "transport": "stdio",
    "command": "node",
    "args": ["C:/Users/Wieslaw/mcp-eu-sparql/dist/index.js"]
  }
]
```

## Smoke test

```bash
# RODO po CELEX, tytuł po polsku
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_by_celex","arguments":{"celex":"32016R0679","lang":"POL"}}}' \
  | node dist/index.js
```

Powinno zwrócić `Rozporzadzenie Parlamentu Europejskiego ...` z polskim tytułem
i URL EUR-Lex.

## Licencja

MIT.
