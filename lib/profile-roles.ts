export type ProfileIdentity = {
  id: string;
  discordId: string | null;
  robloxUserId: string | null;
};

type RoleLabel = { id: string; name: string };

export type ProfileRoleGroup = {
  roles: RoleLabel[];
  message: string | null;
  syncedAt: Date | null;
};

export type ProfileDiscordSnapshot = {
  guildId: string;
  discordId: string;
  roleIds: unknown;
  lastSyncedAt: Date;
};

export type ProfileDiscordRole = {
  guildId: string;
  discordRoleId: string;
  name: string;
  position: number;
};

export function discordProfileRoles(
  identity: ProfileIdentity,
  guildId: string | null,
  snapshot: ProfileDiscordSnapshot | null,
  catalog: readonly ProfileDiscordRole[],
): ProfileRoleGroup {
  const empty = { roles: [], syncedAt: null };
  if (!identity.discordId) return { ...empty, message: "Verbinde dein Discord-Konto unter „Kontoverknüpfungen“, um deine Serverrollen zu sehen." };
  if (!guildId) return { ...empty, message: "Die Anzeige der Discord-Rollen ist noch nicht eingerichtet. Bitte wende dich an das Team." };
  if (!snapshot || snapshot.discordId !== identity.discordId || snapshot.guildId !== guildId) {
    return { ...empty, message: "Für dein Konto liegt noch kein Rollenabgleich mit dem DRP-Discord vor." };
  }
  if (!Array.isArray(snapshot.roleIds) || !snapshot.roleIds.every((id) => typeof id === "string")) {
    return { ...empty, syncedAt: snapshot.lastSyncedAt, message: "Die gespeicherten Discord-Rollen sind nicht lesbar. Bitte lass den Abgleich vom Team prüfen." };
  }
  // Discord's universal @everyone role is implicit and does not describe a rank.
  const ids = new Set<string>(snapshot.roleIds.filter((id) => id !== guildId));
  const roles = catalog
    .filter((role) => role.guildId === guildId && ids.has(role.discordRoleId))
    .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name, "de"));
  const missing = [...ids].filter((id) => !roles.some((role) => role.discordRoleId === id)).length;
  return {
    roles: roles.map((role) => ({ id: role.discordRoleId, name: role.name })),
    syncedAt: snapshot.lastSyncedAt,
    message: missing
      ? `${missing === 1 ? "Eine weitere Rolle konnte" : `${missing} weitere Rollen konnten`} noch nicht zugeordnet werden. Der Rollenabgleich muss aktualisiert werden.`
      : roles.length ? null : "Keine zusätzlichen Serverrollen. Die allgemeine Rolle @everyone wird nicht aufgeführt.",
  };
}

export type ProfileMelonlyMember = {
  id: string;
  userId: string | null;
  discordId: string | null;
  robloxUserId: string | null;
  active: boolean;
  lastSyncedAt: Date;
  role: (RoleLabel & { active: boolean }) | null;
};

export function melonlyProfileRoles(
  identity: ProfileIdentity,
  members: readonly ProfileMelonlyMember[],
  configured: boolean,
): ProfileRoleGroup {
  const empty = { roles: [], syncedAt: null };
  // Never match by display name, and never expose a record assigned to another user.
  const matches = members.filter((member) => member.userId === identity.id
    || Boolean(identity.discordId && member.discordId === identity.discordId)
    || Boolean(identity.robloxUserId && member.robloxUserId === identity.robloxUserId));
  if (!matches.length) return {
    ...empty,
    message: configured
      ? "Für dein DRP-Konto ist noch kein Melonly-Mitglied zugeordnet. Falls du im Team bist, lass die Zuordnung prüfen."
      : "Die Melonly-Anbindung ist noch nicht eingerichtet. Dein Rang erscheint nach dem ersten Abgleich und der Kontozuordnung.",
  };
  const member = matches[0];
  const conflictingIdentity = (member.userId && member.userId !== identity.id)
    || (member.discordId && identity.discordId && member.discordId !== identity.discordId)
    || (member.robloxUserId && identity.robloxUserId && member.robloxUserId !== identity.robloxUserId);
  if (matches.length !== 1 || conflictingIdentity) return {
    ...empty, message: "Die Melonly-Zuordnung ist nicht eindeutig. Bitte lass sie vom Team prüfen.",
  };
  if (!member.active) return { ...empty, syncedAt: member.lastSyncedAt, message: "Dein Melonly-Mitglied ist im letzten Abgleich als inaktiv erfasst. Es wird kein aktiver Rang angezeigt." };
  if (!member.role || !member.role.active) return { ...empty, syncedAt: member.lastSyncedAt, message: "Deinem Melonly-Mitglied ist im letzten Abgleich kein aktiver Rang zugeordnet." };
  return { roles: [{ id: member.role.id, name: member.role.name }], message: null, syncedAt: member.lastSyncedAt };
}
