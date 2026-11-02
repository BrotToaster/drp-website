import { describe, expect, it } from "vitest";
import { groupRules, indexRules, ruleMatchRanges, ruleSnippet, searchRules } from "@/lib/rule-search";
import { decodeScrollHash } from "@/lib/scroll-navigation";
import type { RuleView } from "@/lib/demo-data";
import { ruleReadingContent } from "@/lib/rule-content";

const rule = (id: string, category: string, title: string, text: string): RuleView => ({
  id, slug: id, category, title, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
  searchText: "", order: 0, version: 1, updatedAt: new Date("2026-10-16T12:00:00Z"), media: [],
});
const rules = [rule("traffic", "Roleplay-Regelwerk", "§ 5 Übermäßige Geschwindigkeit", "Die Straße ist bei einer Verfolgung freizuhalten."), rule("voice", "Discord-Regelwerk", "Kommunikation", "OOC-Talk erfolgt nur im vorgesehenen Kanal."), rule("new", "Neuer Bereich", "Zusatz", "[Test] bleibt wörtlicher Text.")];
const index = indexRules(rules);

describe("Regelwerkssuche", () => {
  it("durchsucht Titel, Kategorie und tatsächlichen Volltext auch ohne Suchtext aus einer Migration", () => {
    expect(searchRules(index, "VERFOLGUNG").map(item => item.rule.id)).toEqual(["traffic"]);
    expect(searchRules(index, "Discord").map(item => item.rule.id)).toEqual(["voice"]);
    expect(searchRules(index, "§5 ubermassige strasse").map(item => item.rule.id)).toEqual(["traffic"]);
    expect(searchRules(index, "Verfolgung OOC")).toEqual([]);
  });
  it("verbindet mehrere Suchwörter mit UND und behält den gewählten Bereich bei", () => {
    expect(searchRules(index, "ooc kanal", "Discord-Regelwerk")).toHaveLength(1);
    expect(searchRules(index, "ooc", "Roleplay-Regelwerk")).toEqual([]);
    expect(searchRules(index, "   ")).toHaveLength(3);
  });
  it("behandelt Satzzeichen wörtlich und sucht keine regulären Ausdrücke", () => {
    expect(searchRules(index, "[Test]").map(item => item.rule.id)).toEqual(["new"]);
    expect(searchRules(index, ".*")).toEqual([]);
  });
  it("markiert die Originalzeichen trotz Umlauten, ß und verschiedenen Paragraph-Schreibweisen korrekt", () => {
    const text = "§ 5 Übermäßige Straße";
    expect(ruleMatchRanges(text, "§5 ubermassige strasse").map(range => text.slice(range.start, range.end))).toEqual(["§ 5", "Übermäßige", "Straße"]);
    expect(ruleMatchRanges("Straße", "s ss")).toEqual([{ start: 0, end: 1 }, { start: 4, end: 5 }]);
    expect(ruleMatchRanges(text, "")).toEqual([]);
  });
  it("zeigt den Fundkontext in langen Regeln, ohne den Quelltext zu verändern", () => {
    const text = "Einleitung. ".repeat(40) + "OOC-Talk ist hier geregelt. " + "Weiterer Inhalt. ".repeat(30);
    const snippet = ruleSnippet(text, "ooc");
    expect(snippet).toContain("OOC-Talk");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(157);
    expect(text).toContain("Einleitung. ".repeat(40));
  });
  it("gruppiert neue Kategorien mit und bewahrt die Reihenfolge der Originalregeln", () => {
    const groups = groupRules(index);
    expect(groups.map(group => group.name)).toEqual(["Roleplay-Regelwerk", "Discord-Regelwerk", "Neuer Bereich"]);
    expect(groups.flatMap(group => group.entries.map(item => item.rule))).toEqual(rules);
  });
  it("dekodiert bestehende Direktlinks und toleriert beschädigte URL-Fragmente", () => {
    expect(decodeScrollHash("#%C3%BCberfall")).toBe("überfall");
    expect(decodeScrollHash("#main-1")).toBe("main-1");
    expect(decodeScrollHash("#%broken")).toBe("");
  });
  it("trennt importierte Absatznummern beim Lesen und lässt gespeicherte Inhalte und Formatierungen intakt", () => {
    const original = { type: "paragraph", content: [{ type: "text", text: "§2.1", marks: [{ type: "bold" }] }, { type: "text", text: "Während einer Situation" }] };
    const copy = structuredClone(original);
    expect(ruleReadingContent(original).content?.[0]).toEqual({ ...original.content[0], text: "§2.1\u00a0" });
    expect(original).toEqual(copy);
    const ordinary = { type: "paragraph", content: [{ type: "text", text: "Role" }, { type: "text", text: "play" }] };
    expect(ruleReadingContent(ordinary)).toEqual(ordinary);
  });
});
