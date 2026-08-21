import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthorizationContext } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  href: string;
  status?: string;
};

const MAX_RESULTS = 24;

async function search(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const session = await auth();
  const userId = session?.user?.id;
  const authorization = userId ? await getAuthorizationContext(userId) : null;
  const textFilter = { contains: q, mode: "insensitive" as const };

  const [rules, news, faq, events] = await Promise.all([
    prisma.rule.findMany({
      where: { published: true, OR: [{ title: textFilter }, { category: textFilter }, { revisions: { some: { status: "PUBLISHED", searchText: textFilter } } }] },
      select: { id: true, title: true, category: true, slug: true },
      take: 6,
      orderBy: [{ order: "asc" }, { title: "asc" }],
    }),
    prisma.newsPost.findMany({
      where: { published: true, OR: [{ title: textFilter }, { excerpt: textFilter }, { revisions: { some: { status: "PUBLISHED", searchText: textFilter } } }] },
      select: { id: true, title: true, excerpt: true, slug: true },
      take: 6,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.faqItem.findMany({
      where: { visible: true, OR: [{ question: textFilter }, { answer: textFilter }, { category: textFilter }] },
      select: { id: true, question: true, category: true },
      take: 6,
      orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
    }),
    prisma.calendarEvent.findMany({
      where: {
        archivedAt: null,
        category: { visible: true },
        revisions: { some: { status: "PUBLISHED", OR: [{ title: textFilter }, { summary: textFilter }, { searchText: textFilter }] } },
      },
      select: {
        id: true,
        slug: true,
        category: { select: { title: true } },
        revisions: { where: { status: "PUBLISHED" }, select: { title: true, startsAt: true }, orderBy: { publishedAt: "desc" }, take: 1 },
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const results: SearchResult[] = [
    ...rules.map((item) => ({ id: item.id, kind: "Regel", title: item.title, subtitle: item.category, href: `/regelwerk#${item.slug}` })),
    ...news.map((item) => ({ id: item.id, kind: "News", title: item.title, subtitle: item.excerpt, href: `/news/${item.slug}` })),
    ...faq.map((item) => ({ id: item.id, kind: "FAQ", title: item.question, subtitle: item.category, href: "/faq" })),
    ...events.flatMap((item) => item.revisions[0] ? [{ id: item.id, kind: "Termin", title: item.revisions[0].title, subtitle: item.category.title, href: `/kalender/${item.slug}` }] : []),
  ];

  if (userId && authorization) {
    const ownTickets = await prisma.ticket.findMany({
      where: { userId, ownerHiddenAt: null, OR: [{ subject: textFilter }, { messages: { some: { internal: false, content: textFilter } } }] },
      select: { id: true, number: true, subject: true, status: true, category: { select: { label: true } } },
      take: 6,
      orderBy: { updatedAt: "desc" },
    });
    results.push(...ownTickets.map((item) => ({ id: item.id, kind: "Ticket", title: `#${item.number} · ${item.subject}`, subtitle: item.category.label, status: item.status, href: `/dashboard/tickets/${item.id}` })));

    if (hasPermission(authorization, "tickets.view")) {
      const categoryIds = authorization.isOwner ? undefined : authorization.ticketAccess.filter((access) => access.canView).map((access) => access.categoryId);
      const staffTickets = await prisma.ticket.findMany({
        where: {
          ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
          AND: [
            { OR: [{ userId: null }, { userId: { not: userId } }] },
            { OR: [{ subject: textFilter }, { user: { is: { name: textFilter } } }, { guestAccess: { is: { displayName: textFilter } } }] },
          ],
        },
        select: { id: true, number: true, subject: true, status: true, category: { select: { label: true } } },
        take: 6,
        orderBy: { updatedAt: "desc" },
      });
      results.push(...staffTickets.map((item) => ({ id: item.id, kind: "Staff-Ticket", title: `#${item.number} · ${item.subject}`, subtitle: item.category.label, status: item.status, href: `/dashboard/tickets/${item.id}` })));
    }

    if (hasPermission(authorization, "users.view")) {
      const users = await prisma.user.findMany({
        where: { OR: [{ name: textFilter }, { discordDisplayName: textFilter }, { discordUsername: textFilter }, { robloxName: textFilter }, { robloxDisplayName: textFilter }] },
        select: { id: true, name: true, discordDisplayName: true, robloxDisplayName: true },
        take: 6,
        orderBy: { name: "asc" },
      });
      results.push(...users.map((item) => ({ id: item.id, kind: "Nutzer", title: item.robloxDisplayName || item.discordDisplayName || item.name, subtitle: item.name, href: `/staff/nutzer?q=${encodeURIComponent(item.name)}` })));
    }

    if (hasPermission(authorization, "documents.access")) {
      const categoryIds = authorization.isOwner ? undefined : authorization.documentAccess.filter((access) => access.canView).map((access) => access.categoryId);
      const documents = await prisma.internalDocument.findMany({
        where: {
          archivedAt: null,
          category: { visible: true },
          ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
          ...(authorization.isOwner ? {} : { OR: [{ accessMode: "CATEGORY" as const }, { accessMode: "RESTRICTED" as const, roleAccess: { some: { roleId: { in: authorization.roleIds }, canView: true } } }] }),
          AND: { OR: [{ title: textFilter }, { summary: textFilter }, { revisions: { some: { searchText: textFilter } } }] },
        },
        select: { id: true, title: true, summary: true, slug: true, category: { select: { title: true } } },
        take: 6,
        orderBy: { updatedAt: "desc" },
      });
      results.push(...documents.map((item) => ({ id: item.id, kind: "Dokument", title: item.title, subtitle: item.category.title, href: `/staff/dokumente/${item.slug}` })));
    }
  }

  return NextResponse.json({ results: results.slice(0, MAX_RESULTS) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    return await search(request);
  } catch {
    return NextResponse.json({ results: [], unavailable: true }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
