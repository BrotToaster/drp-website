"use client";

import dynamic from "next/dynamic";

const CalendarView = dynamic(() => import("@/components/calendar-view"), { ssr: false, loading: () => <div className="surface grid min-h-[520px] place-items-center text-sm text-[#858b90]">Kalender wird geladen …</div> });

export function CalendarLazy(props: { categories: Array<{ id: string; title: string; color: string }>; staff?: boolean }) {
  return <CalendarView {...props} />;
}
