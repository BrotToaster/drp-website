import { NextResponse } from "next/server";
import { isBotAuthorized } from "@/lib/bot-auth";
import { applyDiscordRoleMappings } from "@/lib/discord-sync";
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

    for (const member of members) {
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
        metadata: { count: members.length, linked, externalId },
      },
    });
    return { duplicate: false, synced: members.length, linked };
  });
  return NextResponse.json(result);
}