import { decideWeeklyResultAction, deleteWeeklyEntryAction, deleteWeeklySignatureAction, generateWeeklyReviewAction, saveWeeklyEntryAction, saveWeeklySignatureAction, setWeeklyMentionModeAction } from "@/app/actions/melonly";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { WeeklyCopyPanel } from "@/components/weekly-copy-panel";
import { requirePermission } from "@/lib/authz";
import { jsonRoleIds, resolveDiscordRank } from "@/lib/discord-ranks";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/site";
import { recommendationLabel } from "@/lib/team-workflow";

export const dynamic = "force-dynamic";

const weeklyHelp = `(Es muss exakt diese Vorlage verwendet werden)

**(Wichtige Infos für das Verfassen eines Weekly-Insider)**

**Weekly-Insider müssen Spätestens 14:00 abgegeben werden**

Bitte pingt die Personen **immer** mit ihrer ID (<@id>). Diese ID findet ihr indem ihr in den Entwicklermodus von Discord geht diesen findet ihr in den Einstellungen.

Schreibt diese IDs ebenfalls bitte **Immer** mit Apostrophen (\`\.\`) am Anfang und am Ende. Dies tut ihr damit der Text Grau dargestellt wird. Diese Art vereinfacht dem Coordination+ die Arbeit sehr.

Wie dies ** Richtig ** anwendet erfahrt ihr in einer Einweisung von  <@1025059574111277089> . Sprecht ihn gerne auch bei Fragen bezüglich dieses Themas einfach an er hilft euch gerne weiter.
**Ein Beispiel findet ihr unten👇 **

Name des Posts:
Administrations-/Moderations-/Supervisionsbericht – Wave …

Vorkommnisse der Woche:
Liebes Management,
in dieser Woche gab es folgende Vorkommnisse: …

(Gleichbleibende):
\`<@1025059574111277089> APM\`
...

Upranks:
\`<@1025059574111277089> BoS -> APM\`
...

Strikes:
\`<@id> M (1/3)\`
...`;

