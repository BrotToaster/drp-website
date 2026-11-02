import { describe, expect, it } from "vitest";
import { demoAccessEnabled, demoRequestAllowed, lanPreviewEnabled, localPreviewEnabled, secureApplicationCookies } from "@/lib/local-mode";

const preview = { NODE_ENV: "production", DRP_LOCAL_PREVIEW: "true", AUTH_DEMO_MODE: "true", SITE_URL: "http://localhost:3000", AUTH_URL: "http://localhost:3000" };

describe("lokale Vorschau mit optimiertem Build", () => {
  it("erhält den ausdrücklich aktivierten Testzugang ausschließlich lokal", () => {
    expect(localPreviewEnabled(preview)).toBe(true);
    expect(demoAccessEnabled(preview)).toBe(true);
    expect(demoRequestAllowed(new Request("http://localhost:3000/api/auth/callback/demo", { headers: { host: "localhost:3000", origin: "http://localhost:3000" } }), preview)).toBe(true);
    expect(secureApplicationCookies(preview)).toBe(false);
  });

  it("schaltet den produktiven Demozugang bei fehlenden, ungültigen oder öffentlichen URLs ab", () => {
    for (const origin of [undefined, "", "not-a-url", "https://drp.example.org", "https://localhost.evil.test", "http://user:password@localhost:3000"]) {
      expect(demoAccessEnabled({ ...preview, SITE_URL: origin })).toBe(false);
      expect(demoAccessEnabled({ ...preview, AUTH_URL: origin })).toBe(false);
    }
    expect(demoAccessEnabled({ ...preview, DRP_LOCAL_PREVIEW: undefined })).toBe(false);
    expect(demoAccessEnabled({ ...preview, AUTH_DEMO_MODE: undefined })).toBe(false);
    expect(demoAccessEnabled({ ...preview, AUTH_DEMO_MODE: "false" })).toBe(false);
    expect(secureApplicationCookies({ ...preview, SITE_URL: "https://drp.example.org" })).toBe(true);
  });

  it("weist Anmeldungen über einen öffentlichen Host oder fremden Ursprung zurück", () => {
    expect(demoRequestAllowed(new Request("https://drp.example.org/api/auth/callback/demo"), preview)).toBe(false);
    expect(demoRequestAllowed(new Request("http://localhost:3000/api/auth/callback/demo", { headers: { host: "drp.example.org" } }), preview)).toBe(false);
    expect(demoRequestAllowed(new Request("http://localhost:3000/api/auth/callback/demo", { headers: { origin: "https://drp.example.org" } }), preview)).toBe(false);
  });

  it("erlaubt den bisherigen Entwicklungszugang und dessen Abschaltung", () => {
    expect(demoAccessEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(demoAccessEnabled({ NODE_ENV: "development", AUTH_DEMO_MODE: "false" })).toBe(false);
    expect(demoAccessEnabled({ NODE_ENV: "production", AUTH_DEMO_MODE: "true" })).toBe(false);
  });
});

describe("Handy-Vorschau im lokalen Netzwerk", () => {
  it("sperrt den Owner-Demozugang bei externer Freigabe auch mit alten lokalen Einstellungen", () => {
    expect(demoAccessEnabled({ ...preview, DRP_SHARED_PREVIEW: "true" })).toBe(false);
    expect(demoAccessEnabled({ NODE_ENV: "development", AUTH_DEMO_MODE: "true", DRP_SHARED_PREVIEW: "true" })).toBe(false);
  });
  const lan = { ...preview, DRP_LOCAL_PREVIEW: "false", DRP_LAN_PREVIEW: "true", SITE_URL: "http://192.168.178.49:3000", AUTH_URL: "http://192.168.178.49:3000" };
  it("erlaubt HTTP-Cookies nur bei ausdrücklich aktivierter, übereinstimmender privater Adresse", () => {
    expect(lanPreviewEnabled(lan)).toBe(true);
    expect(localPreviewEnabled(lan)).toBe(false);
    expect(secureApplicationCookies(lan)).toBe(false);
    for (const address of ["10.0.0.4", "172.16.0.2", "172.31.255.254", "192.168.1.10"]) {
      const origin = `http://${address}:3000`;
      expect(lanPreviewEnabled({ ...lan, SITE_URL: origin, AUTH_URL: origin })).toBe(true);
    }
  });
  it("stellt keinen passwortlosen Owner-Zugang im WLAN bereit, auch nicht bei gefälschtem Host", () => {
    expect(demoAccessEnabled(lan)).toBe(false);
    expect(demoAccessEnabled({ ...lan, NODE_ENV: "development" })).toBe(false);
    expect(demoRequestAllowed(new Request("http://localhost:3000/api/auth/callback/demo", { headers: { host: "localhost:3000" } }), lan)).toBe(false);
  });
  it("weicht Cookie-Schutz für öffentliche, unvollständige oder widersprüchliche Konfiguration nicht auf", () => {
    for (const origin of ["http://8.8.8.8:3000", "http://172.32.0.1:3000", "http://drp.example.org:3000", "http://192.168.178.49", "http://user:pass@192.168.178.49:3000", "not-a-url"]) {
      expect(lanPreviewEnabled({ ...lan, SITE_URL: origin, AUTH_URL: origin })).toBe(false);
      expect(secureApplicationCookies({ ...lan, SITE_URL: origin, AUTH_URL: origin })).toBe(true);
    }
    expect(lanPreviewEnabled({ ...lan, DRP_LAN_PREVIEW: "false" })).toBe(false);
    expect(lanPreviewEnabled({ ...lan, AUTH_URL: "http://192.168.178.50:3000" })).toBe(false);
  });
});
