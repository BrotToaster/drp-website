import { describe, expect, it, vi, afterEach } from "vitest";
import { readJsonRequest } from "@/lib/json-request";
import { gatewayErrorResponse } from "@/lib/error-response";
import { isCommonErrorCode } from "@/lib/common-errors";
import { isPublicImage, publicMediaSelectionAllowed } from "@/lib/public-media";
import type { Prisma } from "@prisma/client";

afterEach(() => vi.unstubAllEnvs());
describe("Begrenzte API-Anfragen", () => {
  const json = (body: string, headers = {}) => new Request("https://drp.example/api/bot/events", { method: "POST", body, headers: { "content-type": "application/json", ...headers } });
  it("liest gültige JSON-Anfragen", async () => { expect(await readJsonRequest(json('{"okay":true}'))).toEqual({ ok: true, value: { okay: true } }); });
  it("behandelt ungültiges JSON als 400", async () => { expect(await readJsonRequest(json('{"secret":'))).toMatchObject({ ok: false, status: 400 }); });
  it("begrenzt echte Bytes trotz gelogener Inhaltslänge", async () => { expect(await readJsonRequest(json('"' + "x".repeat(100) + '"', { "content-length": "1" }), 20)).toMatchObject({ ok: false, status: 413 }); });
  it("begrenzt UTF-8-Bytes statt nur Zeichen", async () => { expect(await readJsonRequest(json('"😀😀😀"'), 10)).toMatchObject({ ok: false, status: 413 }); });
  it("weist nicht unterstützte Inhaltstypen ab", async () => { expect(await readJsonRequest(new Request("https://drp.example", { method: "POST", body: "{}" }))).toMatchObject({ ok: false, status: 415 }); });
});
describe("Sichere Fehlerantworten", () => {
  it("erhält HTTP-Status, Basic-Challenge und Cache-Trennung", async () => {
    const response = gatewayErrorResponse(new Request("https://drp.example/"), 401, { "WWW-Authenticate": 'Basic realm="DRP"' });
    expect(response.status).toBe(401); expect(response.headers.get("www-authenticate")).toContain("Basic");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).toContain('lang="de"');
  });
  it("liefert APIs JSON statt eines HTML-Fehlerscreens", async () => {
    const response = gatewayErrorResponse(new Request("https://drp.example/api/search?token=private"), 503);
    expect(response.status).toBe(503); expect(response.headers.get("content-type")).toContain("application/json");
    expect(JSON.stringify(await response.json())).not.toContain("private");
  });
  it("reflektiert keine URL-Payloads und akzeptiert nur bekannte Hilfecodes", async () => {
    expect(await gatewayErrorResponse(new Request("https://drp.example/?secret=private"), 503).text()).not.toContain("private");
    expect(isCommonErrorCode("constructor")).toBe(false); expect(isCommonErrorCode("__proto__")).toBe(false); expect(isCommonErrorCode("404")).toBe(true);
  });
});
describe("Private Medien gehören nicht in öffentliche Inhalte", () => {
  it("weist interne und authentifizierte Bilder ab", () => {
    expect(isPublicImage({ kind: "IMAGE", visibility: "INTERNAL", deliveryType: "authenticated" })).toBe(false);
    expect(isPublicImage({ kind: "IMAGE", visibility: "PUBLIC", deliveryType: "authenticated" })).toBe(false);
    expect(isPublicImage({ kind: "IMAGE", visibility: "PUBLIC", deliveryType: "upload" })).toBe(true);
  });
  it("weist erratene oder private Medien-IDs vor dem Verknüpfen ab", async () => {
    const db = { mediaAsset: { findMany: vi.fn().mockResolvedValue([{ id: "private", kind: "IMAGE", visibility: "INTERNAL", deliveryType: "authenticated" }]) } } as unknown as Pick<Prisma.TransactionClient, "mediaAsset">;
    expect(await publicMediaSelectionAllowed(db, ["private"])).toBe(false);
    expect(await publicMediaSelectionAllowed(db, ["missing", "private"])).toBe(false);
  });
});
