import { describe, expect, it } from "vitest";
import { findCommunityFaction, groupHomepageCards } from "@/lib/homepage-factions";

describe("Vorstellungen der Hauptfraktionen", () => {
  const card = { code: "POLIZEI", title: "Polizei Deutschland", description: "Bereits gepflegte Vorstellung", visible: true, sortOrder: 10 };
  it("stellt alle sechs Fraktionen auch ohne neue Datenbankeinträge bereit", () => {
    const result = groupHomepageCards([]);
    expect(result.factions).toHaveLength(6);
    expect(result.factions.find(item => item.code === "LANDESVERWALTUNG")?.logo).toContain("landesverwaltung.webp");
    expect(result.extraCards).toEqual([]);
  });
  it("übernimmt vorhandene Texte statt sie durch Standardtexte zu ersetzen", () => {
    expect(groupHomepageCards([card]).factions[0].copy).toBe(card.description);
  });
  it("lässt ausgeblendete Fraktionen ausgeblendet", () => {
    const result = groupHomepageCards([{ ...card, visible: false }]);
    expect(result.factions.find(item => item.code === "POLIZEI")?.visible).toBe(false);
  });
  it("bewahrt zusätzliche und doppelte Alt-Karten zur manuellen Verwaltung", () => {
    const duplicate = { ...card, description: "Weitere alte Beschreibung" };
    const extra = { ...card, code: "ZIVIL", title: "Ziviles Roleplay" };
    expect(groupHomepageCards([card, duplicate, extra]).extraCards).toEqual([duplicate, extra]);
  });
  it("kennt alte Bezeichnungen und liest vorhandene JSON-Vorstellungen weiter", () => {
    expect(findCommunityFaction("", "BKA")?.code).toBe("BKA");
    expect(findCommunityFaction("DRS")?.code).toBe("ROTER_STERN");
    expect(groupHomepageCards([], [{ code: "POLIZEI", name: "Polizei", copy: "Bestehender älterer Text" }]).factions[0].copy).toBe("Bestehender älterer Text");
  });
  it("behält die gespeicherte Reihenfolge und absichtlich leere Texte bei", () => {
    const result = groupHomepageCards([{ ...card, code: "LANDESVERWALTUNG", title: "Landesverwaltung", sortOrder: 0, description: "" }]);
    expect(result.factions[0]).toMatchObject({ code: "LANDESVERWALTUNG", copy: "", sortOrder: 0 });
  });
});
