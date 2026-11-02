import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPreviewProxy } from "../scripts/shared-preview.mjs";

const config = { origin: "https://drp-preview-test.trycloudflare.com", username: "drp", password: "synthetic-preview-test-password" };
const authorization = "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");
let upstream: http.Server, proxy: http.Server, address = "", visits = 0;
const listen = (server: http.Server) => new Promise<number>(resolve => server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)));

beforeAll(async () => {
  upstream = http.createServer(async (request, response) => {
    visits++;
    let body = "";
    for await (const chunk of request) body += chunk;
    response.setHeader("Content-Security-Policy", "default-src 'self'");
    response.setHeader("Cache-Control", "public, max-age=3600");
    response.setHeader("Set-Cookie", "test-session=value; Secure; HttpOnly; SameSite=Lax");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ method: request.method, path: request.url, headers: request.headers, body }));
  });
  const port = await listen(upstream);
  proxy = createPreviewProxy({ ...config, upstreamPort: port });
  address = `http://127.0.0.1:${await listen(proxy)}`;
});

afterAll(async () => {
  for (const server of [proxy, upstream]) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

describe("geschützte externe Vorschau", () => {
  it("erreicht ohne oder mit falschem Passwort niemals die Website", async () => {
    const before = visits;
    for (const supplied of [undefined, "Basic broken", "Basic " + Buffer.from("drp:wrong").toString("base64")]) {
      const response = await fetch(address + "/api/auth/providers", { headers: supplied ? { Authorization: supplied } : {} });
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain('Basic realm="DRP Vorschau"');
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
    }
    expect(visits).toBe(before);
  });
  it("ersetzt gefälschte Proxy-Header und gibt das Vorschau-Passwort nicht an die Anwendung weiter", async () => {
    const response = await fetch(address + "/regelwerk?q=OOC", { headers: { Authorization: authorization, "X-Forwarded-Host": "attacker.test", "X-Forwarded-Proto": "https", "X-Forwarded-For": "1.2.3.4", Forwarded: "host=attacker.test", Origin: config.origin } });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.path).toBe("/regelwerk?q=OOC");
    expect(payload.headers.host).toBe("drp-preview-test.trycloudflare.com");
    expect(payload.headers["x-forwarded-host"]).toBe(payload.headers.host);
    expect(payload.headers["x-forwarded-proto"]).toBe("https");
    expect(payload.headers.authorization).toBeUndefined();
    expect(payload.headers.forwarded).toBeUndefined();
    expect(payload.headers["x-forwarded-for"]).toBeUndefined();
  });
  it("erhält Formulardaten und sichere Sitzungscookies, verhindert aber öffentliche Zwischenspeicherung", async () => {
    const response = await fetch(address + "/kontakt", { method: "POST", headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" }, body: "message=Testnachricht%20mit%20Umlaut%20%C3%A4" });
    const payload = await response.json();
    expect(payload.method).toBe("POST");
    expect(payload.body).toBe("message=Testnachricht%20mit%20Umlaut%20%C3%A4");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.get("content-security-policy")).toContain("upgrade-insecure-requests");
    expect(response.headers.get("set-cookie")).toContain("Secure; HttpOnly");
  });
  it("leitet unverschlüsselte Tunnelaufrufe vor der Passwortabfrage auf HTTPS um", async () => {
    const response = await fetch(address + "/news?q=test", { redirect: "manual", headers: { "X-Forwarded-Proto": "http" } });
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(config.origin + "/news?q=test");
    expect(response.headers.get("www-authenticate")).toBeNull();
  });
  it("akzeptiert nur den vorgesehenen HTTPS-Tunnel und ausreichend lange Zugangsdaten", () => {
    for (const origin of ["http://drp-preview-test.trycloudflare.com", "https://attacker.test", "https://a.trycloudflare.com/", "https://a.trycloudflare.com.evil.test"]) expect(() => createPreviewProxy({ ...config, origin })).toThrow();
    expect(() => createPreviewProxy({ ...config, password: "short" })).toThrow();
  });
});
