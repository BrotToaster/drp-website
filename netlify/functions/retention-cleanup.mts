import { getRetentionSettings } from "../../lib/legal-settings";
import { prisma } from "../../lib/prisma";

const beforeDays = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export default async function retentionCleanup() {
  const retention = await getRetentionSettings();
  const result = await prisma.$transaction(async (tx) => {
    const tickets = await tx.ticket.deleteMany({
      where: {
        status: "CLOSED",
        updatedAt: { lt: beforeDays(retention.closedTicketDays) },
      },
    });
    const auditLogs = await tx.auditLog.deleteMany({
      where: { createdAt: { lt: beforeDays(retention.auditLogDays) } },
    });
    const discordSnapshots = await tx.discordMemberSnapshot.deleteMany({
      where: { lastSyncedAt: { lt: beforeDays(retention.discordSnapshotDays) } },
    });
    const erlcSnapshots = await tx.erlcMetricSnapshot.deleteMany({
      where: { capturedAt: { lt: beforeDays(30) } },
    });
    return {
      tickets: tickets.count,
      auditLogs: auditLogs.count,
      discordSnapshots: discordSnapshots.count,
      erlcSnapshots: erlcSnapshots.count,
    };
  });
  return new Response(JSON.stringify({ ok: true, deleted: result }), {
    headers: { "content-type": "application/json" },
  });
}

export const config = {
  schedule: "@daily",
};
