import { describe, expect, it, vi } from "vitest";
import { httpsRedirect, securityHeaders } from "@/lib/security-policy";
import { indexingRequested, siteOrigin } from "@/lib/site-origin";
import { legalPublicationReady, legalSettingsSchema } from "@/lib/legal-settings";
import { authSigningSecret } from "@/lib/server-secret";
import { readableForeground } from "@/lib/color-contrast";
import { optimizableImage } from "@/lib/image-source";

describe("öffentlicher Betrieb und lokale Vorschau", () => {
  it("lässt localhost per HTTP nutzbar und unveröffentlicht", () => {
    const env = { NODE_ENV: "production", SITE_URL: "http://localhost:3000", PUBLIC_SITE_INDEXING: "true" };
    expect(indexingRequested(env)).toBe(false);
    expect(httpsRedirect("http://localhost:3000/regelwerk", null, env)).toBeNull();
    expect(securityHeaders(env).find(header => header.key === "Content-Security-Policy")?.value).not.toContain("upgrade-insecure-requests");
  });
  it("bindet HTTPS-Weiterleitungen an die konfigurierte Domain und prüft Proxy-Vertrauen", () => {
    const env = { NODE_ENV: "production", SITE_URL: "https://drp.example.org" };
    expect(httpsRedirect("http://attacker.example/regelwerk?q=test", "https", env)?.href).toBe("https://drp.example.org/regelwerk?q=test");
    expect(httpsRedirect("http://internal/regelwerk", "https", { ...env, TRUST_PROXY_HTTPS: "true" })).toBeNull();
    expect(httpsRedirect("https://drp.example.org/regelwerk", null, env)).toBeNull();
  });
  it("erhält HTTP im ausdrücklich aktivierten Heimnetz ohne öffentliche HTTPS-Regeln zu lockern", () => {
    const origin = "http://192.168.178.49:3000";
    const env = { NODE_ENV: "production", SITE_URL: origin, AUTH_URL: origin, DRP_LAN_PREVIEW: "true" };
    expect(httpsRedirect(`${origin}/regelwerk`, null, env)).toBeNull();
    expect(indexingRequested({ ...env, PUBLIC_SITE_INDEXING: "true" })).toBe(false);
    expect(httpsRedirect(`${origin}/regelwerk`, null, { ...env, DRP_LAN_PREVIEW: "false" })?.protocol).toBe("https:");
    const publicEnv = { ...env, SITE_URL: "https://drp.example.org", AUTH_URL: "https://drp.example.org" };
    expect(httpsRedirect("http://drp.example.org/regelwerk", null, publicEnv)?.href).toBe("https://drp.example.org/regelwerk");
  });
  it("fällt bei ungültigen oder mit Zugangsdaten versehenen Ursprüngen auf localhost zurück", () => {
    expect(siteOrigin({ SITE_URL: "javascript:alert(1)" }).origin).toBe("http://localhost:3000");
    expect(siteOrigin({ SITE_URL: "https://user:password@example.org" }).origin).toBe("http://localhost:3000");
  });
  it("verhindert die Freigabe vollständiger Musterangaben auch ohne Muster-Checkbox", () => {
    const settings = legalSettingsSchema.parse({ operatorName: "Max Mustermann", addressLine: "Musterstraße 1", postalCode: "12345", city: "Musterstadt", contactEmail: "max@example.com", privacyPublished: true });
    expect(legalPublicationReady(settings)).toBe(false);
    expect(legalPublicationReady({ ...settings, operatorName: "Community Betreiber", addressLine: "Hauptstraße 9", city: "Berlin", contactEmail: "kontakt@drp.test", sampleDetails: false })).toBe(true);
  });
  it("akzeptiert nur erlaubte Bildquellen für den gemeinsamen Bildcache", () => {
    expect(optimizableImage("https://res.cloudinary.com/test/image/upload/a.png")).toBe(true);
    for (const src of ["http://res.cloudinary.com/a.png", "https://unknown.example/a.png", "https://res.cloudinary.com.evil.test/a.png", "//evil.test/a.png", "/api/media/internal/private", "https://user:secret@res.cloudinary.com/a.png"]) expect(optimizableImage(src)).toBe(false);
  });
});

describe("sichere Signaturen und Terminfarben", () => {
  it("signiert in Produktion niemals mit dem bekannten lokalen Ersatzschlüssel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    try {
      expect(() => authSigningSecret()).toThrow();
      vi.stubEnv("AUTH_SECRET", "replace-with-a-long-random-value-placeholder");
      expect(() => authSigningSecret()).toThrow();
      vi.stubEnv("AUTH_SECRET", "a".repeat(64));
      expect(authSigningSecret()).toHaveLength(64);
    } finally { vi.unstubAllEnvs(); }
  });
  it("verwendet lesbare Schrift auf goldenen, weißen und dunklen Terminen", () => {
    expect(readableForeground("#d6aa4c")).toBe("#000000");
    expect(readableForeground("#ffffff")).toBe("#000000");
    expect(readableForeground("#030712")).toBe("#ffffff");
  });
});
