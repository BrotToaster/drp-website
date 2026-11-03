import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const unavailable = () => Promise.reject(new Error("database credentials must stay private"));
  return { prisma: { rule: { findMany: unavailable }, newsPost: { findMany: unavailable }, staffProfile: { findMany: unavailable }, calendarEvent: { findMany: unavailable } } };
});
vi.mock("@/lib/local-mode", () => ({ demoAccessEnabled: () => false }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authz", () => ({ getAuthorizationContext: vi.fn() }));
import { getPublishedNews, getPublishedRules, getPublicTeam } from "@/lib/data";
import { GET } from "@/app/api/calendar/route";

describe("Datenbankausfälle sind keine leeren oder erfundenen Inhalte", () => {
  it("zeigt außerhalb der lokalen Demo keine Ersatzregeln, Ersatznews oder Teammitglieder", async () => {
    for (const load of [getPublishedRules, getPublishedNews, getPublicTeam]) {
      await expect(load()).rejects.toThrow("PUBLIC_CONTENT_UNAVAILABLE");
    }
  });
  it("liefert für den Kalender 503 ohne interne Fehlermeldungen", async () => {
    const response = await GET(new Request("https://drp.example/api/calendar"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.text()).not.toContain("credentials");
  });
});
