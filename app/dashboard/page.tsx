import Link from "next/link";
import { signOut } from "@/auth";
import { acceptRulesAction } from "@/app/actions/player";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { ensureDbUser, getAuthorizationContext } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getHomepageSettings } from "@/lib/site-settings";
import { formatDateTime } from "@/lib/site";
import { hostedPreviewEnabled } from "@/lib/preview-mode";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const preview = hostedPreviewEnabled();
  const user = await ensureDbUser();
  const authorization = await getAuthorizationContext(user.id);
  const isStaff = hasPermission(authorization, "staff.access");
  const isAdmin = hasPermission(authorization, "admin.access");
  const [profile, tickets, publishedRules, acceptances, staffTickets, lastMelonly, lastDiscordSync, homepage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: { accounts: { select: { provider: true } } },
    }),
    prisma.ticket.count({
      where: {
        userId: user.id,
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_USER"] },
      },
    }),
    prisma.rule.findMany({
      where: { published: true },
      select: { id: true, version: true },
    }),
    prisma.ruleAcceptance.findMany({
      where: { userId: user.id },
      select: { ruleId: true, version: true },
    }),
    isStaff ? prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_USER"] }, ...(authorization.isOwner ? {} : { categoryId: { in: authorization.ticketAccess.filter((item) => item.canView).map((item) => item.categoryId) } }) } }) : Promise.resolve(0),
    isStaff ? prisma.melonlyMember.findFirst({ orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }) : Promise.resolve(null),
    isAdmin ? prisma.botSyncReceipt.findFirst({ where: { kind: "DISCORD_MEMBERS" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }) : Promise.resolve(null),
    getHomepageSettings(),
  ]);

  const demo = user.id === "demo-owner";
  const discordLinked =
    demo || Boolean(profile?.accounts.some((account) => account.provider === "discord"));
  const robloxLinked =
    demo || Boolean(profile?.accounts.some((account) => account.provider === "roblox"));
  const accepted = new Set(
    acceptances.map((acceptance) => `${acceptance.ruleId}:${acceptance.version}`),
  );
  const rulesComplete =
    publishedRules.length > 0 &&
    publishedRules.every((rule) => accepted.has(`${rule.id}:${rule.version}`));
  const setupComplete = discordLinked && robloxLinked && rulesComplete;

  const discordName = demo
    ? "DRP Demo-Owner"
    : profile?.discordDisplayName || profile?.discordUsername || "Nicht verbunden";
  const robloxName = demo
    ? "DRP_Demo"
    : profile?.robloxDisplayName || profile?.robloxName || "Nicht verbunden";

  return (
    <PortalShell
      authorization={authorization}
      title={"Hallo, " + (user.name?.split(" ")[0] || "Mitglied") + "."}
      description="Hier findest du deinen aktuellen Status und alle wichtigen Aktionen."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Discord-Name", discordName, "/dashboard/profil"],
          ["Roblox-Name", robloxName, "/dashboard/profil"],
          ["Offene Tickets", String(tickets), "/dashboard/tickets"],
          ["Regelstatus", rulesComplete ? "Bestätigt" : "Offen", "/regelwerk"],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="surface surface-interactive p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">{label}</p>
            <p className="mt-4 truncate text-lg font-semibold">{value}</p>
          </Link>
        ))}
      </div>

      {isStaff && <section className="surface mt-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] p-5"><div><h2 className="text-xl font-semibold">Was jetzt Aufmerksamkeit braucht</h2></div><Link className="button button-secondary" href="/staff">Live Operations öffnen</Link></div><div className="grid gap-px bg-[var(--surface-soft)] sm:grid-cols-3"><Link href="/staff/tickets" className="bg-[var(--surface-soft)] p-5 hover:bg-[var(--surface-soft)]"><p className="text-xs text-[var(--muted)]">Offene Website-Tickets</p><p className="mt-3 text-3xl font-semibold">{staffTickets}</p></Link><a href={homepage.melonlyUrl} target="_blank" rel="noreferrer" className="bg-[var(--surface-soft)] p-5 hover:bg-[var(--surface-soft)]"><p className="text-xs text-[var(--muted)]">Melonly-Abgleich</p><p className="mt-3 text-sm font-semibold">{lastMelonly ? formatDateTime(lastMelonly.lastSyncedAt) : "Noch nie"}</p></a><Link href="/staff/aktivitaet" className="bg-[var(--surface-soft)] p-5 hover:bg-[var(--surface-soft)]"><p className="text-xs text-[var(--muted)]">Wochenprüfung</p><p className="mt-3 text-sm font-semibold">Teamaktivität prüfen →</p></Link></div></section>}

      {isAdmin && <section className="surface mt-6 flex flex-wrap items-center justify-between gap-5 p-5"><div><h2 className="font-semibold">Integrations- und Synchronisationszustand</h2><p className="mt-2 text-xs text-[var(--muted)]">Letzter Discord-Mitgliederabgleich: {lastDiscordSync ? formatDateTime(lastDiscordSync.createdAt) : "noch nie"}</p></div><Link className="button button-secondary" href="/admin/integrationen">Integrationen prüfen</Link></section>}

      <div className={"mt-6 grid gap-5 " + (setupComplete ? "" : "xl:grid-cols-[1.15fr_.85fr]")}>
        {!setupComplete && (
          <section className="surface p-6 md:p-7">
            
            <h2 className="text-xl font-semibold">{preview ? "Dein Testkonto" : "Dein DRP-Profil vervollständigen"}</h2>
            {preview && <p className="mt-3 text-sm text-[var(--muted)]">Discord und Roblox bleiben in der Entscheidungsvorschau unverbunden. Du kannst dein Profil, Tickets und die Regelbestätigung mit diesem Testkonto ausprobieren.</p>}
            <div className="portal-task-list mt-4">
              {!preview && [
                ["Discord-Konto", discordLinked, "/dashboard/profil"],
                ["Roblox-Konto", robloxLinked, "/dashboard/profil"],
              ].map(([label, complete, href]) => (
                <div key={String(label)} className="portal-task-row">
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{complete ? "Verbunden" : "Noch nicht verbunden"}</p>
                  </div>
                  {complete ? (
                    <span className="text-xs font-bold text-[var(--success-ink)]">Erledigt</span>
                  ) : (
                    <Link href={String(href)} className="text-xs font-bold text-[var(--accent-ink)]">Verbinden</Link>
                  )}
                </div>
              ))}
              <div className="portal-task-row">
                <div>
                  <p className="text-sm font-semibold">Regelwerk</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {rulesComplete ? "Alle aktuellen Regeln bestätigt" : "Bestätigung erforderlich"}
                  </p>
                </div>
                {rulesComplete ? (
                  <span className="text-xs font-bold text-[var(--success-ink)]">Erledigt</span>
                ) : (
                  <form action={acceptRulesAction}>
                    <SubmitButton variant="secondary" pendingText="Wird bestätigt …">Bestätigen</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="surface p-6 md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">Schnellzugriff</p>
          <div className="mt-5 grid gap-2">
            <Link href="/dashboard/tickets" className="rounded-xl bg-[var(--surface-soft)] p-4 text-sm font-semibold transition hover:bg-[var(--surface-soft)]">Support-Ticket erstellen <span className="float-right text-[var(--accent-ink)]">→</span></Link>
            <Link href="/regelwerk" className="rounded-xl bg-[var(--surface-soft)] p-4 text-sm font-semibold transition hover:bg-[var(--surface-soft)]">Regelwerk öffnen <span className="float-right text-[var(--accent-ink)]">→</span></Link>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }} className="mt-6">
            <button className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]" type="submit">Abmelden</button>
          </form>
        </section>
      </div>
    </PortalShell>
  );
}
