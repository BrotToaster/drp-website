import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { permissionDefinitions } from "@/lib/permission-keys";

const readProjectFile = (path: string) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");

describe("portal v4", () => {
  it("defines separate staff handbook and ER:LC permissions", () => {
    const keys = permissionDefinitions.map((permission) => permission.key);
    expect(keys).toEqual(expect.arrayContaining([
      "staff_faq.view",
      "staff_faq.manage",
      "erlc.check",
      "erlc.details.view",
    ]));
  });

  it("ships all internal handbook sections from the supplied PDF", () => {
    const migration = readProjectFile("netlify/database/migrations/20260721120000_portal_v4.sql");
    for (const section of [
      "Beförderungen & Ränge",
      "Verwarnungen & Sanktionen",
      "Aktivität",
      "Moderation",
      "Discord & Bans",
      "Beschwerden & Tickets",
      "Allgemeine Fragen",
    ]) {
      expect(migration).toContain(section);
    }
    expect(migration).toContain("Wann darf ein Ticket geschlossen werden?");
    expect(migration).toContain("nach 48 Stunden");
  });

  it("polls ER:LC every five minutes and keeps navigation non-blocking", () => {
    expect(readProjectFile("netlify/functions/erlc-poll.mts")).toContain('schedule: "*/5 * * * *"');
    expect(readProjectFile("components/navigation-progress.module.css")).toContain("pointer-events: none");
  });
});
