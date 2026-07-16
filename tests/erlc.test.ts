import { describe, expect, it } from "vitest";
import { transformPublicStatus } from "@/lib/erlc";

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
