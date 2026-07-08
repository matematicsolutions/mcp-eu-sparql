# AGENTS.md - mcp-eu-sparql

A file following the [agents.md](https://agents.md) standard (Linux Foundation / Agentic AI Foundation) - canonical instructions for AI agents working with this repository. Read natively by Cursor, Codex (OpenAI), Jules (Google), Devin / Windsurf, Aider, Amp, Factory, GitHub Copilot.

## Project goal

An **MCP (Model Context Protocol)** server for **European Union law and CJEU case law** - via the official **Publications Office SPARQL** endpoint (`publications.europa.eu/webapi/rdf/sparql`) and the **Cellar** knowledge graph (CDM ontology) - plus **national data-protection authority decisions** via the official **GDPRhub** MediaWiki API (`gdprhub.eu/api.php`, content CC BY-NC-SA 4.0).

One of the 5 Polish-law MateMatic connectors ([`mcp-saos`](https://github.com/matematicsolutions/mcp-saos), [`mcp-nsa`](https://github.com/matematicsolutions/mcp-nsa), [`mcp-isap`](https://github.com/matematicsolutions/mcp-isap), [`mcp-krs`](https://github.com/matematicsolutions/mcp-krs), [`mcp-eu-sparql`](https://github.com/matematicsolutions/mcp-eu-sparql) (this one)).

## MateMatic context (HARD CONSTRAINTS)

The repo is run by [MateMatic Solutions](https://matematicsolutions.com).

- **Every tool call MUST return `structuredContent.citations`** with: the CELEX identifier, the act title, the canonical URL (EUR-Lex), the publication date, and the access format (document format + language).
- **CELEX is critical** - e.g. the AI Act = `32024R1689`. Without CELEX there is no citability.
- **Stateless**.
- **Multilingual** - EU acts are published in 24 languages, default = `pl`, but the `language?` parameter for CJEU in English/French where no Polish version exists.

## MCP tools (tools contract)

| Tool | Key parameters | Returns |
|---|---|---|
| `search_by_celex` | `celex` (e.g. `32024R1689`, `62018CJ0311`), `lang?` | act/judgment metadata + ECLI (case-law) + citations |
| `search_by_date_range` | `date_from`, `date_to`, `document_type?` (REG/DIR/DEC/RECO/OPIN), `lang?`, `limit?` | list of acts + citations |
| `search_cjeu` | `query?` (keyword in title), `date_from?`, `date_to?`, `document_type?` (JUDG/ORDER/OPIN_AG), `lang?`, `limit?` | CJEU judgments (CELEX + ECLI) + citations |
| `search_cjeu_by_ecli` | `ecli` (e.g. `ECLI:EU:C:2020:559`), `lang?` | CJEU judgment (CELEX + date + title) + citations |
| `search_gdprhub` | `query`, `limit?` | DPA decisions / GDPR commentary (title + url + snippet + `license: CC BY-NC-SA 4.0`) |

Full description: `src/index.ts` + `README.md`.

## Build and test

```bash
npm install        # Node 20+
npm run build      # tsc -> dist/
npm start          # node dist/index.js
npm run dev        # ts-node src/index.ts
```

Test: `npm run drift` + `npm run test:offline` (offline, fixtures) + `npm run smoke` (live, 5 tools).
Interactively: `npx @modelcontextprotocol/inspector node dist/index.js`.

Test CELEX for the AI Act: `32024R1689`. Test ECLI: `ECLI:EU:C:2020:559` (Schrems II).

## Code rules

- **TypeScript strict**.
- **`@modelcontextprotocol/sdk` ^1.12.0**.
- **SPARQL query templates** in `src/queries.ts` (pure functions, tested offline) - not inline in handlers. CDM Resource-Type mappings there too (`RESOURCE_TYPES`). NOTE: CJEU orders = `.../ORDER` (8,362 works), NOT `.../ORDER_CJ` (0 works - silent no-op fixed in 1.2.0).
- **Parsing/citations** in `src/format.ts` (pure functions).
- **No Polish characters in commit messages**.
- **CHANGELOG bump on any contract change**.

## What NOT to do (hard rules)

- **Do NOT omit CELEX** in a citation - CELEX is the stable identifier of an EU act.
- **Do NOT assume a single language version** - check PL availability, fall back to EN for CJEU.
- **Do NOT add scraping of EUR-Lex or GDPRhub** - we have the official SPARQL endpoint and the official MediaWiki API.
- **Do NOT omit the `license` field for GDPRhub** - the content is CC BY-NC-SA 4.0 (non-commercial); flagging it in every citation is a condition of using this source.
- **Do NOT cache results** - EU acts can change status (consolidated versions).

## Sources of truth

1. [README.md](./README.md)
2. [CHANGELOG.md](./CHANGELOG.md)
3. `src/index.ts` + `src/queries.ts` + `src/format.ts`
4. [Publications Office SPARQL endpoint](https://publications.europa.eu/webapi/rdf/sparql) - upstream
5. [Cellar CDM ontology](https://op.europa.eu/o/opportal-service/euvoc-download-handler?cellarURI=http%3A%2F%2Fpublications.europa.eu%2Fresource%2Fdistribution%2Fcdm%2F20231121-0%2Fzip) - RDF schema
6. [EUR-Lex](https://eur-lex.europa.eu) - user-facing frontend

## Agent compatibility

The [AGENTS.md](https://agents.md) standard. For Claude Code, an additional [CLAUDE.md](./CLAUDE.md) file.

## License

**MIT** - see [LICENSE](./LICENSE).

Citation: *MateMatic Solutions (2026), mcp-eu-sparql - MCP server for EU law and CJEU (Publications Office SPARQL), https://github.com/matematicsolutions/mcp-eu-sparql, MIT.*
