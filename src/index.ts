#!/usr/bin/env node
// MCP server - EU legislation + CJEU case law via Publications Office SPARQL
// (Cellar / EUR-Lex). Stdio transport - wpinany do Patrona przez mcp-servers.json.
//
// Endpoint: https://publications.europa.eu/webapi/rdf/sparql
//
// Tooly:
//   - search_by_celex     - znajdz akt po sygnaturze CELEX
//   - search_by_date_range - akty z zakresu dat (REG/DIR/DEC + opcjonalnie typ)
//   - search_cjeu          - orzecznictwo CJEU z zakresu dat
//
// Kazda zwrotka zawiera structuredContent.citations - lista obiektow
// { title, url, snippet?, celex, publication_date?, document_type }.
// Patron czyta to pole automatycznie i wystawia w panelu UI.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// SPARQL client
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";
const HTTP_TIMEOUT_MS = 30000;

interface SparqlBinding {
    [key: string]: { type: string; value: string } | undefined;
}

interface SparqlResponse {
    head: { vars: string[] };
    results: { bindings: SparqlBinding[] };
}

async function runSparql(query: string): Promise<SparqlResponse> {
    const params = new URLSearchParams();
    params.set("query", query);
    params.set("format", "application/sparql-results+json");
    params.set("timeout", String(HTTP_TIMEOUT_MS));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS + 5000);
    try {
        const res = await fetch(SPARQL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/sparql-results+json",
            },
            body: params.toString(),
            signal: controller.signal,
        });
        if (!res.ok) {
            throw new Error(
                `SPARQL endpoint returned HTTP ${res.status} ${res.statusText}`,
            );
        }
        return (await res.json()) as SparqlResponse;
    } finally {
        clearTimeout(timer);
    }
}

// ---------------------------------------------------------------------------
// SPARQL queries
// ---------------------------------------------------------------------------

const PREFIXES = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dc:  <http://purl.org/dc/elements/1.1/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

// Mapowanie typu aktu (skrot uzytkownika) -> URI Resource-Type.
const RESOURCE_TYPES: Record<string, string> = {
    REG: "http://publications.europa.eu/resource/authority/resource-type/REG",
    DIR: "http://publications.europa.eu/resource/authority/resource-type/DIR",
    DEC: "http://publications.europa.eu/resource/authority/resource-type/DEC",
    RECO: "http://publications.europa.eu/resource/authority/resource-type/RECO",
    OPIN: "http://publications.europa.eu/resource/authority/resource-type/OPIN",
    JUDG: "http://publications.europa.eu/resource/authority/resource-type/JUDG",
    ORDER:
        "http://publications.europa.eu/resource/authority/resource-type/ORDER_CJ",
};

