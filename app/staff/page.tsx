import Link from "next/link";
import { checkErlcAction } from "@/app/actions/portal-v4";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { getStoredErlcTelemetry } from "@/lib/erlc-telemetry";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

type DetailRecord = {
  Players?: Array<{ Player?: string; Team?: string; Callsign?: string; Permission?: string; WantedStars?: number; Location?: { PostalCode?: string; StreetName?: string } }>;
  JoinLogs?: Array<{ Player?: string; Join?: boolean; Timestamp?: number }>;
  CommandLogs?: Array<{ Player?: string; Command?: string; Timestamp?: number }>;
  KillLogs?: Array<Record<string, unknown>>;
  EmergencyCalls?: Array<Record<string, unknown>>;
  ModCalls?: Array<Record<string, unknown>>;
};

export default async function StaffDashboardPage() {
  const { authorization } = await requirePermission("staff.access");
  const visibleCategoryIds = authorization.isOwner ? undefined : authorization.ticketAccess.filter((item) => item.canView).map((item) => item.categoryId);
  const [{ state, snapshots }, ticketCount, userCount] = await Promise.all([
    getStoredErlcTelemetry(),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_USER"] }, ...(visibleCategoryIds ? { categoryId: { in: visibleCategoryIds } } : {}) } }),
    prisma.user.count(),
  ]);
  const details = (state?.currentDetails && typeof state.currentDetails === "object" ? state.currentDetails : {}) as DetailRecord;
  const canSeeDetails = hasPermission(authorization, "erlc.details.view");
  const peak = snapshots.reduce((value, item) => Math.max(value, item.players), 0);
  const average = snapshots.length ? Math.round(snapshots.reduce((value, item) => value + item.players, 0) / snapshots.length) : 0;
  const chart = snapshots.filter((_, index) => index % Math.max(1, Math.floor(snapshots.length / 24)) === 0).slice(-24);
  const stale = !state?.lastSuccessfulAt || Date.now() - state.lastSuccessfulAt.getTime() > 10 * 60 * 1000;

  return (
    <PortalShell authorization={authorization} title="Einsatzübersicht" description="Tickets, Serverauslastung und aktuelle ER:LC-Lage in einem Arbeitsbereich." section="staff">
      <section className="surface mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-5 md:p-6">
          <div><div className="flex items-center gap-3"><span className={"status-dot " + (!state?.online ? "offline" : "")} /><h2 className="text-xl font-semibold">{state?.name || "DRP Private Server"}</h2><span className={"badge " + (!stale && state?.online ? "badge-gold" : "")}>{stale ? "Veraltet" : state?.online ? "Online" : "Nicht verfügbar"}</span></div><p className="mt-2 text-xs text-[#777d81]">Letzte Prüfung: {state?.checkedAt ? formatDateTime(state.checkedAt) : "noch nicht geprüft"}{state?.errorMessage ? " · " + state.errorMessage : ""}</p></div>
          {hasPermission(authorization, "erlc.check") && <ReliableActionForm action={checkErlcAction}><SubmitButton variant="secondary" pendingText="ER:LC wird geprüft …">ER:LC jetzt prüfen</SubmitButton></ReliableActionForm>}
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/[0.07] sm:grid-cols-4 lg:grid-cols-7">
          {[
            ["Spieler", `${state?.currentPlayers ?? "–"} / ${state?.maxPlayers ?? "–"}`],
            ["Queue", state?.queueCount ?? "–"],
            ["Ingame-Staff", state?.staffCount ?? "–"],
            ["Fahrzeuge", state?.vehicleCount ?? "–"],
            ["Notrufe", state?.emergencyCount ?? "–"],
            ["Mod-Calls", state?.modCallCount ?? "–"],
            ["24h Peak", peak || "–"],
          ].map(([label, result]) => <div key={label} className="bg-[#111519] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#6f7579]">{label}</p><p className="mt-2 text-2xl font-semibold">{result}</p></div>)}
        </div>
      </section>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="surface p-5 md:p-6"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#efc76e]">Aktivität · 24 Stunden</p><p className="mt-1 text-sm text-[#777d81]">Durchschnitt {average} Spieler</p></div></div><div className="mt-6 flex h-28 items-end gap-1" aria-label="Spieleraktivität">{chart.length ? chart.map((item) => <div key={item.id} className="min-w-1 flex-1 rounded-t bg-[#d6aa4c]/70" style={{ height: `${Math.max(5, (item.players / Math.max(1, peak)) * 100)}%` }} title={`${item.players} Spieler · ${formatDateTime(item.capturedAt)}`} />) : <p className="self-center text-sm text-[#777d81]">Nach dem ersten automatischen Abruf erscheint hier der Verlauf.</p>}</div></section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{[
          ["Für dich sichtbare offene Tickets", ticketCount, "/staff/tickets"],
          ["Registrierte Nutzer", userCount, "/staff/nutzer"],
        ].map(([label, result, href]) => <Link key={href} href={String(href)} className="surface surface-interactive p-5"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">{label}</p><p className="mt-3 text-3xl font-semibold">{result}</p><span className="mt-3 inline-block text-xs font-bold text-[#efc76e]">Öffnen →</span></Link>)}</section>
      </div>

      {canSeeDetails && <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="surface overflow-hidden"><div className="border-b border-white/[0.07] p-5"><h2 className="font-semibold">Spieler im Einsatz</h2><p className="mt-1 text-xs text-[#777d81]">Live-Daten werden nicht historisch gespeichert.</p></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Spieler</th><th>Team</th><th>Callsign</th><th>Wanted</th><th>Position</th></tr></thead><tbody>{(details.Players || []).map((player, index) => <tr key={(player.Player || "player") + index}><td>{player.Player || "Unbekannt"}</td><td>{player.Team || "–"}</td><td>{player.Callsign || "–"}</td><td>{player.WantedStars ?? 0}</td><td>{[player.Location?.StreetName, player.Location?.PostalCode].filter(Boolean).join(" · ") || "–"}</td></tr>)}</tbody></table>{!details.Players?.length && <p className="p-5 text-sm text-[#777d81]">Keine Spieler-Details verfügbar.</p>}</div></section>
        <section className="surface p-5"><h2 className="font-semibold">Letzte Serverereignisse</h2><div className="mt-4 grid gap-3">{(details.JoinLogs || []).slice(0, 6).map((log, index) => <div key={index} className="rounded-xl border border-white/[0.07] p-3"><p className="text-sm">{log.Player || "Spieler"} {log.Join ? "ist beigetreten" : "hat den Server verlassen"}</p><p className="mt-1 text-[10px] text-[#777d81]">{log.Timestamp ? formatDateTime(new Date(log.Timestamp * 1000)) : "Zeit unbekannt"}</p></div>)}{!details.JoinLogs?.length && <p className="text-sm text-[#777d81]">Keine aktuellen Ereignisse vorhanden.</p>}</div></section>
      </div>}
    </PortalShell>
  );
}
