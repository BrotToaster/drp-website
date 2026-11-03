import { publicMetadata } from "@/lib/metadata";
import { CalendarLazy } from "@/components/calendar-lazy";
import { PageIntro } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const metadata = publicMetadata("Kalender", "Öffentliche Events und Termine der Deutschland-Roleplay-Community.", "/kalender");
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const categories = await prisma.calendarCategory.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { id: true, title: true, color: true } });
  return <>
    <PageIntro eyebrow="DRP Kalender" title="Was als Nächstes ansteht." copy="Wechsle zwischen Tag, Woche, Monat, Jahr und Agenda. Kategorien lassen sich direkt ein- und ausblenden." />
    <section className="container-shell py-10 md:py-16" data-intro="calendar"><CalendarLazy categories={categories} /></section>
  </>;
}
