import { NextResponse } from "next/server";
import { z } from "zod";
import { isBotAuthorized } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60 * 1000);
  await prisma.discordRoleJob.updateMany({ where: { status: "PROCESSING", lockedAt: { lt: stale } }, data: { status: "PENDING", lockedAt: null, lastError: "Auftragssperre abgelaufen; erneuter Versuch." } });
  const candidates = await prisma.discordRoleJob.findMany({ where: { status: "PENDING", availableAt: { lte: now } }, orderBy: { createdAt: "asc" }, take: 20 });
  const claimed: string[] = [];
  for (const candidate of candidates) {
    const updated = await prisma.discordRoleJob.updateMany({ where: { id: candidate.id, status: "PENDING" }, data: { status: "PROCESSING", lockedAt: now, attempts: { increment: 1 } } });
    if (updated.count) claimed.push(candidate.id);
  }
  const jobs = await prisma.discordRoleJob.findMany({ where: { id: { in: claimed } }, include: { discordRole: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ jobs: jobs.map((job) => ({ id: job.id, discordId: job.discordId, discordRoleId: job.discordRole.discordRoleId, operation: job.operation, attempts: job.attempts })) });
}

const acknowledgementSchema = z.object({ jobs: z.array(z.object({ id: z.string().min(1), success: z.boolean(), error: z.string().max(1000).optional() })).min(1).max(100) });

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = acknowledgementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Bestätigung", details: parsed.error.flatten() }, { status: 400 });
  let updated = 0;
  for (const item of parsed.data.jobs) {
    const result = await prisma.discordRoleJob.updateMany({ where: { id: item.id, status: "PROCESSING" }, data: item.success ? { status: "SUCCEEDED", completedAt: new Date(), lockedAt: null, lastError: null } : { status: "FAILED", completedAt: new Date(), lockedAt: null, lastError: item.error || "Discord-Bot meldete einen Fehler." } });
    updated += result.count;
  }
  return NextResponse.json({ updated });
}
