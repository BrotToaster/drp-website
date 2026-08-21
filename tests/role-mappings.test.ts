import { describe, expect, it } from "vitest";
import { canManageDiscordRoleMappings, diffDiscordRoleMappings } from "@/lib/role-mappings";

describe("Discord-Mehrfachzuordnung", () => {
  it("erfordert Rollen- und Discord-Verwaltungsrechte", () => {
    expect(canManageDiscordRoleMappings({ permissions: ["roles.manage", "discord.manage"], isOwner: false })).toBe(true);
    expect(canManageDiscordRoleMappings({ permissions: ["roles.manage"], isOwner: false })).toBe(false);
    expect(canManageDiscordRoleMappings({ permissions: ["discord.manage"], isOwner: false })).toBe(false);
    expect(canManageDiscordRoleMappings({ permissions: [], isOwner: true })).toBe(true);
  });

  it("ermittelt neue, entfernte und beibehaltene Rollen ohne Duplikate", () => {
    expect(diffDiscordRoleMappings(["a", "b", "b"], ["b", "c", "c"])).toEqual({
      added: ["c"],
      removed: ["a"],
      retained: ["b"],
    });
  });
});