function searchByCelexQuery(celex: string, lang: string): string {
    // Eskapuj cudzyslowy w SPARQL - tylko " i \ wymagaja escape'u.
    const safeCelex = celex.replace(/["\\]/g, "\\$&");
    const safeLang = lang.replace(/["\\]/g, "\\$&");
    return `${PREFIXES}
SELECT DISTINCT ?work ?celex ?date ?type ?title
WHERE {
  ?work cdm:resource_legal_id_celex ?celex .
  FILTER(STR(?celex) = "${safeCelex}")
  OPTIONAL { ?work cdm:work_date_document ?date }
  OPTIONAL { ?work cdm:work_has_resource-type ?type }
  OPTIONAL {
    ?expr cdm:expression_belongs_to_work ?work ;
          cdm:expression_uses_language ?lang ;
          cdm:expression_title ?title .
    ?lang dc:identifier "${safeLang}" .
  }
}
LIMIT 1
`;
}

function searchByDateRangeQuery(
    dateFrom: string,
    dateTo: string,
    typeUri: string | null,
    lang: string,
    limit: number,
): string {
    const safeFrom = dateFrom.replace(/["\\]/g, "\\$&");
    const safeTo = dateTo.replace(/["\\]/g, "\\$&");
    const safeLang = lang.replace(/["\\]/g, "\\$&");
    const typeFilter = typeUri
        ? `?work cdm:work_has_resource-type <${typeUri}> .`
        : "";
    return `${PREFIXES}
SELECT DISTINCT ?work ?celex ?date ?type ?title
WHERE {
  ${typeFilter}
  ?work cdm:work_date_document ?date .
  OPTIONAL { ?work cdm:resource_legal_id_celex ?celex }
  OPTIONAL { ?work cdm:work_has_resource-type ?type }
  OPTIONAL {
    ?expr cdm:expression_belongs_to_work ?work ;
          cdm:expression_uses_language ?lang ;
          cdm:expression_title ?title .
    ?lang dc:identifier "${safeLang}" .
  }
  FILTER (?date >= "${safeFrom}"^^xsd:date && ?date <= "${safeTo}"^^xsd:date)
  FILTER NOT EXISTS { ?work cdm:do_not_index "true"^^xsd:boolean }
}
ORDER BY DESC(?date)
LIMIT ${limit}
`;
}

function searchCjeuQuery(
    dateFrom: string | null,
    dateTo: string | null,
    lang: string,
    limit: number,
): string {
    const safeLang = lang.replace(/["\\]/g, "\\$&");
    const dateFilter =
        dateFrom && dateTo
            ? `FILTER (?date >= "${dateFrom.replace(/["\\]/g, "\\$&")}"^^xsd:date && ?date <= "${dateTo.replace(/["\\]/g, "\\$&")}"^^xsd:date)`
            : "";
    return `${PREFIXES}
SELECT DISTINCT ?work ?celex ?date ?title
WHERE {
  { ?work cdm:work_has_resource-type <${RESOURCE_TYPES.JUDG}> }
  UNION
  { ?work cdm:work_has_resource-type <${RESOURCE_TYPES.ORDER}> }
  ?work cdm:work_date_document ?date .
  OPTIONAL { ?work cdm:resource_legal_id_celex ?celex }
  OPTIONAL {
    ?expr cdm:expression_belongs_to_work ?work ;
          cdm:expression_uses_language ?lang ;
          cdm:expression_title ?title .
    ?lang dc:identifier "${safeLang}" .
  }
  ${dateFilter}
  FILTER NOT EXISTS { ?work cdm:do_not_index "true"^^xsd:boolean }
}
ORDER BY DESC(?date)
LIMIT ${limit}
`;
}

// ---------------------------------------------------------------------------
// Citation builder
// ---------------------------------------------------------------------------

interface EuCitation {
    title: string;
    url: string;
    snippet?: string;
    celex?: string;
    publication_date?: string;
    document_type?: string;
}

function eurLexUrl(celex: string, lang: string = "PL"): string {
    return `https://eur-lex.europa.eu/legal-content/${lang}/TXT/?uri=CELEX:${encodeURIComponent(celex)}`;
}

function shortTypeFromUri(uri: string): string {
    // URI: http://publications.europa.eu/resource/authority/resource-type/REG
    const m = uri.match(/\/resource-type\/([A-Z_]+)$/);
    return m ? m[1] : uri;
}

function buildCitations(rows: SparqlBinding[], lang: string): EuCitation[] {
    const out: EuCitation[] = [];
    for (const row of rows) {
        const celex = row.celex?.value;
        if (!celex) continue;
        const title = row.title?.value;
        const date = row.date?.value;
        const typeUri = row.type?.value;
        out.push({
            title: title ?? celex,
            url: eurLexUrl(celex, lang === "POL" ? "PL" : "EN"),
            ...(date && { publication_date: date }),
            ...(celex && { celex }),
            ...(typeUri && { document_type: shortTypeFromUri(typeUri) }),
        });
    }
    return out;
}

// ---------------------------------------------------------------------------
// Human-readable text formatter
// ---------------------------------------------------------------------------

function formatRows(rows: SparqlBinding[], header: string): string {
    if (rows.length === 0) {
        return (
            header +
            "\n\nBrak wynikow. Sprobuj szerszego zakresu dat lub innego CELEX-a."
        );
    }
    const lines = [header, ""];
    for (const row of rows) {
        const celex = row.celex?.value ?? "brak_celex";
        const date = row.date?.value ?? "?";
        const typeUri = row.type?.value;
        const type = typeUri ? shortTypeFromUri(typeUri) : "?";
        const title = row.title?.value;
        lines.push(`CELEX: ${celex}`);
        lines.push(`  Data : ${date} | Typ: ${type}`);
        if (title) lines.push(`  Tytul: ${title}`);
        lines.push(`  URL  : ${eurLexUrl(celex)}`);
        lines.push("");
    }
    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
    {
        name: "search_by_celex",
        description:
            "Znajdz akt prawny UE po numerze CELEX. " +
            "Numer CELEX jest unikalny i identyfikuje akt niezaleznie od jezyka. " +
            "Przyklady: 32016R0679 (RODO), 31995L0046 (uchylony dyrektywa o ochronie danych), " +
            "62022CJ0252 (orzeczenie CJEU). Zwraca tytul w wybranym jezyku + EUR-Lex URL.",
        inputSchema: {
            type: "object",
            properties: {
                celex: {
                    type: "string",
                    description: "Numer CELEX, np. '32016R0679' (RODO).",
                },
                lang: {
                    type: "string",
                    description:
                        "ISO 639-3 jezyka tytulu (POL/ENG/FRA/DEU). Domyslnie POL.",
                    enum: ["POL", "ENG", "FRA", "DEU"],
                },
            },
            required: ["celex"],
        },
    },
    {
        name: "search_by_date_range",
        description:
            "Znajdz akty prawne UE z zakresu dat (po dacie dokumentu). " +
            "Opcjonalnie filtruj po typie (REG=rozporzadzenie, DIR=dyrektywa, " +
            "DEC=decyzja, RECO=zalecenie, OPIN=opinia). Maks. 50 wynikow na zapytanie. " +
            "Uzyteczne do przegladu aktow z konkretnego okresu legislacyjnego.",
        inputSchema: {
            type: "object",
            properties: {
                date_from: {
                    type: "string",
                    description: "Data od (YYYY-MM-DD).",
                },
                date_to: {
                    type: "string",
                    description: "Data do (YYYY-MM-DD).",
                },
                document_type: {
                    type: "string",
                    description:
                        "Skrot typu aktu: REG, DIR, DEC, RECO, OPIN. Pomin zeby objac wszystkie.",
                    enum: ["REG", "DIR", "DEC", "RECO", "OPIN"],
                },
                lang: {
                    type: "string",
                    description:
                        "ISO 639-3 jezyka tytulow. Domyslnie POL.",
                    enum: ["POL", "ENG", "FRA", "DEU"],
                },
                limit: {
                    type: "number",
                    description:
                        "Maks. liczba wynikow (1-50). Domyslnie 20.",
                    minimum: 1,
                    maximum: 50,
                },
            },
            required: ["date_from", "date_to"],
        },
    },
    {
        name: "search_cjeu",
        description:
            "Wyszukaj orzeczenia Trybunalu Sprawiedliwosci UE (CJEU) - wyroki (JUDG) " +
            "i postanowienia (ORDER). Opcjonalnie zawez do zakresu dat. " +
            "Zwraca CELEX (np. 62022CJ0252), date wydania, tytul (jezyk wg lang) i EUR-Lex URL.",
        inputSchema: {
            type: "object",
            properties: {
                date_from: {
                    type: "string",
                    description: "Data od (YYYY-MM-DD). Opcjonalna.",
                },
                date_to: {
                    type: "string",
                    description: "Data do (YYYY-MM-DD). Opcjonalna.",
                },
                lang: {
                    type: "string",
                    description: "ISO 639-3 jezyka tytulow. Domyslnie POL.",
                    enum: ["POL", "ENG", "FRA", "DEU"],
                },
                limit: {
                    type: "number",
                    description:
                        "Maks. liczba wynikow (1-50). Domyslnie 20.",
                    minimum: 1,
                    maximum: 50,
                },
            },
            required: [],
        },
    },
] as const;

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
    { name: "mcp-eu-sparql", version: "1.0.0" },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
    })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args ?? {}) as Record<string, unknown>;
    const lang = typeof a.lang === "string" ? a.lang : "POL";

    try {
        switch (name) {
            case "search_by_celex": {
                if (!a.celex || typeof a.celex !== "string") {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Blad: parametr 'celex' jest wymagany (string).",
                            },
                        ],
                        isError: true,
                    };
                }
                const sparql = searchByCelexQuery(a.celex, lang);
                const data = await runSparql(sparql);
                const rows = data.results.bindings;
                const text = formatRows(
                    rows,
                    `Wynik search_by_celex(celex="${a.celex}", lang=${lang}):`,
                );
                return {
                    content: [{ type: "text", text }],
                    structuredContent: {
                        citations: buildCitations(rows, lang),
                    },
                };
            }

            case "search_by_date_range": {
                const dateFrom = a.date_from;
                const dateTo = a.date_to;
                if (typeof dateFrom !== "string" || typeof dateTo !== "string") {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Blad: 'date_from' i 'date_to' sa wymagane (format YYYY-MM-DD).",
                            },
                        ],
                        isError: true,
                    };
                }
                const typeShort =
                    typeof a.document_type === "string" ? a.document_type : null;
                const typeUri = typeShort
                    ? (RESOURCE_TYPES[typeShort] ?? null)
                    : null;
                const limit =
                    typeof a.limit === "number"
                        ? Math.min(50, Math.max(1, Math.floor(a.limit)))
                        : 20;
                const sparql = searchByDateRangeQuery(
                    dateFrom,
                    dateTo,
                    typeUri,
                    lang,
                    limit,
                );
                const data = await runSparql(sparql);
                const rows = data.results.bindings;
                const text = formatRows(
                    rows,
                    `Wynik search_by_date_range(${dateFrom}..${dateTo}, type=${typeShort ?? "ALL"}, lang=${lang}):`,
                );
                return {
                    content: [{ type: "text", text }],
                    structuredContent: {
                        citations: buildCitations(rows, lang),
                    },
                };
            }

            case "search_cjeu": {
                const dateFrom =
                    typeof a.date_from === "string" ? a.date_from : null;
                const dateTo =
                    typeof a.date_to === "string" ? a.date_to : null;
                const limit =
                    typeof a.limit === "number"
                        ? Math.min(50, Math.max(1, Math.floor(a.limit)))
                        : 20;
                const sparql = searchCjeuQuery(dateFrom, dateTo, lang, limit);
                const data = await runSparql(sparql);
                const rows = data.results.bindings;
                const text = formatRows(
                    rows,
                    `Wynik search_cjeu(${dateFrom ?? "*"}..${dateTo ?? "*"}, lang=${lang}):`,
                );
                return {
                    content: [{ type: "text", text }],
                    structuredContent: {
                        citations: buildCitations(rows, lang),
                    },
                };
            }

            default:
                return {
                    content: [
                        { type: "text", text: `Nieznane narzedzie: ${name}` },
                    ],
                    isError: true,
                };
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            content: [
                {
                    type: "text",
                    text: `Blad komunikacji z Publications Office SPARQL: ${msg}\n\nSprobuj ponownie za chwile lub zawez zakres dat / dodaj typ dokumentu.`,
                },
            ],
            isError: true,
        };
    }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("mcp-eu-sparql server started (stdio transport)\n");
}

main().catch((err) => {
    process.stderr.write(`Fatal error: ${err}\n`);
    process.exit(1);
});
