import { NextResponse } from "next/server";
import { expandCalendarRevision } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const now = new Date();
  const requestedEnd = new URL(request.url).searchParams.get("until");
  const end = requestedEnd ? new Date(requestedEnd) : new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  const safeEnd = Number.isNaN(end.getTime()) || end > new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000) ? new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) : end;
  const events = await prisma.calendarEvent.findMany({ where: { archivedAt: null, category: { visible: true } }, include: { category: true, revisions: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 1 } } });
  const occurrences = events.flatMap((event) => event.revisions[0] ? expandCalendarRevision({ ...event.revisions[0], event }, now, safeEnd) : []).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).map(({ id, revision, startsAt, endsAt }) => ({ id, eventId: revision.event.id, slug: revision.event.slug, title: revision.title, summary: revision.summary, category: { id: revision.event.category.id, title: revision.event.category.title, color: revision.event.category.color }, startsAt, endsAt, allDay: revision.allDay, location: revision.location, recurrence: revision.recurrenceFrequency }));
  return NextResponse.json({ generatedAt: now, occurrences }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
