import { createHash } from "node:crypto";
import { describe, expect, it, vi, afterEach } from "vitest";
import { hostedPreviewEnabled, matchesSecretHash, previewGateAllowed, previewOperatorReady, previewLocalRequest, assertExternalServicesAllowed } from "@/lib/preview-mode";
import { demoAccessEnabled } from "@/lib/local-mode";
import { indexingRequested } from "@/lib/site-origin";
import { fetchImportBytes } from "@/lib/bounded-fetch";
import { parseContentJson } from "@/lib/content";

const password = "synthetic-preview-password-123456";
const hash = createHash("sha256").update(password).digest("hex");
const env = { DRP_HOSTED_PREVIEW: "true", PREVIEW_ACCESS_HASH: hash };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Hostingvorschau bleibt eine getrennte Testumgebung", () => {
  it("erlaubt Musterangaben nur auf echten Loopback-Anfragen und niemals auf Vercel", () => {
    const local = { SITE_URL: "http://localhost:3108", AUTH_URL: "http://localhost:3108" };
    expect(previewLocalRequest("localhost:3108", local)).toBe(true);
    expect(previewLocalRequest("preview.example.org", local)).toBe(false);
    expect(previewLocalRequest("localhost:3108", { ...local, VERCEL: "1" })).toBe(false);
    expect(previewLocalRequest("user@localhost:3108", local)).toBe(false);
    expect(previewLocalRequest("localhost:3109", local)).toBe(false);
  });
  it("öffnet ausschließlich mit dem richtigen separaten Vorschaupasswort", async () => {
    expect(await previewGateAllowed("Basic " + btoa("drp:" + password), env)).toBe(true);
    for (const header of [null, "Basic broken", "Bearer " + password, "Basic " + btoa("wrong:" + password), "Basic " + btoa("drp:incorrect-password-123456")]) expect(await previewGateAllowed(header, env)).toBe(false);
    expect(await previewGateAllowed("Basic " + btoa("drp:" + password), { DRP_HOSTED_PREVIEW: "true" })).toBe(false);
  });
  it("hat ohne Vorschauflag keinen versteckten Passwortzwang", async () => {
    expect(hostedPreviewEnabled({})).toBe(false);
    expect(await previewGateAllowed(null, {})).toBe(true);
    expect(await matchesSecretHash("short", hash)).toBe(false);
  });
  it("schaltet lokale Owner-Anmeldung und Indexierung trotz widersprüchlicher alter Flags ab", () => {
    expect(demoAccessEnabled({ ...env, NODE_ENV: "development", AUTH_DEMO_MODE: "true" })).toBe(false);
    expect(indexingRequested({ ...env, NODE_ENV: "production", PUBLIC_SITE_INDEXING: "true", SITE_URL: "https://preview.example.org" })).toBe(false);
  });
  it("behauptet ohne tatsächliche Verantwortlichenangaben keine externe Freigabe", () => {
    const values = { PREVIEW_OPERATOR_NAME: "Beispiel Community", PREVIEW_OPERATOR_EMAIL: "kontakt@community.test", PREVIEW_OPERATOR_CONFIRMED: "true" };
    expect(previewOperatorReady(values)).toBe(true);
    expect(previewOperatorReady({ ...values, PREVIEW_OPERATOR_NAME: "Max Mustermann" })).toBe(false);
    expect(previewOperatorReady({ ...values, PREVIEW_OPERATOR_CONFIRMED: "false" })).toBe(false);
  });
});

describe("begrenzt externe Importaufrufe und Inhaltskomplexität", () => {
  it("führt im Vorschaumodus keine externe Anfrage aus", async () => {
    vi.stubEnv("DRP_HOSTED_PREVIEW", "true");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(() => assertExternalServicesAllowed()).toThrow();
    await expect(fetchImportBytes("https://docs.google.com/a", ["docs.google.com"])).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("weist private Ziele und Weiterleitungen auf private Ziele vor deren Abruf ab", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(fetchImportBytes("https://docs.google.com/a", ["docs.google.com"])).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(fetchImportBytes("https://user:secret@docs.google.com/a", ["docs.google.com"])).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("begrenzt auch Antworten ohne oder mit gelogener Inhaltslänge", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oversized content", { headers: { "content-length": "1" } })));
    await expect(fetchImportBytes("https://docs.google.com/a", ["docs.google.com"], 4)).rejects.toThrow("groß");
  });
  it("verhindert übermäßig tiefe und übergroße Dokumente vor der rekursiven Verarbeitung", () => {
    let node: object = { type: "text", text: "Beispiel" };
    for (let count = 0; count < 45; count++) node = { type: "paragraph", content: [node] };
    expect(parseContentJson(JSON.stringify(node))).toBeNull();
    expect(parseContentJson(JSON.stringify({ type: "text", text: "x".repeat(1_000_001) }))).toBeNull();
    expect(parseContentJson('{"type":"doc","content":[{"type":"paragraph"}]}')).not.toBeNull();
  });
});