export default async function TeamActivityPage() {
  const { user, authorization } = await requirePermission("team_activity.view_self");
  const canViewAll = hasPermission(authorization, "team_activity.view_all");
  const canReview = hasPermission(authorization, "team_activity.review");
  const [reviews, selfMember, ranks] = await Promise.all([
    prisma.teamWeeklyReview.findMany({ include: { entries: { orderBy: { sortOrder: "asc" } }, signatures: { orderBy: { sortOrder: "asc" } }, results: { where: canViewAll ? undefined : { member: { userId: user.id } }, include: { member: true, reviewer: { select: { name: true } } }, orderBy: [{ decision: "asc" }, { member: { displayName: "asc" } }] } }, orderBy: { weekStart: "desc" }, take: 12 }),
    prisma.melonlyMember.findUnique({ where: { userId: user.id }, include: { strikes: { where: { status: "ACTIVE" } }, rankBlocks: { where: { liftedAt: null, endsAt: { gt: new Date() } } } } }),
    prisma.discordTeamRank.findMany({ where: { active: true }, include: { discordRole: true, nextDiscordRole: true }, orderBy: { sortOrder: "desc" } }),
  ]);
  const discordIds = [...new Set([...reviews.flatMap((review) => review.results.map((result) => result.member.discordId).filter((id): id is string => Boolean(id))), ...(selfMember?.discordId ? [selfMember.discordId] : [])])];
  const snapshots = await prisma.discordMemberSnapshot.findMany({ where: canReview ? undefined : { discordId: { in: discordIds } }, orderBy: { lastSyncedAt: "desc" }, take: canReview ? 2500 : 500 });
  const uniqueSnapshots = [...new Map(snapshots.map((snapshot) => [snapshot.discordId, snapshot])).values()];
  const snapshotMap = new Map(uniqueSnapshots.map((snapshot) => [snapshot.discordId, snapshot]));
  const getRank = (discordId?: string | null) => resolveDiscordRank(jsonRoleIds(discordId ? snapshotMap.get(discordId)?.roleIds : []), ranks);
  const selfRank = getRank(selfMember?.discordId);

  return <PortalShell authorization={authorization} title="Teamaktivität" description={canViewAll ? "Discord-Ränge, Melonly-Zeiten und den Weekly Insider in einem verlässlichen Workflow prüfen." : "Deine Wochenzeiten, LoAs und Teamstatus im Überblick."} section="staff">
    {selfMember && <section className="mb-6 grid gap-4 sm:grid-cols-3"><div className="surface p-5"><p className="text-xs text-[#777d81]">Discord-Rang</p><p className="mt-2 font-semibold">{selfRank.rank?.shortName || "Nicht konfiguriert"}</p>{selfRank.conflicts.length > 0 && <p className="mt-2 text-xs text-[#f28d8a]">Mehrere Rangrollen erkannt</p>}</div><div className="surface p-5"><p className="text-xs text-[#777d81]">Wochenziel</p><p className="mt-2 font-semibold">{selfRank.rank ? `${Math.floor(selfRank.rank.weeklyTargetMinutes / 60)} Std. ${selfRank.rank.weeklyTargetMinutes % 60} Min.` : "–"}</p></div><div className="surface p-5"><p className="text-xs text-[#777d81]">Aktiver Status</p><p className="mt-2 font-semibold">{selfMember.rankBlocks.length ? "Up-Rank-Sperre" : `${selfMember.strikes.length} Strike(s)`}</p></div></section>}
    {canReview && <ReliableActionForm action={generateWeeklyReviewAction} className="surface mb-6 flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold">Letzte abgeschlossene Woche auswerten</h2><p className="mt-1 text-xs text-[#858b90]">Discord liefert den Rang; Melonly liefert ausschließlich Zeit, Schichten und LoA. Bereits entschiedene Einträge bleiben erhalten.</p></div><SubmitButton>Auswertung erstellen</SubmitButton></ReliableActionForm>}
    {canReview && <details className="surface mb-6 p-5"><summary className="cursor-pointer font-semibold text-[#efc76e]">Wichtige Infos für das Verfassen eines Weekly-Insider</summary><pre spellCheck={false} className="mt-4 whitespace-pre-wrap text-xs leading-6 text-[#aeb3b6]">{weeklyHelp}</pre></details>}
    <div className="grid gap-5">{reviews.filter((review) => review.results.length || canViewAll).map((review) => <section key={review.id} className="surface p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Weekly Insider</p><h2 className="mt-2 text-xl font-semibold">{formatDate(review.weekStart)}–{formatDate(review.weekEnd)}</h2><p className="mt-2 text-xs text-[#777d81]">Generiert: {review.generatedAt ? formatDateTime(review.generatedAt) : "Legacy-Bericht"}{review.mostActiveDisplayName ? ` · Aktivstes Mitglied: ${review.mostActiveDisplayName}` : ""}</p></div><span className="badge">{review.results.length} Mitglieder</span></div>
      {canViewAll && review.reportText && <div className="mt-5"><WeeklyCopyPanel text={review.reportText} /></div>}
      {canReview && <div className="mt-5 grid gap-4 lg:grid-cols-2"><ReliableActionForm action={setWeeklyMentionModeAction} className="rounded-xl border border-white/[0.07] p-4"><input type="hidden" name="reviewId" value={review.id} /><label className="field-label">Erwähnungen<select className="field" name="mentionMode" defaultValue={review.mentionMode}><option value="CODE">Grau · keine Benachrichtigung</option><option value="PING">Echter Discord-Ping</option></select></label><SubmitButton variant="secondary">Mention-Modus speichern</SubmitButton></ReliableActionForm><ReliableActionForm action={saveWeeklySignatureAction} className="rounded-xl border border-white/[0.07] p-4"><input type="hidden" name="reviewId" value={review.id} /><div className="grid gap-3 sm:grid-cols-2"><label className="field-label">Unterschrift<select className="field" name="discordId" required><option value="">Discord-Nutzer wählen</option>{uniqueSnapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.discordId}>{snapshot.displayName || snapshot.username} (@{snapshot.username})</option>)}</select></label><label className="field-label">Emoji / Label<input className="field" name="label" placeholder=":PL_neu:" required /></label><input type="hidden" name="sortOrder" value={review.signatures.length} /></div><SubmitButton variant="secondary">Unterschrift hinzufügen</SubmitButton></ReliableActionForm></div>}
      {canReview && review.signatures.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{review.signatures.map((signature) => <ReliableActionForm key={signature.id} action={deleteWeeklySignatureAction} className="badge"><input type="hidden" name="id" value={signature.id} /><span>{signature.label} · {signature.displayName}</span><SubmitButton variant="danger">×</SubmitButton></ReliableActionForm>)}</div>}
      {canReview && <details className="mt-5 rounded-xl border border-white/[0.07] p-4"><summary className="cursor-pointer font-semibold text-[#efc76e]">Strukturierte Weekly-Einträge bearbeiten ({review.entries.length})</summary><div className="mt-4 grid gap-3">{review.entries.map((entry) => <div key={entry.id} className="rounded-xl border border-white/[0.06] p-3"><ReliableActionForm action={saveWeeklyEntryAction} className="grid gap-3 md:grid-cols-3"><input type="hidden" name="id" value={entry.id} /><input type="hidden" name="reviewId" value={review.id} /><label className="field-label">Typ<select className="field" name="kind" defaultValue={entry.kind}><option value="UPRANK">Up-Rank</option><option value="LOA">LoA</option><option value="STRIKE">Strike</option><option value="BLOCKED">Sperre</option><option value="REMOVAL">Entfernung</option><option value="MANUAL">Manuell</option></select></label><label className="field-label">Sektion<select className="field" name="section" defaultValue={entry.section}><option value="ADMINISTRATION">Administration</option><option value="MODERATION">Moderation</option><option value="LOA">LoA</option><option value="STRIKES">Strikes</option><option value="CUSTOM">Weitere</option></select></label><label className="field-label">Discord-ID<input className="field" name="discordId" defaultValue={entry.discordId || ""} /></label><label className="field-label">Anzeigename<input className="field" name="displayName" defaultValue={entry.displayName} required /></label><label className="field-label">Alter Rang<input className="field" name="fromLabel" defaultValue={entry.fromLabel || ""} /></label><label className="field-label">Neuer Rang<input className="field" name="toLabel" defaultValue={entry.toLabel || ""} /></label><label className="field-label md:col-span-2">Freier Text<input className="field" name="text" defaultValue={entry.text || ""} /></label><label className="field-label">Sortierung<input className="field" type="number" name="sortOrder" defaultValue={entry.sortOrder} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="included" defaultChecked={entry.included} /> Im Bericht</label><SubmitButton variant="secondary">Speichern</SubmitButton></ReliableActionForm><ReliableActionForm action={deleteWeeklyEntryAction} className="mt-2"><input type="hidden" name="id" value={entry.id} /><SubmitButton variant="danger">Eintrag entfernen</SubmitButton></ReliableActionForm></div>)}</div><ReliableActionForm action={saveWeeklyEntryAction} resetOnSuccess className="mt-4 grid gap-3 border-t border-white/[0.07] pt-4 md:grid-cols-3"><input type="hidden" name="reviewId" value={review.id} /><label className="field-label">Typ<select className="field" name="kind"><option value="UPRANK">Up-Rank</option><option value="LOA">LoA</option><option value="STRIKE">Strike</option></select></label><label className="field-label">Sektion<select className="field" name="section"><option value="ADMINISTRATION">Administration</option><option value="MODERATION">Moderation</option><option value="LOA">LoA</option><option value="STRIKES">Strikes</option></select></label><label className="field-label">Discord-Nutzer<select className="field" name="discordId" required><option value="">Wählen</option>{uniqueSnapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.discordId}>{snapshot.displayName || snapshot.username}</option>)}</select></label><label className="field-label">Anzeigename<input className="field" name="displayName" required /></label><label className="field-label">Alter Rang<input className="field" name="fromLabel" /></label><label className="field-label">Neuer Rang<input className="field" name="toLabel" /></label><label className="field-label md:col-span-2">Freier Text<input className="field" name="text" /></label><input type="hidden" name="sortOrder" value={review.entries.length} /><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="included" defaultChecked /> Im Bericht</label><SubmitButton>Eintrag ergänzen</SubmitButton></ReliableActionForm></details>}
      <div className="mt-5 grid gap-3">{review.results.map((result) => { const snapshot = result.member.discordId ? snapshotMap.get(result.member.discordId) : null; const rank = getRank(result.member.discordId); return <article key={result.id} className="team-activity-card"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3">{snapshot?.avatarUrl ? <span className="team-avatar" style={{ backgroundImage: `url(${snapshot.avatarUrl})` }} /> : <span className="team-avatar team-avatar-fallback">{(snapshot?.displayName || result.member.displayName).slice(0, 1)}</span>}<div><h3 className="font-semibold">{snapshot?.displayName || result.member.displayName}</h3><p className="mt-1 text-xs text-[#777d81]">{snapshot ? `@${snapshot.username}` : "Discord nicht verknüpft"} · {rank.rank?.shortName || "Rang ungeklärt"}</p></div></div><span className="badge badge-gold">{recommendationLabel(result.recommendation)}</span></div><div className="mt-4 grid gap-2 text-xs text-[#8e9498] sm:grid-cols-3"><span>Zeit: {Math.floor(result.actualMinutes / 60)} Std. {result.actualMinutes % 60} Min.</span><span>Ziel: {Math.floor(result.requiredMinutes / 60)} Std. {result.requiredMinutes % 60} Min.</span><span>LoA: {result.loaDays} Tage</span></div><p className="mt-3 text-sm leading-6 text-[#9aa0a4]">{result.reason}</p><p className="mt-2 text-[11px] text-[#666d71]">Discord: {snapshot ? formatDateTime(snapshot.lastSyncedAt) : "nicht synchronisiert"} · Melonly: {formatDateTime(result.member.lastSyncedAt)}</p>{rank.conflicts.length > 0 && <p className="mt-2 text-xs text-[#f28d8a]">Rangkonflikt: {rank.conflicts.map((item) => item.shortName).join(", ")}</p>}{canReview && result.decision === "PENDING" && <ReliableActionForm action={decideWeeklyResultAction} className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 md:grid-cols-[1fr_auto_auto]"><input type="hidden" name="resultId" value={result.id} /><input className="field" name="notes" placeholder="Optionale interne Notiz" /><SubmitButton name="decision" value="apply">Bestätigen</SubmitButton><SubmitButton name="decision" value="reject" variant="danger">Verwerfen</SubmitButton></ReliableActionForm>}{result.decision !== "PENDING" && <p className="mt-3 text-xs text-[#777d81]">{result.decision === "APPLIED" ? "Bestätigt" : "Verworfen"}{result.reviewer ? ` von ${result.reviewer.name}` : ""}</p>}</article>; })}</div>
    </section>)}</div>
  </PortalShell>;
}
