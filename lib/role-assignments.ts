import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function ensureBaseRoleAssignments(
  db: DbClient,
  userId: string,
  discordId?: string | null,
) {
  const shouldOwn =
    userId === "demo-owner" ||
    Boolean(discordId && discordId === process.env.OWNER_DISCORD_ID);
  const keys = shouldOwn ? ["PLAYER", "OWNER"] : ["PLAYER"];
  const roles = await db.accessRole.findMany({ where: { key: { in: keys } } });

  for (const role of roles) {
    const sourceKey = role.key === "OWNER" ? "owner-env" : "default-player";
    await db.userRoleAssignment.upsert({
      where: {
        userId_roleId_source_sourceKey: {
          userId,
          roleId: role.id,
          source: "SYSTEM",
          sourceKey,
        },
      },
      update: {},
      create: { userId, roleId: role.id, source: "SYSTEM", sourceKey },
    });
  }
}