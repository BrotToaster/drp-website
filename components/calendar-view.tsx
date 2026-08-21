"use client";

import FullCalendar, { type CalendarRef, type DateClickInfo, type DatesSetInfo, type EventClickInfo, type EventSourceFuncInfo } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import multiMonthPlugin from "@fullcalendar/react/multimonth";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import deLocale from "@fullcalendar/react/locales/de";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Category = { id: string; title: string; color: string };
type ApiOccurrence = { id: string; eventId: string; slug: string; title: string; summary?: string | null; startsAt: string; endsAt: string; allDay: boolean; location?: string | null; status?: string; category: Category };
const drpLocale = { ...deLocale, listText: "Agenda", noEventsText: "Keine Termine in diesem Zeitraum" };

export default function CalendarView({ categories, staff = false }: { categories: Category[]; staff?: boolean }) {
  const router = useRouter();
  const calendarRef = useRef<CalendarRef>(null);
  const [enabled, setEnabled] = useState<string[]>(categories.map((category) => category.id));
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [initialView] = useState(() => window.matchMedia("(max-width: 720px)").matches ? "listMonth" : localStorage.getItem("drp-calendar-view") || "dayGridMonth");

  useEffect(() => {
    const stored = localStorage.getItem("drp-calendar-categories");
    if (stored) {
      try { setEnabled(JSON.parse(stored)); } catch { /* Ungültige alte Browserdaten ignorieren. */ }
    }
  }, []);
  useEffect(() => { localStorage.setItem("drp-calendar-categories", JSON.stringify(enabled)); calendarRef.current?.getApi().refetchEvents(); }, [enabled, staffFilter]);

  const loadEvents = async (info: EventSourceFuncInfo, success: (events: object[]) => void, failure: (error: Error) => void) => {
    try {
      if (!enabled.length) return success([]);
      const params = new URLSearchParams({ from: info.start.toISOString(), until: info.end.toISOString() });
      enabled.forEach((category) => params.append("category", category));
      if (staff) { params.set("staff", "1"); params.set("status", staffFilter); }
      const response = await fetch(`/api/calendar?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Kalender konnte nicht geladen werden.");
      success(payload.occurrences.map((occurrence: ApiOccurrence) => ({
        id: occurrence.id,
        title: occurrence.status && occurrence.status !== "PUBLISHED" ? `[${occurrence.status === "DRAFT" ? "Entwurf" : "Prüfung"}] ${occurrence.title}` : occurrence.title,
        start: occurrence.startsAt,
        end: occurrence.endsAt,
        allDay: occurrence.allDay,
        backgroundColor: occurrence.category.color,
        borderColor: occurrence.category.color,
        classNames: occurrence.status && occurrence.status !== "PUBLISHED" ? ["calendar-event-internal", `calendar-event-${occurrence.status.toLocaleLowerCase("en")}`] : ["calendar-event-published"],
        extendedProps: occurrence,
      })));
    } catch (error) { failure(error instanceof Error ? error : new Error("Kalender konnte nicht geladen werden.")); }
  };
  const onDates = (info: DatesSetInfo) => { localStorage.setItem("drp-calendar-view", info.view.type); };
  const onEvent = (info: EventClickInfo) => {
    info.jsEvent.preventDefault();
    const occurrence = info.event.extendedProps as ApiOccurrence;
    router.push(staff ? `/staff/kalender?event=${encodeURIComponent(occurrence.eventId)}#event-${occurrence.eventId}` : `/kalender/${occurrence.slug}`);
  };
  const onDate = (info: DateClickInfo) => { if (staff) router.push(`/staff/kalender?newStart=${encodeURIComponent(info.dateStr)}#new-event`); };

  return <div className="calendar-shell">
    <div className="calendar-filters" aria-label="Kalenderkategorien">{categories.map((category) => { const active = enabled.includes(category.id); return <button key={category.id} type="button" aria-pressed={active} className={active ? "active" : ""} style={{ "--category-color": category.color } as React.CSSProperties} onClick={() => setEnabled((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])}><span />{category.title}</button>; })}{staff && <label className="ml-auto flex items-center gap-2 text-xs text-[#858b90]">Freigabe<select className="field !min-h-9 !w-auto !py-1" value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}><option value="ALL">Alle</option><option value="DRAFT">Entwürfe</option><option value="PENDING_REVIEW">In Prüfung</option><option value="PUBLISHED">Veröffentlicht</option></select></label>}</div>
    <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin, interactionPlugin, classicThemePlugin]} locale={drpLocale} initialView={initialView} firstDay={1} nowIndicator height="auto" dayMaxEvents events={loadEvents} datesSet={onDates} eventClick={onEvent} dateClick={onDate} headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth,multiMonthYear,listMonth" }} noEventsContent="Keine Termine in diesem Zeitraum" />
  </div>;
}
