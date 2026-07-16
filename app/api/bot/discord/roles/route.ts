import { NextResponse } from "next/server";
import { isBotAuthorized } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { discordRoleSyncSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = discordRoleSyncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Rollendaten", details: parsed.error.flatten() }, { status: 400 });
  }

  const { guildId, externalId, roles } = parsed.data;
  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.botSyncReceipt.findUnique({ where: { externalId } });
    if (duplicate) return { duplicate: true, synced: 0 };

    for (const role of roles) {
      await tx.discordRole.upsert({
        where: { guildId_discordRoleId: { guildId, discordRoleId: role.id } },
        update: {
          name: role.name,
          color: role.color,
          position: role.position,
          managed: role.managed,
          lastSyncedAt: new Date(),
        },
        create: {
          guildId,
          discordRoleId: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          managed: role.managed,
        },
      });
    }
    await tx.discordRole.deleteMany({
      where: {
        guildId,
        ...(roles.length ? { discordRoleId: { notIn: roles.map((role) => role.id) } } : {}),
      },
    });
    await tx.botSyncReceipt.create({ data: { externalId, kind: "DISCORD_ROLES" } });
    await tx.auditLog.create({
      data: {
        action: "DISCORD_ROLES_SYNCED",
        entityType: "DiscordGuild",
        entityId: guildId,
        metadata: { count: roles.length, externalId },
      },
    });
    return { duplicate: false, synced: roles.length };
  });
  return NextResponse.json(result);
}