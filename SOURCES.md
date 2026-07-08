# Sources ledger - European Union (EU)

Machine-diffable record of every Legal Data Hunter (`worldwidelaw/legal-sources`) source we have
checked for this jurisdiction, and what we did about it. Purpose: the next gap-audit (PLAYBOOK.md
section 8) is a file diff against a fresh `manifest.yaml`, not a re-run of hours of research.

Update this file every time a widen-round touches this jurisdiction. One row per LDH source `id`.

Machine-read by `eu-legal-mcp/gap_scan.py`.

Sibling repo note: [`mcp-eu-compliance`](https://github.com/matematicsolutions/mcp-eu-compliance)
covers the OFFLINE channel of EU/EUR-Lex (verbatim corpus, 14 digital regulations, SQLite FTS5)
and keeps its own SOURCES.md. This repo is the LIVE channel (Cellar SPARQL + GDPRhub).

| LDH id | LDH name | LDH status @ check | Our status | Our tool(s) | Notes / rejection reason |
|---|---|---|---|---|---|
| EU/EUR-Lex | EUR-Lex (Cellar SPARQL) | complete | shipped | `search_by_celex`, `search_by_date_range` | live SPARQL discovery since 1.0.0 (2026-05-20); offline verbatim corpus channel = sibling repo mcp-eu-compliance |
| EU/CURIA | CJEU case law (CURIA) | complete | shipped | `search_cjeu`, `search_cjeu_by_ecli`, `search_by_celex` | shipped 1.2.0, 2026-07-08 - via the EXISTING Cellar SPARQL client, zero new infrastructure. Sector-6 CELEX totals (SPARQL COUNT 2026-07-08): JUDG 34,261 + ORDER 8,362 + OPIN_AG 14,480 = 57,103 decisions/opinions; 67,654 works carry ECLI. ECLI is an xsd:string literal - match via STR(). Caught + fixed silent no-op: ORDER type URI is `.../ORDER`, not `.../ORDER_CJ` (0 works) |
| EU/ECJ-Tax | ECJ tax case law | complete | shipped | `search_cjeu` (keyword/type filters) | duplicate slice of EU/CURIA - same Cellar corpus, filter by `query`/date; no separate client needed |
| EU/GDPRhub | GDPRhub - European DPA Decisions Wiki (noyb) | complete | shipped | `search_gdprhub` | shipped 1.2.0, 2026-07-08 - official MediaWiki API (`gdprhub.eu/api.php`, MW 1.43.5), live search verified (dedicated `totalhits` field). LICENSE: content CC BY-NC-SA 4.0 (NonCommercial, per API rightsinfo) - flagged in `license` field of every citation + INSTRUCTIONS warn before content reuse (IL HF-dataset precedent: ship with license flagged). LDH counts 3,237 DPA decisions from 30+ countries; wiki API statistics 2026-07-08: 4,986 articles / 8,983 pages |
| EU/EDPB | European Data Protection Board Documents | complete | rejected | - | `bot_protection` / no machine backend confirmed by us: Drupal JSON:API disabled (`/jsonapi` -> 404, `/api` -> 404), regular HTML listing pages -> HTTP 429 rate-limit on first request (probes 2026-07-08). No lookup could be confirmed live -> not shippable per never-ship-unconfirmed rule. STALE-REJ candidate: re-probe next round (429 may be transient WAF; LDH says complete) |
| EU/EDPB-OSSRegister | EDPB Art. 60 One-Stop-Shop Register | complete | todo | - | scrape-class per LDH notes (HTML scraping + pdfplumber, ~50% scanned PDFs) - off-principle, WM decides (PLAYBOOK sec 0.6) |
| EU/NLex | N-Lex (EU National Law Portal) | blocked | rejected | - | `duplicate` - pure search gateway, no documents/API (LDH agrees: blocked); national legislation covered by per-country connectors |
| EU/TED | EU Tenders Electronic Daily (TED) | complete | todo | - | fallback candidate, not needed this round (options 1 + 3 shipped); TED Search API v3, ~6.8M notices per LDH, no auth - strong candidate for a future round |
