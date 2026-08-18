import { Prisma } from "@prisma/client";
import { refreshErlcTelemetry } from "../lib/erlc-telemetry";
import { getRetentionSettings } from "../lib/legal-settings";
import { melonlyConfigured, syncMelonlyData } from "../lib/melonly";
import { prisma } from "../lib/prisma";
import { expireTeamRoles, generateWeeklyTeamReview, lastCompletedBerlinWeek } from "../lib/team-workflow";

const beforeDays = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

function fiveMinuteKey(now: Date) {
  const value = new Date(now);
  value.setUTCMinutes(Math.floor(value.getUTCMinutes() / 5) * 5, 0, 0);
  return value.toISOString().slice(0, 16);
}

async function runOnce(jobKey: string, runKey: string, task: () => Promise<unknown>) {
  try {
    await prisma.scheduledJobRun.create({ data: { jobKey, runKey } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { skipped: true };
    throw error;
  }
  try {
    const details = await task();
    await prisma.scheduledJobRun.update({ where: { runKey }, data: { status: "SUCCEEDED", finishedAt: new Date(), details: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue } });
    return details;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.scheduledJobRun.update({ where: { runKey }, data: { status: "FAILED", finishedAt: new Date(), error: message } });
    throw error;
  }
}

async function retentionCleanup() {
  const retention = await getRetentionSettings();
  return prisma.$transaction(async (tx) => {
    const tickets = await tx.ticket.deleteMany({ where: { status: "CLOSED", updatedAt: { lt: beforeDays(retention.closedTicketDays) } } });
    const auditLogs = await tx.auditLog.deleteMany({ where: { createdAt: { lt: beforeDays(retention.auditLogDays) } } });
    const discordSnapshots = await tx.discordMemberSnapshot.deleteMany({ where: { lastSyncedAt: { lt: beforeDays(retention.discordSnapshotDays) } } });
    const erlcSnapshots = await tx.erlcMetricSnapshot.deleteMany({ where: { capturedAt: { lt: beforeDays(30) } } });
    const oldRuns = await tx.scheduledJobRun.deleteMany({ where: { startedAt: { lt: beforeDays(90) } } });
    return { tickets: tickets.count, auditLogs: auditLogs.count, discordSnapshots: discordSnapshots.count, erlcSnapshots: erlcSnapshots.count, oldRuns: oldRuns.count };
  });
}

async function main() {
  const now = new Date();
  const results: Record<string, unknown> = {};
  const tasks: Array<[string, () => Promise<unknown>]> = [
    ["erlc", () => runOnce("erlc", `erlc:${fiveMinuteKey(now)}`, refreshErlcTelemetry)],
    ["team-expiry", () => runOnce("team-expiry", `team-expiry:${fiveMinuteKey(now)}`, () => expireTeamRoles(now))],
    ["retention", () => runOnce("retention", `retention:${now.toISOString().slice(0, 10)}`, retentionCleanup)],
  ];
  if (melonlyConfigured()) tasks.push(["melonly", () => runOnce("melonly", `melonly:${now.toISOString().slice(0, 13)}`, syncMelonlyData)]);
  const week = lastCompletedBerlinWeek(now);
  tasks.push(["team-week", () => runOnce("team-week", `team-week:${week.weekStart.toISOString().slice(0, 10)}`, () => generateWeeklyTeamReview(now))]);
  for (const [key, task] of tasks) {
    try { results[key] = await task(); }
    catch (error) { results[key] = { error: error instanceof Error ? error.message : String(error) }; }
  }
  console.log(JSON.stringify({ ok: true, at: now.toISOString(), results }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
