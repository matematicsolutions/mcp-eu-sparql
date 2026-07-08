#!/usr/bin/env node
// Live smoke test - spawnuje dist/index.js na stdio i wywoluje wszystkie 5 tooli
// przeciwko prawdziwym endpointom (Cellar SPARQL + GDPRhub). Wymaga sieci.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, "..", "dist", "index.js");

function rpc(id, method, params) {
    return JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
}

async function callTools(calls) {
    const child = spawn(process.execPath, [SERVER], {
        stdio: ["pipe", "pipe", "inherit"],
    });
    const responses = new Map();
    let buf = "";
    child.stdout.on("data", (chunk) => {
        buf += chunk.toString();
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;
            const msg = JSON.parse(line);
            if (msg.id !== undefined) responses.set(msg.id, msg);
        }
    });

    child.stdin.write(
        rpc(0, "initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "smoke", version: "0.0.0" },
        }),
    );
    await waitFor(() => responses.has(0), 15000, "initialize");
    child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
    );

    for (const [id, name, args] of calls) {
        child.stdin.write(rpc(id, "tools/call", { name, arguments: args }));
    }
    await waitFor(
        () => calls.every(([id]) => responses.has(id)),
        120000,
        "tools/call batch",
    );
    child.kill();
    return responses;
}

function waitFor(pred, timeoutMs, label) {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const iv = setInterval(() => {
            if (pred()) {
                clearInterval(iv);
                resolve();
            } else if (Date.now() - t0 > timeoutMs) {
                clearInterval(iv);
                reject(new Error(`timeout waiting for ${label}`));
            }
        }, 100);
    });
}

function citations(msg) {
    assert.ok(msg.result, `brak result: ${JSON.stringify(msg).slice(0, 300)}`);
    assert.ok(!msg.result.isError, `tool error: ${JSON.stringify(msg.result.content).slice(0, 500)}`);
    const cits = msg.result.structuredContent?.citations;
    assert.ok(Array.isArray(cits), "brak structuredContent.citations");
    return cits;
}

const responses = await callTools([
    [1, "search_by_celex", { celex: "32016R0679", lang: "POL" }],
    [2, "search_cjeu_by_ecli", { ecli: "ECLI:EU:C:2020:559", lang: "ENG" }],
    [3, "search_cjeu", { query: "personal data", document_type: "JUDG", date_from: "2023-01-01", date_to: "2026-07-08", lang: "ENG", limit: 5 }],
    [4, "search_cjeu", { document_type: "ORDER", date_from: "2024-01-01", date_to: "2026-07-08", lang: "ENG", limit: 5 }],
    [5, "search_cjeu", { document_type: "OPIN_AG", date_from: "2024-01-01", date_to: "2026-07-08", lang: "ENG", limit: 5 }],
    [6, "search_gdprhub", { query: "Schrems", limit: 5 }],
]);

// 1. RODO po CELEX
{
    const c = citations(responses.get(1));
    assert.ok(c.length >= 1 && c[0].celex === "32016R0679");
    console.log("ok - search_by_celex 32016R0679 (RODO):", c[0].title.slice(0, 60));
}
// 2. Schrems II po ECLI
{
    const c = citations(responses.get(2));
    assert.ok(c.length >= 1);
    assert.equal(c[0].celex, "62018CJ0311");
    assert.equal(c[0].ecli, "ECLI:EU:C:2020:559");
    console.log("ok - search_cjeu_by_ecli ECLI:EU:C:2020:559 -> CELEX 62018CJ0311");
}
// 3. keyword JUDG
{
    const c = citations(responses.get(3));
    assert.ok(c.length >= 1, "keyword JUDG: brak wynikow");
    assert.ok(c.every((x) => x.document_type === "JUDG"));
    assert.ok(c.every((x) => x.title.toLowerCase().includes("personal data")));
    console.log(`ok - search_cjeu keyword 'personal data' JUDG: ${c.length} wynikow`);
}
// 4. ORDER (fix cichego no-opa - przed 1.2.0 zawsze 0 wynikow)
{
    const c = citations(responses.get(4));
    assert.ok(c.length >= 1, "ORDER: brak wynikow (regresja no-op?)");
    assert.ok(c.every((x) => x.document_type === "ORDER"));
    console.log(`ok - search_cjeu ORDER: ${c.length} wynikow (no-op naprawiony)`);
}
// 5. OPIN_AG
{
    const c = citations(responses.get(5));
    assert.ok(c.length >= 1, "OPIN_AG: brak wynikow");
    assert.ok(c.every((x) => x.document_type === "OPIN_AG"));
    console.log(`ok - search_cjeu OPIN_AG: ${c.length} wynikow`);
}
// 6. GDPRhub
{
    const c = citations(responses.get(6));
    assert.ok(c.length >= 1, "GDPRhub: brak wynikow");
    assert.ok(c.every((x) => x.license === "CC BY-NC-SA 4.0"));
    console.log(`ok - search_gdprhub 'Schrems': ${c.length} wynikow (licencja flagowana)`);
}

console.log("\nOK smoke - wszystkie 5 tooli LIVE.");
process.exit(0);
