# mcp-eu-sparql

## Instalacja (jedna komenda)

Opublikowany na npm + MCP Registry (`io.github.matematicsolutions/mcp-eu-sparql`). Uruchomienie bez klonowania:

```bash
npx -y @matematicsolutions/mcp-eu-sparql
```

Konfiguracja klienta MCP (stdio):

```json
{ "mcpServers": { "mcp-eu-sparql": { "command": "npx", "args": ["-y", "@matematicsolutions/mcp-eu-sparql"] } } }
```

(Budowanie ze źródeł — niżej.)

[![MCP](https://img.shields.io/badge/MCP-Server-blue)](https://modelcontextprotocol.io) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE) [![Node](https://img.shields.io/badge/Node-18%2B-brightgreen)](https://nodejs.org)

MCP server dla prawa UE i orzecznictwa CJEU przez Publications Office SPARQL
(Cellar / EUR-Lex) oraz decyzji krajowych organow ochrony danych przez GDPRhub.

Korpus CJEU w Cellar (SPARQL COUNT, 2026-07-08): **34 261 wyrokow (JUDG),
8 362 postanowien (ORDER), 14 480 opinii rzecznikow generalnych (OPIN_AG)** —
razem 57 103 orzeczen i opinii, kazde z CELEX + ECLI.

## Tooly

- **`search_by_celex(celex, lang?)`** — akt lub orzeczenie po numerze CELEX
  (np. `32016R0679` = RODO, `62018CJ0311` = Schrems II).
- **`search_by_date_range(date_from, date_to, document_type?, lang?, limit?)`**
  — akty z zakresu dat, opcjonalnie zawęzone do typu (REG / DIR / DEC / RECO / OPIN).
- **`search_cjeu(query?, date_from?, date_to?, document_type?, lang?, limit?)`** —
  wyroki (JUDG), postanowienia (ORDER) i opinie rzeczników generalnych (OPIN_AG)
  Trybunału Sprawiedliwości UE; opcjonalny keyword w tytule (strony sprawy,
  sygnatura, słowa kluczowe wyroku).
- **`search_cjeu_by_ecli(ecli, lang?)`** — orzeczenie CJEU po identyfikatorze
  ECLI (np. `ECLI:EU:C:2020:559` = Schrems II).
- **`search_gdprhub(query, limit?)`** — pełnotekstowe wyszukiwanie w
  [GDPRhub](https://gdprhub.eu) (wiki projektu noyb): decyzje krajowych organów
  ochrony danych z całej UE + komentarze do artykułów RODO. **Licencja treści:
  CC BY-NC-SA 4.0** — flagowana w polu `license` każdej citation.

Każda zwrotka zawiera `structuredContent.citations` z polami `title`, `url`,
`celex?`, `ecli?`, `publication_date?`, `document_type?`, `snippet?`, `license?` —
Patron czyta to pole i wystawia w panelu UI jako sekcję "Akty prawa UE (EUR-Lex / CJEU)".

## Stack

- Node 18+
- `@modelcontextprotocol/sdk`
- Stdio transport (jak `mcp-saos`)
- Backend: HTTP POST na `https://publications.europa.eu/webapi/rdf/sparql`
  z `format=application/sparql-results+json`; GET na `https://gdprhub.eu/api.php`
  (MediaWiki API)

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
    "args": ["C:/Users/<TWOJ-UZYTKOWNIK>/mcp-saos/dist/index.js"]
  },
  {
    "name": "eu-sparql",
    "transport": "stdio",
    "command": "node",
    "args": ["C:/Users/<TWOJ-UZYTKOWNIK>/mcp-eu-sparql/dist/index.js"]
  }
]
```

## Testy

```bash
npm run drift          # offline: INSTRUCTIONS spójne z TOOLS i ErrorCode
npm run test:offline   # offline: query buildery + parsery na fixtures (zero sieci)
npm run smoke          # live: wszystkie 5 tooli przeciwko Cellar + GDPRhub
```

## Licencja

MIT.

## Part of the MateMatic legal stack

This server is one of five MCP connectors covering Polish jurisdiction +
EU law, used by [Patron](https://github.com/matematicsolutions/patron)
(AGPL-3.0) and any other MCP-aware legal AI agent.

- **mcp-eu-sparql** (this repo) — EU law + CJEU (EUR-Lex / Cellar)
- [mcp-saos](https://github.com/matematicsolutions/mcp-saos) — common courts, SN, TK, KIO
- [mcp-nsa](https://github.com/matematicsolutions/mcp-nsa) — NSA + 16 WSA administrative courts
- [mcp-isap](https://github.com/matematicsolutions/mcp-isap) — Polish legislation (Dz.U. + M.P.)
- [mcp-krs](https://github.com/matematicsolutions/mcp-krs) — Polish company registry (KRS)


All five MCP servers share the same `structuredContent.citations`
contract: each tool returns an array of `{title, url, snippet?, ...metadata}`
that legal agents can render directly in their citation panel.

See [matematicsolutions/.github](https://github.com/matematicsolutions)
for the full org profile.
