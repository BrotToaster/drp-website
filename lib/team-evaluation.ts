import type { WeeklyRecommendation } from "@prisma/client";

export type WeeklyEvaluationInput = {
  requiredMinutes: number;
  actualMinutes: number;
  loaDays: number;
  activeStrikes: number;
  rankBlocked: boolean;
  nextRoleName?: string | null;
};

export type WeeklyEvaluation = { recommendation: WeeklyRecommendation; reason: string };

export function evaluateTeamWeek(input: WeeklyEvaluationInput): WeeklyEvaluation {
  if (input.loaDays >= 3) return { recommendation: "LOA", reason: `Mit ${input.loaDays} genehmigten LoA-Tagen wird diese Woche neutral vermerkt.` };
  if (input.actualMinutes >= input.requiredMinutes) {
    if (input.rankBlocked) return { recommendation: "BLOCKED", reason: "Die Wochenzeit wurde erfüllt, aber es besteht eine aktive Up-Rank-Sperre. In dieser Woche ist kein Up-Rank möglich." };
    if (!input.nextRoleName) return { recommendation: "NO_ACTION", reason: "Die Wochenzeit wurde erfüllt; für diese Rolle ist kein weiterer Up-Rank hinterlegt." };
    return { recommendation: "UPRANK", reason: `Die Wochenzeit wurde erfüllt. Empfohlenes nächstes Team-Ranking: ${input.nextRoleName}.` };
  }
  if (input.activeStrikes >= 2) return { recommendation: "REMOVAL", reason: "Die Wochenzeit wurde nicht erfüllt und es bestehen bereits zwei aktive Strikes. Entfernung aus dem Team empfohlen." };
  return { recommendation: "STRIKE", reason: input.activeStrikes === 1 ? "Die Wochenzeit wurde nicht erfüllt. Zweiter Strike und zweiwöchige Up-Rank-Sperre vorgesehen." : "Die Wochenzeit wurde nicht erfüllt. Erster Strike vorgesehen." };
}

export function formatWeeklyReport(input: { weekStart: Date; weekEnd: Date; results: Array<{ displayName: string; roleName?: string | null; actualMinutes: number; requiredMinutes: number; recommendation: WeeklyRecommendation; reason: string }> }) {
  const date = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
  const groups: Record<WeeklyRecommendation, string[]> = { UPRANK: [], LOA: [], STRIKE: [], BLOCKED: [], REMOVAL: [], NO_ACTION: [] };
  for (const item of input.results) {
    groups[item.recommendation].push(`• ${item.displayName}${item.roleName ? ` (${item.roleName})` : ""} — ${Math.floor(item.actualMinutes / 60)} Std. ${item.actualMinutes % 60} Min. / ${Math.floor(item.requiredMinutes / 60)} Std. ${item.requiredMinutes % 60} Min.\n  ${item.reason}`);
  }
  const labels: Array<[WeeklyRecommendation, string]> = [["UPRANK", "Up-Rank empfohlen"], ["LOA", "LoA (neutral)"], ["BLOCKED", "Up-Rank-Sperre aktiv"], ["STRIKE", "Strike vorgesehen"], ["REMOVAL", "Teamentfernung empfohlen"], ["NO_ACTION", "Keine Aktion"]];
  return [`DRP Team-Wochenauswertung · ${date.format(input.weekStart)}–${date.format(input.weekEnd)}`, "", ...labels.flatMap(([key, label]) => groups[key].length ? [`${label}:`, ...groups[key], ""] : [])].join("\n").trim();
}
