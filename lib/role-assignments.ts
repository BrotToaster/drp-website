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
  const defaultSetting = await db.siteSetting.findUnique({ where: { key: "auth.defaultAccessRole" } });
  const configuredDefaultId = defaultSetting?.value && typeof defaultSetting.value === "object" && !Array.isArray(defaultSetting.value)
    ? String((defaultSetting.value as { roleId?: unknown }).roleId || "")
    : "";
  const [defaultRole, ownerRole] = await Promise.all([
    configuredDefaultId
      ? db.accessRole.findUnique({ where: { id: configuredDefaultId } })
      : db.accessRole.findFirst({ where: { key: { not: "OWNER" } }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }),
    shouldOwn ? db.accessRole.findUnique({ where: { key: "OWNER" } }) : Promise.resolve(null),
  ]);
  const roles = [defaultRole, ownerRole].filter((role): role is NonNullable<typeof role> => Boolean(role));

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
