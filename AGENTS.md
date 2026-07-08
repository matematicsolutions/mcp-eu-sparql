# AGENTS.md - mcp-eu-sparql

Plik standardu [agents.md](https://agents.md) (Linux Foundation / Agentic AI Foundation) - kanoniczne instrukcje dla agentow AI pracujacych z tym repozytorium. Czytany natywnie przez Cursor, Codex (OpenAI), Jules (Google), Devin / Windsurf, Aider, Amp, Factory, GitHub Copilot.

## Cel projektu

Serwer **MCP (Model Context Protocol)** dla **prawa Unii Europejskiej i orzecznictwa CJEU** - przez oficjalny endpoint **SPARQL Publications Office** (`publications.europa.eu/webapi/rdf/sparql`) i graf wiedzy **Cellar** (ontologia CDM) - oraz **decyzji krajowych organow ochrony danych** przez oficjalne API MediaWiki **GDPRhub** (`gdprhub.eu/api.php`, tresc CC BY-NC-SA 4.0).

Jeden z 5 konektorow polskiego prawa MateMatic ([`mcp-saos`](https://github.com/matematicsolutions/mcp-saos), [`mcp-nsa`](https://github.com/matematicsolutions/mcp-nsa), [`mcp-isap`](https://github.com/matematicsolutions/mcp-isap), [`mcp-krs`](https://github.com/matematicsolutions/mcp-krs), [`mcp-eu-sparql`](https://github.com/matematicsolutions/mcp-eu-sparql) (ten)).

## Kontekst MateMatic (TWARDE OGRANICZENIA)

Repo prowadzi [MateMatic Solutions](https://matematicsolutions.com).

- **Kazde wywolanie narzedzia MUSI zwracac `structuredContent.citations`** z: identyfikatorem CELEX, tytulem aktu, URL kanonicznym (EUR-Lex), data publikacji, formatem dostepu (format dokumentu + jezyk).
- **CELEX jest kluczowy** - np. AI Act = `32024R1689`. Bez CELEX brak cytowalnosci.
- **Stateless**.
- **Wielojezycznosc** - akty UE sa publikowane w 24 jezykach, default = `pl`, ale parametr `language?` dla CJEU w angielskim/francuskim gdzie polska wersja nie istnieje.

## Narzedzia MCP (tools contract)

| Tool | Parametry kluczowe | Zwraca |
|---|---|---|
| `search_by_celex` | `celex` (np. `32024R1689`, `62018CJ0311`), `lang?` | metadata aktu/orzeczenia + ECLI (case-law) + citations |
| `search_by_date_range` | `date_from`, `date_to`, `document_type?` (REG/DIR/DEC/RECO/OPIN), `lang?`, `limit?` | lista aktow + citations |
| `search_cjeu` | `query?` (keyword w tytule), `date_from?`, `date_to?`, `document_type?` (JUDG/ORDER/OPIN_AG), `lang?`, `limit?` | orzeczenia CJEU (CELEX + ECLI) + citations |
| `search_cjeu_by_ecli` | `ecli` (np. `ECLI:EU:C:2020:559`), `lang?` | orzeczenie CJEU (CELEX + data + tytul) + citations |
| `search_gdprhub` | `query`, `limit?` | decyzje DPA / komentarze RODO (title + url + snippet + `license: CC BY-NC-SA 4.0`) |

Pelny opis: `src/index.ts` + `README.md`.

## Build i test

```bash
npm install        # Node 20+
npm run build      # tsc -> dist/
npm start          # node dist/index.js
npm run dev        # ts-node src/index.ts
```

Test: `npm run drift` + `npm run test:offline` (offline, fixtures) + `npm run smoke` (live, 5 tooli).
Interaktywnie: `npx @modelcontextprotocol/inspector node dist/index.js`.

Testowy CELEX dla AI Act: `32024R1689`. Testowe ECLI: `ECLI:EU:C:2020:559` (Schrems II).

## Zasady kodu

- **TypeScript strict**.
- **`@modelcontextprotocol/sdk` ^1.12.0**.
- **SPARQL query templates** w `src/queries.ts` (czyste funkcje, testowane offline) - nie inline w handlerach. Mapowania Resource-Type CDM tamze (`RESOURCE_TYPES`). UWAGA: postanowienia CJEU = `.../ORDER` (8 362 works), NIE `.../ORDER_CJ` (0 works - cichy no-op naprawiony w 1.2.0).
- **Parsowanie/citations** w `src/format.ts` (czyste funkcje).
- **Bez polskich znakow w commit messages**.
- **CHANGELOG bump przy zmianie kontraktu**.

## Czego NIE robic (twarde reguly)

- **NIE pomijaj CELEX** w citation - CELEX jest stabilnym identyfikatorem aktu UE.
- **NIE zakladaj jednej wersji jezykowej** - sprawdz dostepnosc PL, fallback na EN dla CJEU.
- **NIE dodawaj scrapingu EUR-Lex ani GDPRhub** - mamy oficjalny SPARQL endpoint i oficjalne API MediaWiki.
- **NIE pomijaj pola `license` dla GDPRhub** - tresc jest CC BY-NC-SA 4.0 (niekomercyjna); flaga w kazdej citation to warunek uzycia tego zrodla.
- **NIE cachuj wynikow** - akty UE moga zmieniac status (konsolidowane wersje).

## Zrodla prawdy

1. [README.md](./README.md)
2. [CHANGELOG.md](./CHANGELOG.md)
3. `src/index.ts` + `src/queries.ts` + `src/format.ts`
4. [SPARQL endpoint Publications Office](https://publications.europa.eu/webapi/rdf/sparql) - upstream
5. [Ontologia CDM Cellar](https://op.europa.eu/o/opportal-service/euvoc-download-handler?cellarURI=http%3A%2F%2Fpublications.europa.eu%2Fresource%2Fdistribution%2Fcdm%2F20231121-0%2Fzip) - schema RDF
6. [EUR-Lex](https://eur-lex.europa.eu) - frontend uzytkownika

## Kompatybilnosc agentow

Standard [AGENTS.md](https://agents.md). Dla Claude Code dodatkowo plik [CLAUDE.md](./CLAUDE.md).

## Licencja

**MIT** - patrz [LICENSE](./LICENSE).

Cytowanie: *MateMatic Solutions (2026), mcp-eu-sparql - MCP server dla prawa UE i CJEU (Publications Office SPARQL), https://github.com/matematicsolutions/mcp-eu-sparql, MIT.*
