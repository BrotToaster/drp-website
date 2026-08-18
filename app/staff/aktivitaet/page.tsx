import { decideWeeklyResultAction, generateWeeklyReviewAction } from "@/app/actions/melonly";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/site";
import { recommendationLabel } from "@/lib/team-workflow";

export const dynamic = "force-dynamic";

export default async function TeamActivityPage() {
  const { user, authorization } = await requirePermission("team_activity.view_self");
  const canViewAll = hasPermission(authorization, "team_activity.view_all");
  const canReview = hasPermission(authorization, "team_activity.review");
  const reviews = await prisma.teamWeeklyReview.findMany({
    include: { results: { where: canViewAll ? undefined : { member: { userId: user.id } }, include: { member: { include: { role: true } }, reviewer: { select: { name: true } } }, orderBy: [{ decision: "asc" }, { member: { displayName: "asc" } }] } },
    orderBy: { weekStart: "desc" },
    take: 12,
  });
  const selfMember = await prisma.melonlyMember.findUnique({ where: { userId: user.id }, include: { role: true, strikes: { where: { status: "ACTIVE" } }, rankBlocks: { where: { liftedAt: null, endsAt: { gt: new Date() } } } } });
  return <PortalShell authorization={authorization} title="Teamaktivität" description={canViewAll ? "Wochenzeiten prüfen, Empfehlungen bestätigen und fertigen Berichtstext kopieren." : "Deine Wochenzeiten, LoAs und Teamstatus im Überblick."} section="staff">
    {selfMember && <section className="mb-6 grid gap-4 sm:grid-cols-3"><div className="surface p-5"><p className="text-xs text-[#777d81]">Rolle</p><p className="mt-2 font-semibold">{selfMember.role?.name || "Nicht zugeordnet"}</p></div><div className="surface p-5"><p className="text-xs text-[#777d81]">Wochenziel</p><p className="mt-2 font-semibold">{selfMember.role ? `${Math.floor(selfMember.role.weeklyTargetMinutes / 60)} Std. ${selfMember.role.weeklyTargetMinutes % 60} Min.` : "–"}</p></div><div className="surface p-5"><p className="text-xs text-[#777d81]">Aktiver Status</p><p className="mt-2 font-semibold">{selfMember.rankBlocks.length ? "Up-Rank-Sperre" : `${selfMember.strikes.length} Strike(s)`}</p></div></section>}
    {canReview && <ReliableActionForm action={generateWeeklyReviewAction} className="surface mb-6 flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold">Letzte abgeschlossene Woche auswerten</h2><p className="mt-1 text-xs text-[#858b90]">Die Berechnung ist idempotent; bestätigte Entscheidungen werden nicht überschrieben.</p></div><SubmitButton>Auswertung erstellen</SubmitButton></ReliableActionForm>}
    <div className="grid gap-5">{reviews.filter((review) => review.results.length || canViewAll).map((review) => <section key={review.id} className="surface p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Woche</p><h2 className="mt-2 text-xl font-semibold">{formatDate(review.weekStart)}–{formatDate(review.weekEnd)}</h2></div><span className="badge">{review.results.length} Einträge</span></div>{canViewAll && review.reportText && <details className="mt-5 rounded-xl border border-white/[0.07] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#efc76e]">Fertigen Berichtstext anzeigen</summary><pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-[#aeb3b6]">{review.reportText}</pre></details>}<div className="mt-5 grid gap-3">{review.results.map((result) => <article key={result.id} className="rounded-xl border border-white/[0.07] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{result.member.displayName}</h3><p className="mt-1 text-xs text-[#777d81]">{result.member.role?.name || "Keine Rolle"} · {Math.floor(result.actualMinutes / 60)} Std. {result.actualMinutes % 60} Min. / {Math.floor(result.requiredMinutes / 60)} Std. {result.requiredMinutes % 60} Min. · {result.loaDays} LoA-Tage</p></div><span className="badge badge-gold">{recommendationLabel(result.recommendation)}</span></div><p className="mt-3 text-sm leading-6 text-[#9aa0a4]">{result.reason}</p>{canReview && result.decision === "PENDING" && <ReliableActionForm action={decideWeeklyResultAction} className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 md:grid-cols-[1fr_auto_auto]"><input type="hidden" name="resultId" value={result.id} /><input className="field" name="notes" placeholder="Optionale interne Notiz" /><SubmitButton name="decision" value="apply">Bestätigen</SubmitButton><SubmitButton name="decision" value="reject" variant="danger">Verwerfen</SubmitButton></ReliableActionForm>}{result.decision !== "PENDING" && <p className="mt-3 text-xs text-[#777d81]">{result.decision === "APPLIED" ? "Bestätigt" : "Verworfen"}{result.reviewer ? ` von ${result.reviewer.name}` : ""}</p>}</article>)}</div></section>)}</div>
  </PortalShell>;
}
