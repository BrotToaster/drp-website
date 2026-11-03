import { hostedPreviewEnabled } from "./preview-mode";
import { assertPreviewDatabase } from "@/prisma/preview-guard.mjs";
import { prisma } from "./prisma";

export async function cleanupPreview() {
  if (!hostedPreviewEnabled()) throw new Error("Keine Entscheidungsvorschau.");
  await assertPreviewDatabase(prisma, process.env.DRP_PREVIEW_DATABASE_ID);
  return prisma.$transaction(async tx => {
    const limits = await tx.guestTicketRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const tickets = await tx.ticket.deleteMany({ where: { id: { not: { startsWith: "preview-" } }, status: "CLOSED", updatedAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
    const audit = await tx.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
    return { limits: limits.count, tickets: tickets.count, audit: audit.count };
  });
}
