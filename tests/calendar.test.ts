import { describe, expect, it } from "vitest";
import { expandCalendarRevision, localDateTimeToUtc } from "@/lib/calendar";

describe("Kalender und Zeitzonen", () => {
  it("wandelt Berliner Sommerzeit korrekt in UTC um", () => {
    expect(localDateTimeToUtc("2026-07-15T20:00")?.toISOString()).toBe("2026-07-15T18:00:00.000Z");
  });

  it("erzeugt wöchentliche Termine im gewählten Zeitraum", () => {
    const startsAt = new Date("2026-08-03T18:00:00.000Z");
    const items = expandCalendarRevision({ id: "revision-1", startsAt, endsAt: new Date("2026-08-03T20:00:00.000Z"), timeZone: "Europe/Berlin", recurrenceFrequency: "WEEKLY", recurrenceInterval: 1, recurrenceUntil: new Date("2026-08-24T22:00:00.000Z") }, new Date("2026-08-01T00:00:00.000Z"), new Date("2026-08-31T23:59:59.000Z"));
    expect(items).toHaveLength(4);
    expect(items[1].startsAt.toISOString()).toBe("2026-08-10T18:00:00.000Z");
  });
});
