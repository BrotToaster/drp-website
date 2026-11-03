import { createHmac } from "node:crypto";
import { prisma } from "./prisma";
import { hostedPreviewEnabled, matchesSecretHash, previewRoles, previewUserId, type PreviewRole } from "./preview-mode";
import { assertPreviewDatabase } from "@/prisma/preview-guard.mjs";
import { authSigningSecret } from "./server-secret";

export async function authenticatePreview(role: unknown, password: unknown) {
  if (!hostedPreviewEnabled() || !previewRoles.includes(role as PreviewRole) || typeof password !== "string") return null;
  await assertPreviewDatabase(prisma, process.env.DRP_PREVIEW_DATABASE_ID);
  const key = createHmac("sha256", authSigningSecret()).update(`preview-login:${role}`).digest("hex");
  const since = new Date(Date.now() - 10 * 60000);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    if (await tx.guestTicketRateLimit.count({ where: { fingerprintHash: key, createdAt: { gt: since } } }) >= 10) return null;
    if (!(await matchesSecretHash(password, process.env[`PREVIEW_${String(role).toUpperCase()}_PASSWORD_HASH`]))) {
      await tx.guestTicketRateLimit.create({ data: { fingerprintHash: key, expiresAt: new Date(Date.now() + 10 * 60000) } });
      return null;
    }
    const user = await tx.user.findUnique({ where: { id: previewUserId(role as PreviewRole) } });
    return user ? { id: user.id, name: user.name, registrationCompleted: true } : null;
  });
}
