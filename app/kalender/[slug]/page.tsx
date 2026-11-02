import { publicMetadata } from "@/lib/metadata";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MediaGallery } from "@/components/media-gallery";
import { RichContent } from "@/components/rich-content";
import { contentNodeSchema } from "@/lib/content";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.calendarEvent.findFirst({ where: { slug, archivedAt: null, category: { visible: true } }, include: { revisions: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 1, select: { title: true, summary: true } } } });
  const revision = event?.revisions[0];
  return revision ? publicMetadata(revision.title, revision.summary || "Öffentlicher Termin der DRP-Community mit Zeit, Ort und weiteren Informationen.", `/kalender/${encodeURIComponent(slug)}`) : { title: "Termin nicht gefunden", robots: { index: false } };
}

export default async function CalendarDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.calendarEvent.findFirst({
    where: { slug, archivedAt: null, category: { visible: true } },
    include: { category: true, revisions: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 1, include: { coverImage: true, media: { orderBy: { sortOrder: "asc" }, include: { media: true } } } } },
  });
  const revision = event?.revisions[0];
  const content = contentNodeSchema.safeParse(revision?.content);
  if (!event || !revision || !content.success) notFound();
  const media = revision.media.filter((item) => item.media.visibility === "PUBLIC" && item.media.kind !== "DOCUMENT").map((item) => ({ id: item.media.id, kind: item.media.kind as "IMAGE" | "AUDIO" | "VIDEO", url: item.media.secureUrl, name: item.media.originalName, caption: item.caption }));
  return <article className="pb-24">
    <header className="relative overflow-hidden border-b border-[var(--line)]">
      {revision.coverImage && <><Image src={revision.coverImage.secureUrl} alt="" fill sizes="100vw" className="object-cover opacity-25 blur-sm" /><div className="absolute inset-0 bg-gradient-to-b from-[#090b0d]/65 to-[#090b0d]" /></>}
      <div className="container-shell relative max-w-5xl py-14 md:py-24">
        <Link href="/kalender" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--accent-ink)]">← Zurück zum Kalender</Link>
        <span className="badge mt-10 block w-fit" style={{ borderColor: `${event.category.color}66`, color: event.category.color }}>{event.category.title}</span>
        <h1 className="page-title mt-5 max-w-4xl">{revision.title}</h1>
        {revision.summary && <p className="body-large mt-5 max-w-3xl">{revision.summary}</p>}
        <div className="mt-7 grid gap-2 text-sm text-[var(--muted)]"><p><strong className="text-[var(--text)]">Beginn:</strong> {dateTime.format(revision.startsAt)} Uhr</p><p><strong className="text-[var(--text)]">Ende:</strong> {dateTime.format(revision.endsAt)} Uhr</p>{revision.location && <p><strong className="text-[var(--text)]">Ort:</strong> {revision.location}</p>}</div>
      </div>
    </header>
    <div className="container-shell max-w-5xl py-14 md:py-20">
      {revision.coverImage && <Image src={revision.coverImage.secureUrl} alt={`Titelbild zu ${revision.title}`} width={1600} height={900} sizes="(max-width: 1024px) 100vw, 1024px" className="mb-12 max-h-[560px] w-full rounded-[22px] border border-[var(--line)] object-cover" />}
      <div className="content-surface mx-auto max-w-3xl"><RichContent content={content.data} />{revision.externalUrl && <a href={revision.externalUrl} target="_blank" rel="noreferrer" className="button button-primary mt-8">Weitere Informationen ↗</a>}<MediaGallery media={media} /></div>
    </div>
  </article>;
}
