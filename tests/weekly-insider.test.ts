import { describe, expect, it } from "vitest";
import { resolveDiscordRank } from "@/lib/discord-ranks";
import { formatDiscordMention, formatWeeklyInsider } from "@/lib/weekly-insider";

const rank = (id: string, roleId: string, shortName: string, sortOrder: number) => ({ id, section: "MODERATION", shortName, sortOrder, discordRole: { id: `db-${id}`, discordRoleId: roleId, name: shortName }, nextDiscordRole: null, outputLabel: null, weeklyTargetMinutes: 180 });

describe("Discord-Ränge", () => {
  it("verwendet bei mehreren Rollen die höchste konfigurierte Rangposition und meldet Konflikte", () => {
    const result = resolveDiscordRank(["role-jm", "role-m"], [rank("jm", "role-jm", "JM", 10), rank("m", "role-m", "M", 20)]);
    expect(result.rank?.shortName).toBe("M");
    expect(result.conflicts.map((item) => item.shortName)).toEqual(["JM"]);
  });
});

describe("Weekly Insider", () => {
  it("formatiert echte und graue Discord-Erwähnungen", () => {
    expect(formatDiscordMention("12345", "PING")).toBe("<@12345>");
    expect(formatDiscordMention("12345", "CODE")).toBe("`<@12345>`");
  });

  it("hält die verbindliche Reihenfolge ein und fügt keine Platzhalter ein", () => {
    const report = formatWeeklyInsider({ mentionMode: "PING", mostActiveDiscordId: "1", entries: [{ kind: "UPRANK", section: "ADMINISTRATION", discordId: "2", displayName: "Admin", fromLabel: "A", toLabel: "SA" }, { kind: "LOA", section: "LOA", discordId: "3", displayName: "Mod", text: "M (LoA)" }], signatures: [{ discordId: "4", label: ":PL_neu:" }] });
    expect(report.indexOf("Aktivstes Teammitglied")).toBeLessThan(report.indexOf("## Administration"));
    expect(report.indexOf("## Administration")).toBeLessThan(report.indexOf("## Moderation"));
    expect(report).toContain("> <@2> `A -> SA`");
    expect(report).toContain(":PL_neu: **||** <@4>");
    expect(report).not.toContain("Keine Einträge");
  });
});
