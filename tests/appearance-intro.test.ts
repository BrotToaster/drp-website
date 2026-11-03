import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { appearanceBootScript, resolveAppearance } from "@/lib/appearance";
import { introRouteAllowed, introSessionStep, introWasSeen } from "@/lib/intro";

describe("Darstellung vor dem ersten Rendern", () => {
  it("beachtet die gespeicherte Wahl vor der Systemvorgabe und fällt bei fremden Werten auf das System zurück", () => {
    for (const preference of [null, "dark", "light", "unknown"]) {
      for (const systemDark of [true, false]) {
        const root = { dataset: { appearance: "" } };
        runInNewContext(appearanceBootScript, {
          document: { documentElement: root }, localStorage: { getItem: () => preference },
          window: { matchMedia: () => ({ matches: systemDark }) },
        });
        expect(root.dataset.appearance).toBe(resolveAppearance(preference, systemDark));
      }
    }
  });
  it("bleibt bei gesperrtem Browserspeicher benutzbar", () => {
    const root = { dataset: { appearance: "" } };
    runInNewContext(appearanceBootScript, {
      document: { documentElement: root }, localStorage: { getItem: () => { throw new Error("Storage denied"); } },
      window: { matchMedia: () => ({ matches: true }) },
    });
    expect(root.dataset.appearance).toBe("dark");
  });
});

describe("Einführung", () => {
  it("stellt nur gültige Tourstationen wieder her", () => {
    expect(introSessionStep("0")).toBe(0);
    expect(introSessionStep("5")).toBe(5);
    for (const value of [null, "", "-1", "6", "2.5", "NaN", "{}", "1e2"]) expect(introSessionStep(value)).toBeNull();
  });
  it("respektiert abgeschlossene und übersprungene Einführungen", () => {
    expect(introWasSeen("completed")).toBe(true);
    expect(introWasSeen("skipped")).toBe(true);
    expect(introWasSeen(null)).toBe(false);
    expect(introWasSeen("unexpected")).toBe(false);
  });
  it("bietet die Einführung nur auf öffentlichen Informationsseiten an", () => {
    for (const route of ["/", "/server", "/regelwerk", "/news/beispiel", "/kalender", "/faq"]) expect(introRouteAllowed(route)).toBe(true);
    for (const route of ["/dashboard/profil", "/staff", "/admin", "/kontakt/ticket/test", "/impressum", "/datenschutz", "/login", "/registrieren", "/newspaper"]) expect(introRouteAllowed(route)).toBe(false);
  });
});
