import type { Prisma } from "@prisma/client";

export async function applyDiscordRoleMappings(
  tx: Prisma.TransactionClient,
  userId: string,
  guildId: string,
  externalRoleIds: string[],
) {
  const roles = await tx.discordRole.findMany({
    where: { guildId, discordRoleId: { in: externalRoleIds } },
    include: { mappings: { where: { active: true } } },
  });

  const desired = roles.flatMap((role) =>
    role.mappings.map((mapping) => ({
      roleId: mapping.accessRoleId,
      sourceKey: `${guildId}:${role.discordRoleId}`,
    })),
  );
  const desiredKeys = new Set(desired.map((item) => `${item.roleId}:${item.sourceKey}`));
  const existing = await tx.userRoleAssignment.findMany({
    where: { userId, source: "DISCORD", sourceKey: { startsWith: `${guildId}:` } },
  });

  const staleIds = existing
    .filter((item) => !desiredKeys.has(`${item.roleId}:${item.sourceKey}`))
    .map((item) => item.id);
  if (staleIds.length) {
    await tx.userRoleAssignment.deleteMany({ where: { id: { in: staleIds } } });
  }

  for (const item of desired) {
    await tx.userRoleAssignment.upsert({
      where: {
        userId_roleId_source_sourceKey: {
          userId,
          roleId: item.roleId,
          source: "DISCORD",
          sourceKey: item.sourceKey,
        },
      },
      update: {},
      create: { userId, roleId: item.roleId, source: "DISCORD", sourceKey: item.sourceKey },
    });
  }
}