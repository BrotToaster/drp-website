import { describe, expect, it } from "vitest";
import { isErlcStateStale, transformPublicStatus } from "@/lib/erlc";

describe("öffentlicher ER:LC-Status", () => {
  it("gibt nur aggregierte Statuswerte zurück", () => {
    const result = transformPublicStatus(
      {
        Name: "DRP Test",
        CurrentPlayers: 12,
        MaxPlayers: 40,
        Queue: [1, 2],
        Players: [{ Player: "SecretPlayer:123" }],
      },
      "demo",
    );
    expect(result).toMatchObject({
      online: true,
      name: "DRP Test",
      players: 12,
      maxPlayers: 40,
      queue: 2,
      source: "demo",
    });
    expect(result).not.toHaveProperty("Players");
  });
});

describe("ER:LC-Abgleichzeit", () => {
  it("markiert einen mehr als zehn Minuten alten erfolgreichen Abgleich als veraltet", () => {
    const now = new Date("2026-08-18T20:20:00.000Z").getTime();
    expect(isErlcStateStale("2026-08-18T20:09:59.000Z", now)).toBe(true);
    expect(isErlcStateStale("2026-08-18T20:15:00.000Z", now)).toBe(false);
  });
});
