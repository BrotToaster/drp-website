import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getLegalSettings, legalPublicationReady } from "@/lib/legal-settings";
import { indexingRequested, siteOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingRequested() || !legalPublicationReady(await getLegalSettings())) return [];
  const origin = siteOrigin();
  const pages = ["/", "/server", "/status", "/kalender", "/regelwerk", "/news", "/team", "/faq", "/kontakt", "/datenschutz", "/nutzungsbedingungen"].map(path => ({ url: new URL(path, origin).href }));
  const [news, events] = await Promise.all([
    prisma.newsPost.findMany({ where: { published: true, revisions: { some: { status: "PUBLISHED" } } }, select: { slug: true, updatedAt: true } }),
    prisma.calendarEvent.findMany({ where: { archivedAt: null, category: { visible: true }, revisions: { some: { status: "PUBLISHED" } } }, select: { slug: true, updatedAt: true } }),
  ]);
  return [...pages, ...news.map(item => ({ url: new URL(`/news/${encodeURIComponent(item.slug)}`, origin).href, lastModified: item.updatedAt })), ...events.map(item => ({ url: new URL(`/kalender/${encodeURIComponent(item.slug)}`, origin).href, lastModified: item.updatedAt }))];
}
