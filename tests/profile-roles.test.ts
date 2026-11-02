import { describe, expect, it } from "vitest";
import {
  discordProfileRoles, melonlyProfileRoles,
  type ProfileDiscordSnapshot, type ProfileIdentity, type ProfileMelonlyMember,
} from "@/lib/profile-roles";

const identity: ProfileIdentity = { id: "user-1", discordId: "discord-1", robloxUserId: "roblox-1" };
const syncedAt = new Date("2026-10-15T12:00:00Z");
const snapshot: ProfileDiscordSnapshot = { guildId: "drp", discordId: identity.discordId!, roleIds: ["player", "admin", "drp", "player"], lastSyncedAt: syncedAt };
const catalog = [
  { guildId: "drp", discordRoleId: "player", name: "Mitglied", position: 1 },
  { guildId: "drp", discordRoleId: "admin", name: "Administration", position: 10 },
  { guildId: "other", discordRoleId: "admin", name: "Fremder Server", position: 100 },
  { guildId: "drp", discordRoleId: "unused", name: "Nicht zugewiesen", position: 100 },
];
const member: ProfileMelonlyMember = {
  id: "melonly-1", userId: identity.id, discordId: identity.discordId, robloxUserId: identity.robloxUserId,
  active: true, lastSyncedAt: syncedAt, role: { id: "mod", name: "Moderator", active: true },
};

describe("Discord-Rollen im eigenen Profil", () => {
  it("zeigt nur zugewiesene Rollen des richtigen Servers, absteigend und ohne @everyone oder Duplikate", () => {
    expect(discordProfileRoles(identity, "drp", snapshot, catalog)).toEqual({
      roles: [{ id: "admin", name: "Administration" }, { id: "player", name: "Mitglied" }],
      syncedAt, message: null,
    });
  });

  it("unterscheidet fehlende Kontoverknüpfung, Serverkonfiguration und ausstehenden Abgleich", () => {
    expect(discordProfileRoles({ ...identity, discordId: null }, "drp", snapshot, catalog).message).toContain("Verbinde dein Discord-Konto");
    expect(discordProfileRoles(identity, null, snapshot, catalog).message).toContain("noch nicht eingerichtet");
    expect(discordProfileRoles(identity, "drp", null, catalog).message).toContain("noch kein Rollenabgleich");
  });

  it("verwirft Snapshots anderer Personen und anderer Server", () => {
    for (const other of [{ ...snapshot, discordId: "other" }, { ...snapshot, guildId: "other" }]) {
      const result = discordProfileRoles(identity, "drp", other, catalog);
      expect(result.roles).toEqual([]);
      expect(result.syncedAt).toBeNull();
    }
  });

  it("kennzeichnet einen erfolgreichen Abgleich ohne zusätzliche Rollen als solchen", () => {
    const result = discordProfileRoles(identity, "drp", { ...snapshot, roleIds: ["drp"] }, catalog);
    expect(result.roles).toEqual([]);
    expect(result.syncedAt).toEqual(syncedAt);
    expect(result.message).toContain("Keine zusätzlichen Serverrollen");
  });

  it("zeigt bei unbekannten Rollen die bekannten Namen und einen Hinweis statt interner IDs", () => {
    const result = discordProfileRoles(identity, "drp", { ...snapshot, roleIds: ["player", "unknown-id"] }, catalog);
    expect(result.roles).toEqual([{ id: "player", name: "Mitglied" }]);
    expect(result.message).toContain("Eine weitere Rolle");
    expect(result.message).not.toContain("unknown-id");
  });

  it("verwechselt beschädigte Daten nicht mit einer leeren Rollenliste", () => {
    for (const roleIds of [null, {}, ["player", 123]]) {
      const result = discordProfileRoles(identity, "drp", { ...snapshot, roleIds }, catalog);
      expect(result.roles).toEqual([]);
      expect(result.message).toContain("nicht lesbar");
    }
  });
});

describe("Melonly-Rang im eigenen Profil", () => {
  it("unterstützt direkte Website-Zuordnung sowie eindeutige Discord- und Roblox-Verknüpfungen", () => {
    for (const linked of [member,
      { ...member, userId: null, robloxUserId: null },
      { ...member, userId: null, discordId: null },
      { ...member, discordId: null, robloxUserId: null },
    ]) {
      expect(melonlyProfileRoles(identity, [linked], true)).toEqual({
        roles: [{ id: "mod", name: "Moderator" }], message: null, syncedAt,
      });
    }
  });

  it("zeigt vorhandene lokale Daten auch ohne aktuell konfigurierten API-Token", () => {
    expect(melonlyProfileRoles(identity, [member], false).roles).toEqual([{ id: "mod", name: "Moderator" }]);
  });

  it("gibt fremde oder widersprüchlich zugeordnete Ränge nicht preis", () => {
    for (const conflicting of [
      { ...member, userId: "other" },
      { ...member, discordId: "other" },
      { ...member, robloxUserId: "other" },
    ]) {
      const result = melonlyProfileRoles(identity, [conflicting], true);
      expect(result.roles).toEqual([]);
      expect(result.syncedAt).toBeNull();
      expect(result.message).toContain("nicht eindeutig");
    }
    expect(melonlyProfileRoles(identity, [{ ...member, userId: "other", discordId: "other", robloxUserId: "other" }], true).roles).toEqual([]);
  });

  it("wählt bei mehrfach passenden Mitgliedern nicht willkürlich einen Rang", () => {
    const result = melonlyProfileRoles(identity, [member, { ...member, id: "duplicate", userId: null }], true);
    expect(result.roles).toEqual([]);
    expect(result.message).toContain("nicht eindeutig");
  });

  it("kennzeichnet inaktive Mitglieder und fehlende oder inaktive Rollen", () => {
    const inactive = melonlyProfileRoles(identity, [{ ...member, active: false }], true);
    expect(inactive.roles).toEqual([]);
    expect(inactive.syncedAt).toEqual(syncedAt);
    expect(inactive.message).toContain("als inaktiv erfasst");
    for (const role of [null, { ...member.role!, active: false }]) {
      const result = melonlyProfileRoles(identity, [{ ...member, role }], true);
      expect(result.roles).toEqual([]);
      expect(result.message).toContain("kein aktiver Rang");
    }
  });

  it("unterscheidet ausstehende Zuordnung von einer noch nicht eingerichteten Anbindung", () => {
    expect(melonlyProfileRoles(identity, [], true).message).toContain("noch kein Melonly-Mitglied zugeordnet");
    expect(melonlyProfileRoles(identity, [], false).message).toContain("noch nicht eingerichtet");
  });
});
