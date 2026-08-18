import type { Prisma, WeeklyRecommendation } from "@prisma/client";
import { localDateTimeToUtc } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { evaluateTeamWeek, formatWeeklyReport } from "@/lib/team-evaluation";

const DAY_MS = 24 * 60 * 60 * 1000;

function berlinDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function lastCompletedBerlinWeek(now = new Date()) {
  const p = berlinDateParts(now);
  const today = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const currentMonday = new Date(today.getTime() - mondayOffset * DAY_MS);
  const weekStart = new Date(currentMonday.getTime() - 7 * DAY_MS);
  const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
  const rangeStart = localDateTimeToUtc(`${weekStart.toISOString().slice(0, 10)}T00:00`) || weekStart;
  const nextMonday = new Date(weekStart.getTime() + 7 * DAY_MS);
  const rangeEnd = localDateTimeToUtc(`${nextMonday.toISOString().slice(0, 10)}T00:00`) || nextMonday;
  return { weekStart, weekEnd, rangeStart, rangeEnd };
}

function overlapDays(start: Date, end: Date, weekStart: Date, weekEnd: Date) {
  const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const first = startDay > weekStart ? startDay : weekStart;
  const last = endDay < weekEnd ? endDay : weekEnd;
  return last < first ? 0 : Math.floor((last.getTime() - first.getTime()) / DAY_MS) + 1;
}

export async function generateWeeklyTeamReview(now = new Date()) {
  const { weekStart, weekEnd, rangeStart, rangeEnd } = lastCompletedBerlinWeek(now);
  const review = await prisma.teamWeeklyReview.upsert({ where: { weekStart_weekEnd: { weekStart, weekEnd } }, update: { sourceSyncedAt: now }, create: { weekStart, weekEnd, sourceSyncedAt: now } });
  const members = await prisma.melonlyMember.findMany({
    where: { active: true },
    include: {
      role: { include: { nextRole: true } },
      shifts: { where: { startsAt: { lt: rangeEnd }, OR: [{ endsAt: { gt: rangeStart } }, { endsAt: null }] } },
      leaves: { where: { approved: true, startsOn: { lte: weekEnd }, endsOn: { gte: weekStart } } },
      strikes: { where: { status: "ACTIVE", expiresAt: { gt: rangeStart } } },
      rankBlocks: { where: { startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart }, liftedAt: null } },
    },
  });
  for (const member of members) {
    const actualMinutes = member.shifts.reduce((total, shift) => total + Math.max(0, shift.durationMinutes), 0);
    const loaDays = member.leaves.reduce((total, leave) => total + overlapDays(leave.startsOn, leave.endsOn, weekStart, weekEnd), 0);
    const requiredMinutes = member.role?.weeklyTargetMinutes || 0;
    const evaluation = evaluateTeamWeek({ requiredMinutes, actualMinutes, loaDays, activeStrikes: member.strikes.length, rankBlocked: member.rankBlocks.length > 0, nextRoleName: member.role?.nextRole?.name });
    const existing = await prisma.teamWeeklyResult.findUnique({ where: { reviewId_memberId: { reviewId: review.id, memberId: member.id } } });
    if (!existing) {
      await prisma.teamWeeklyResult.create({ data: { reviewId: review.id, memberId: member.id, requiredMinutes, actualMinutes, loaDays, activeStrikesBefore: member.strikes.length, recommendation: evaluation.recommendation, reason: evaluation.reason } });
    } else if (existing.decision === "PENDING") {
      await prisma.teamWeeklyResult.update({ where: { id: existing.id }, data: { requiredMinutes, actualMinutes, loaDays, activeStrikesBefore: member.strikes.length, recommendation: evaluation.recommendation, reason: evaluation.reason } });
    }
  }
  const results = await prisma.teamWeeklyResult.findMany({ where: { reviewId: review.id }, include: { member: { include: { role: true } } }, orderBy: { member: { displayName: "asc" } } });
  const reportText = formatWeeklyReport({ weekStart, weekEnd, results: results.map((result) => ({ displayName: result.member.displayName, roleName: result.member.role?.name, actualMinutes: result.actualMinutes, requiredMinutes: result.requiredMinutes, recommendation: result.recommendation, reason: result.reason })) });
  await prisma.teamWeeklyReview.update({ where: { id: review.id }, data: { reportText } });
  return { reviewId: review.id, weekStart, weekEnd, reportText, count: results.length };
}

