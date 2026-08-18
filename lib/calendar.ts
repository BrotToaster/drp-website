import type { RecurrenceFrequency } from "@prisma/client";

export type CalendarRevisionLike = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceUntil: Date | null;
};

export type CalendarOccurrence<T extends CalendarRevisionLike = CalendarRevisionLike> = {
  id: string;
  revision: T;
  startsAt: Date;
  endsAt: Date;
};

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

function zoneOffset(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime();
}

export function localDateTimeToUtc(value: string, timeZone = "Europe/Berlin") {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const naive = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let result = new Date(naive - zoneOffset(new Date(naive), timeZone));
  result = new Date(naive - zoneOffset(result, timeZone));
  return Number.isNaN(result.getTime()) ? null : result;
}

export function dateTimeLocalValue(date: Date, timeZone = "Europe/Berlin") {
  const p = zonedParts(date, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

function occurrenceStart(original: Date, frequency: RecurrenceFrequency, interval: number, index: number, timeZone: string) {
  if (index === 0 || frequency === "NONE") return original;
  const p = zonedParts(original, timeZone);
  const local = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
  if (frequency === "DAILY") local.setUTCDate(local.getUTCDate() + interval * index);
  if (frequency === "WEEKLY") local.setUTCDate(local.getUTCDate() + interval * index * 7);
  if (frequency === "MONTHLY") local.setUTCMonth(local.getUTCMonth() + interval * index);
  const value = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}T${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  return localDateTimeToUtc(value, timeZone) || original;
}

export function expandCalendarRevision<T extends CalendarRevisionLike>(revision: T, windowStart: Date, windowEnd: Date, limit = 400): CalendarOccurrence<T>[] {
  const duration = Math.max(0, revision.endsAt.getTime() - revision.startsAt.getTime());
  const occurrences: CalendarOccurrence<T>[] = [];
  const interval = Math.max(1, revision.recurrenceInterval || 1);
  const finalDate = revision.recurrenceUntil && revision.recurrenceUntil < windowEnd ? revision.recurrenceUntil : windowEnd;
  for (let index = 0; index < limit; index += 1) {
    const startsAt = occurrenceStart(revision.startsAt, revision.recurrenceFrequency, interval, index, revision.timeZone || "Europe/Berlin");
    if (startsAt > finalDate) break;
    const endsAt = new Date(startsAt.getTime() + duration);
    if (endsAt >= windowStart && startsAt <= windowEnd) occurrences.push({ id: `${revision.id}:${startsAt.toISOString()}`, revision, startsAt, endsAt });
    if (revision.recurrenceFrequency === "NONE") break;
  }
  return occurrences;
}
