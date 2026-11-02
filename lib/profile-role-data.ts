import { jsonRoleIds } from "@/lib/discord-ranks";
import { prisma } from "@/lib/prisma";
import { discordProfileRoles, melonlyProfileRoles, type ProfileIdentity } from "@/lib/profile-roles";

export async function getProfileRoleData(identity: ProfileIdentity) {
  const guildId = process.env.DISCORD_GUILD_ID?.trim() || null;
  const [snapshot, members] = await Promise.all([
    guildId && identity.discordId
      ? prisma.discordMemberSnapshot.findUnique({
        where: { guildId_discordId: { guildId, discordId: identity.discordId } },
        select: { guildId: true, discordId: true, roleIds: true, lastSyncedAt: true },
      })
      : null,
    prisma.melonlyMember.findMany({
      where: { OR: [
        { userId: identity.id },
        ...(identity.discordId ? [{ discordId: identity.discordId }] : []),
        ...(identity.robloxUserId ? [{ robloxUserId: identity.robloxUserId }] : []),
      ] },
      select: {
        id: true, userId: true, discordId: true, robloxUserId: true,
        active: true, lastSyncedAt: true,
        role: { select: { id: true, name: true, active: true } },
      },
    }),
  ]);
  const roleIds = jsonRoleIds(snapshot?.roleIds);
  const catalog = guildId && roleIds.length
    ? await prisma.discordRole.findMany({
      where: { guildId, discordRoleId: { in: roleIds } },
      select: { guildId: true, discordRoleId: true, name: true, position: true },
    })
    : [];
  return {
    discord: discordProfileRoles(identity, guildId, snapshot, catalog),
    melonly: melonlyProfileRoles(identity, members, Boolean(process.env.MELONLY_API_TOKEN?.trim())),
  };
}
