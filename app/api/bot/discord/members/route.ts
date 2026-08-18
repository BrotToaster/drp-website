import { NextResponse } from "next/server";
import { isBotAuthorized } from "@/lib/bot-auth";
import { applyDiscordRoleMappings } from "@/lib/discord-sync";
import { jsonRoleIds, resolveDiscordRank } from "@/lib/discord-ranks";
import { prisma } from "@/lib/prisma";
import { discordMemberSyncSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = discordMemberSyncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Mitgliedsdaten", details: parsed.error.flatten() }, { status: 400 });
  }

  const { guildId, externalId, members } = parsed.data;
  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.botSyncReceipt.findUnique({ where: { externalId } });
    if (duplicate) return { duplicate: true, synced: 0, linked: 0 };
    let linked = 0;
    let rankChanges = 0;
    const rankConfiguration = await tx.discordTeamRank.findMany({
      where: { active: true, discordRole: { guildId } },
      include: { discordRole: true, nextDiscordRole: true },
    });

    for (const member of members) {
      const previousSnapshot = await tx.discordMemberSnapshot.findUnique({ where: { guildId_discordId: { guildId, discordId: member.id } } });
      const previousRank = resolveDiscordRank(jsonRoleIds(previousSnapshot?.roleIds), rankConfiguration);
      const currentRank = resolveDiscordRank(member.roleIds, rankConfiguration);
      await tx.discordMemberSnapshot.upsert({
        where: { guildId_discordId: { guildId, discordId: member.id } },
        update: {
          username: member.username,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          roleIds: member.roleIds,
          lastSyncedAt: new Date(),
        },
        create: {
          guildId,
          discordId: member.id,
          username: member.username,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          roleIds: member.roleIds,
        },
      });
      if (previousSnapshot && previousRank.rank?.discordRole.id !== currentRank.rank?.discordRole.id) {
        await tx.discordRankHistory.create({
          data: {
            guildId,
            discordId: member.id,
            fromRoleId: previousRank.rank?.discordRole.id || null,
            toRoleId: currentRank.rank?.discordRole.id || null,
            fromLabel: previousRank.rank?.shortName || null,
            toLabel: currentRank.rank?.shortName || null,
            changedAt: new Date(),
          },
        });
        rankChanges += 1;
      }
      const linkedMelonlyMembers = await tx.melonlyMember.findMany({ where: { discordId: member.id }, select: { id: true } });
      if (linkedMelonlyMembers.length === 1) {
        await tx.melonlyMember.update({ where: { id: linkedMelonlyMembers[0].id }, data: { displayName: member.displayName || member.username } });
      }
      const user = await tx.user.findUnique({ where: { discordId: member.id } });
      if (user) {
        linked += 1;
        await tx.user.update({
          where: { id: user.id },
          data: {
            discordUsername: member.username,
            discordDisplayName: member.displayName || member.username,
            discordAvatarUrl: member.avatarUrl || user.discordAvatarUrl,
            discordSyncedAt: new Date(),
            avatar: member.avatarUrl || user.avatar,
          },
        });
        await applyDiscordRoleMappings(tx, user.id, guildId, member.roleIds);
      }
    }

    await tx.botSyncReceipt.create({ data: { externalId, kind: "DISCORD_MEMBERS" } });
    await tx.auditLog.create({
      data: {
        action: "DISCORD_MEMBERS_SYNCED",
        entityType: "DiscordGuild",
        entityId: guildId,
        metadata: { count: members.length, linked, rankChanges, externalId },
      },
    });
    return { duplicate: false, synced: members.length, linked, rankChanges };
  });
  return NextResponse.json(result);
}
