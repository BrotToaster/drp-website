import Link from "next/link";
import Image from "next/image";
import { EmptyState, PageIntro } from "@/components/ui";
import { expandCalendarRevision } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const timeFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export default async function CalendarPage() {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 6);
  const events = await prisma.calendarEvent.findMany({
    where: { archivedAt: null, category: { visible: true }, revisions: { some: { status: "PUBLISHED", OR: [{ recurrenceUntil: { gte: now } }, { recurrenceUntil: null, endsAt: { gte: now } }] } } },
    include: { category: { include: { image: true } }, revisions: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 1, include: { coverImage: true } } },
  });
  const occurrences = events.flatMap((event) => event.revisions[0] ? expandCalendarRevision({ ...event.revisions[0], event }, now, end) : []).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return <>
    <PageIntro eyebrow="DRP Kalender" title="Was als Nächstes ansteht." copy="Community-Events, Ausbildungen und besondere Einsätze – zentral, aktuell und nach Kategorien geordnet." />
    <section className="container-shell py-14 md:py-20">
      {!occurrences.length ? <EmptyState title="Noch keine Termine" copy="Sobald ein Termin veröffentlicht wird, erscheint er hier." /> : <div className="grid gap-5 lg:grid-cols-2">
        {occurrences.map(({ id, revision, startsAt, endsAt }) => {
          const event = revision.event;
          const image = revision.coverImage?.secureUrl || event.category.image?.secureUrl;
          return <Link key={id} href={`/kalender/${event.slug}`} className="group surface overflow-hidden transition hover:-translate-y-0.5 hover:border-[#d6aa4c]/30">
            {image && <div className="relative h-44 overflow-hidden"><Image src={image} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" /></div>}
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><span className="badge" style={{ borderColor: `${event.category.color}66`, color: event.category.color }}>{event.category.title}</span><span className="text-xs text-[#777d81]">{revision.recurrenceFrequency !== "NONE" ? "Wiederkehrend" : "Einmalig"}</span></div>
              <h2 className="mt-4 text-xl font-semibold group-hover:text-[#efc76e]">{revision.title}</h2>
              {revision.summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#92989c]">{revision.summary}</p>}
              <div className="mt-5 border-t border-white/[0.07] pt-4 text-sm"><p className="font-semibold">{dateFormat.format(startsAt)}</p><p className="mt-1 text-[#8d9397]">{revision.allDay ? "Ganztägig" : `${timeFormat.format(startsAt)}–${timeFormat.format(endsAt)} Uhr`}{revision.location ? ` · ${revision.location}` : ""}</p></div>
            </div>
          </Link>;
        })}
      </div>}
    </section>
  </>;
}