async function queueMappedRole(tx: Prisma.TransactionClient, input: { mappingKey: string; memberId: string; discordId: string; operation: "ADD" | "REMOVE"; dedupeSuffix: string }) {
  const mapping = await tx.discordTeamRoleMapping.findUnique({ where: { key: input.mappingKey }, include: { discordRole: true } });
  if (!mapping?.enabled || !mapping.discordRoleId || !mapping.discordRole) return false;
  await tx.discordRoleJob.upsert({
    where: { dedupeKey: `${input.dedupeSuffix}:${input.mappingKey}:${input.operation}` },
    update: {},
    create: { dedupeKey: `${input.dedupeSuffix}:${input.mappingKey}:${input.operation}`, memberId: input.memberId, discordId: input.discordId, discordRoleId: mapping.discordRoleId, operation: input.operation },
  });
  return true;
}

async function syncStrikeRoles(tx: Prisma.TransactionClient, input: { memberId: string; discordId: string; strikeNumber: number; dedupeSuffix: string }) {
  let jobs = 0;
  for (const number of [1, 2, 3]) {
    const operation = number === input.strikeNumber ? "ADD" : "REMOVE";
    if (await queueMappedRole(tx, { mappingKey: `STRIKE_${number}`, memberId: input.memberId, discordId: input.discordId, operation, dedupeSuffix: input.dedupeSuffix })) jobs += 1;
  }
  return jobs;
}

export async function applyWeeklyResult(resultId: string, reviewerId: string, decision: "apply" | "reject", notes?: string) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.teamWeeklyResult.findUnique({ where: { id: resultId }, include: { member: true, review: true } });
    if (!result || result.decision !== "PENDING") throw new Error("CONFLICT");
    if (decision === "reject") {
      await tx.teamWeeklyResult.update({ where: { id: result.id }, data: { decision: "REJECTED", notes: notes || null, reviewerId, reviewedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: reviewerId, action: "TEAM_WEEKLY_RESULT_REJECTED", entityType: "TeamWeeklyResult", entityId: result.id, metadata: { recommendation: result.recommendation } } });
      return { jobs: 0, recommendation: result.recommendation };
    }
    let jobs = 0;
    const discordId = result.member.discordId;
    if (result.recommendation === "STRIKE") {
      const strikeNumber = Math.min(3, result.activeStrikesBefore + 1);
      const strike = await tx.teamStrike.create({ data: { memberId: result.memberId, resultId: result.id, reason: result.reason, expiresAt: new Date(Date.now() + 3650 * DAY_MS), issuerId: reviewerId } });
      if (discordId) jobs += await syncStrikeRoles(tx, { memberId: result.memberId, discordId, strikeNumber, dedupeSuffix: result.id });
      if (strikeNumber === 2) {
        const block = await tx.teamRankBlock.create({ data: { memberId: result.memberId, sourceStrikeId: strike.id, endsAt: new Date(Date.now() + 14 * DAY_MS) } });
        if (discordId && await queueMappedRole(tx, { mappingKey: "UPRANK_BLOCK", memberId: result.memberId, discordId, operation: "ADD", dedupeSuffix: block.id })) jobs += 1;
      }
    } else if (result.recommendation === "REMOVAL" && discordId) {
      jobs += await syncStrikeRoles(tx, { memberId: result.memberId, discordId, strikeNumber: 3, dedupeSuffix: result.id });
    }
    await tx.teamWeeklyResult.update({ where: { id: result.id }, data: { decision: "APPLIED", notes: notes || null, reviewerId, reviewedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: reviewerId, action: "TEAM_WEEKLY_RESULT_APPLIED", entityType: "TeamWeeklyResult", entityId: result.id, metadata: { recommendation: result.recommendation, jobs, discordLinked: Boolean(discordId) } } });
    return { jobs, recommendation: result.recommendation };
  });
}

export async function expireTeamRoles(now = new Date()) {
  const blocks = await prisma.teamRankBlock.findMany({ where: { liftedAt: null, endsAt: { lte: now } }, include: { member: true } });
  let jobs = 0;
  await prisma.$transaction(async (tx) => {
    for (const block of blocks) {
      await tx.teamRankBlock.update({ where: { id: block.id }, data: { liftedAt: now } });
      if (block.member.discordId && await queueMappedRole(tx, { mappingKey: "UPRANK_BLOCK", memberId: block.memberId, discordId: block.member.discordId, operation: "REMOVE", dedupeSuffix: `expiry:${block.id}` })) jobs += 1;
    }
    await tx.teamStrike.updateMany({ where: { status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
  });
  return { blocks: blocks.length, jobs };
}

export function recommendationLabel(value: WeeklyRecommendation) {
  return ({ UPRANK: "Up-Rank", LOA: "LoA", STRIKE: "Strike", BLOCKED: "Up-Rank-Sperre", REMOVAL: "Teamentfernung", NO_ACTION: "Keine Aktion" } as const)[value];
}
