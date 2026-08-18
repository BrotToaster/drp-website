import { describe, expect, it } from "vitest";
import { evaluateTeamWeek, formatWeeklyReport } from "@/lib/team-evaluation";

describe("DRP-Wochenauswertung", () => {
  it("behandelt mindestens drei LoA-Tage neutral", () => {
    expect(evaluateTeamWeek({ requiredMinutes: 180, actualMinutes: 0, loaDays: 3, activeStrikes: 2, rankBlocked: false, nextRoleName: "Moderator" }).recommendation).toBe("LOA");
  });

  it("schlägt bei erfüllter Zeit einen Up-Rank vor", () => {
    expect(evaluateTeamWeek({ requiredMinutes: 180, actualMinutes: 210, loaDays: 0, activeStrikes: 0, rankBlocked: false, nextRoleName: "Moderator" }).recommendation).toBe("UPRANK");
  });

  it("setzt beim zweiten Zeitverstoß Strike und Sperre an", () => {
    const result = evaluateTeamWeek({ requiredMinutes: 180, actualMinutes: 60, loaDays: 0, activeStrikes: 1, rankBlocked: false });
    expect(result.recommendation).toBe("STRIKE");
    expect(result.reason).toContain("zweiwöchige Up-Rank-Sperre");
  });

  it("empfiehlt nach zwei bestehenden Strikes die Teamentfernung", () => {
    expect(evaluateTeamWeek({ requiredMinutes: 180, actualMinutes: 0, loaDays: 0, activeStrikes: 2, rankBlocked: false }).recommendation).toBe("REMOVAL");
  });

  it("erzeugt einen direkt kopierbaren Berichtstext", () => {
    const report = formatWeeklyReport({ weekStart: new Date("2026-08-03"), weekEnd: new Date("2026-08-09"), results: [{ displayName: "Beispiel", roleName: "Supporter", actualMinutes: 200, requiredMinutes: 180, recommendation: "UPRANK", reason: "Zeit erfüllt." }] });
    expect(report).toContain("DRP Team-Wochenauswertung");
    expect(report).toContain("Up-Rank empfohlen");
    expect(report).toContain("Beispiel (Supporter)");
  });
});
