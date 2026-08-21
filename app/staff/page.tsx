import Link from "next/link";
import { checkErlcAction } from "@/app/actions/portal-v4";
import { PortalShell } from "@/components/portal-shell";
import { OperationsLivePanel, type OperationsEvent, type OperationsPlayer } from "@/components/operations-live-panel";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { RelativeTime } from "@/components/relative-time";
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
  const rawPlayers = details.Players || [];
  const linkedUsers = canSeeDetails && rawPlayers.length ? await prisma.user.findMany({
    where: { robloxName: { in: rawPlayers.map((player) => player.Player || "").filter(Boolean), mode: "insensitive" } },
    select: { robloxName: true, robloxDisplayName: true, discordDisplayName: true, discordUsername: true },
  }) : [];
  const identityByRoblox = new Map(linkedUsers.filter((item) => item.robloxName).map((item) => [item.robloxName!.toLocaleLowerCase("en"), [item.robloxDisplayName || item.robloxName, item.discordDisplayName || item.discordUsername].filter(Boolean).join(" · ")]));
  const players: OperationsPlayer[] = rawPlayers.map((player, index) => ({
    id: `${player.Player || "player"}-${index}`,
    name: player.Player || "Unbekannt",
    team: player.Team || "–",
    callsign: player.Callsign || "–",
    wanted: player.WantedStars ?? 0,
    location: [player.Location?.StreetName, player.Location?.PostalCode].filter(Boolean).join(" · ") || "–",
    identity: identityByRoblox.get((player.Player || "").toLocaleLowerCase("en")),
  }));
  const events: OperationsEvent[] = [
    ...(details.JoinLogs || []).map((log, index) => ({ id: `join-${index}`, kind: "Join" as const, title: `${log.Player || "Spieler"} ${log.Join ? "ist beigetreten" : "hat den Server verlassen"}`, time: log.Timestamp ? formatDateTime(new Date(log.Timestamp * 1000)) : "Zeit unbekannt" })),
    ...(details.CommandLogs || []).map((log, index) => ({ id: `command-${index}`, kind: "Command" as const, title: log.Player || "Spieler", detail: log.Command || "Befehl ohne Bezeichnung", time: log.Timestamp ? formatDateTime(new Date(log.Timestamp * 1000)) : "Zeit unbekannt" })),
    ...(details.ModCalls || []).map((log, index) => ({ id: `modcall-${index}`, kind: "Mod-Call" as const, title: typeof log.Caller === "string" ? log.Caller : "Moderationsanfrage", detail: Object.entries(log).filter(([key]) => key !== "Caller" && key !== "Timestamp").slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(" · "), time: typeof log.Timestamp === "number" ? formatDateTime(new Date(log.Timestamp * 1000)) : "Zeit unbekannt" })),
  ].slice(0, 150);

  return (
    <PortalShell authorization={authorization} title="Einsatzübersicht" description="Tickets, Serverauslastung und aktuelle ER:LC-Lage in einem Arbeitsbereich." section="staff">
      <section className="surface mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-5 md:p-6">
          <div><div className="flex items-center gap-3"><span className={"status-dot " + (!state?.online ? "offline" : "")} /><h2 className="text-xl font-semibold">{state?.name || "DRP Private Server"}</h2><span className={"badge " + (!stale && state?.online ? "badge-gold" : "")}>{stale ? "Veraltet" : state?.online ? "Online" : "Nicht verfügbar"}</span></div><p className="mt-2 text-xs text-[#777d81]"><RelativeTime value={state?.lastSuccessfulAt?.toISOString() || null} />{state?.errorMessage && <><span> · </span><RelativeTime value={state.checkedAt?.toISOString() || null} prefix="Letzter Versuch" /><span> · {state.errorMessage}</span></>}</p></div>
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

      {canSeeDetails && <OperationsLivePanel players={players} events={events} />}
    </PortalShell>
  );
}
