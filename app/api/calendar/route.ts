import { NextResponse } from "next/server";
import { expandCalendarRevision } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getAuthorizationContext } from "@/lib/authz";
import { canAccessCalendarCategory } from "@/lib/permissions";

export async function GET(request: Request) {
  const now = new Date();
  const params = new URL(request.url).searchParams;
  const start = params.get("from") ? new Date(params.get("from")!) : new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  const end = params.get("until") ? new Date(params.get("until")!) : new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start || end.getTime() - start.getTime() > 370 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: "Ungültiger oder zu großer Kalenderzeitraum." }, { status: 400 });
  const categoryIds = params.getAll("category").flatMap((value) => value.split(",")).filter(Boolean).slice(0, 50);
  const staffMode = params.get("staff") === "1";
  const session = staffMode ? await auth() : null;
  const authorization = session?.user?.id ? await getAuthorizationContext(session.user.id) : null;
  if (staffMode && !authorization) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const statusFilter = params.get("status");
  const events = await prisma.calendarEvent.findMany({ where: { archivedAt: null, category: { visible: true, ...(categoryIds.length ? { id: { in: categoryIds } } : {}) } }, include: { category: true, revisions: { where: staffMode ? undefined : { status: "PUBLISHED" }, orderBy: [{ createdAt: "desc" }], take: staffMode ? 20 : 1 } } }).catch(() => []);
  const selected = events.flatMap((event) => {
    const canEdit = Boolean(authorization && (authorization.isOwner || canAccessCalendarCategory(authorization, event.categoryId, "canManage") || canAccessCalendarCategory(authorization, event.categoryId, "canPublish") || (event.creatorId === authorization.userId && canAccessCalendarCategory(authorization, event.categoryId, "canEditOwn"))));
    const revision = staffMode && canEdit ? event.revisions[0] : event.revisions.find((item) => item.status === "PUBLISHED");
    if (!revision || (statusFilter && statusFilter !== "ALL" && revision.status !== statusFilter)) return [];
    return expandCalendarRevision({ ...revision, event }, start, end);
  });
  const occurrences = selected.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).map(({ id, revision, startsAt, endsAt }) => ({ id, eventId: revision.event.id, slug: revision.event.slug, title: revision.title, summary: revision.summary, category: { id: revision.event.category.id, title: revision.event.category.title, color: revision.event.category.color }, startsAt, endsAt, allDay: revision.allDay, location: revision.location, recurrence: revision.recurrenceFrequency, status: revision.status }));
  return NextResponse.json({ generatedAt: now, occurrences }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
