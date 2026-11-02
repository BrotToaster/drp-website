"use client";

import { useEffect, useState } from "react";

function relative(iso: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return "gerade eben";
  if (seconds < 60) return `vor ${seconds} Sek.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.floor(hours / 24)} Tag${hours >= 48 ? "en" : ""}`;
}

export function RelativeTime({ value, prefix = "Letzte Aktualisierung" }: { value: string | null; prefix?: string }) {
  const [now, tick] = useState<number | null>(null);
  useEffect(() => {
    tick(Date.now());
    const interval = window.setInterval(() => tick(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  if (!value) return <span>{prefix}: noch nie</span>;
  const absolute = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(value));
  return <time dateTime={value} title={absolute}>{prefix} {now === null ? absolute : relative(value, now)}</time>;
}
