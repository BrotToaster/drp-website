import Link from "next/link";
import { signOut } from "@/auth";
import { acceptRulesAction } from "@/app/actions/player";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/authz";
import { getPublishedRules } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const rules = await getPublishedRules();
  let profile: { robloxName: string | null } | null = null;
  let tickets = 0;
  let application: { status: string } | null = null;
  let sanctions = 0;
  let acceptedRules = 0;
  try {
    [profile, tickets, application, sanctions, acceptedRules] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { robloxName: true } }),
      prisma.ticket.count({ where: { userId: user.id, status: { not: "CLOSED" } } }),
      prisma.application.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      }),
      prisma.sanction.count({ where: { subjectId: user.id, status: "ACTIVE" } }),
      prisma.ruleAcceptance.count({ where: { userId: user.id } }),
    ]);
  } catch {
    // The public demo remains viewable before PostgreSQL is started.
  }
  const rulesComplete = rules.length > 0 && acceptedRules >= rules.length;

  return (
    <PortalShell
      role={user.role}
      title={"Hallo, " + (user.name?.split(" ")[0] || "Mitglied") + "."}
      description="Hier findest du deinen aktuellen Status und alle wichtigen Aktionen."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Roblox-Profil", profile?.robloxName || "Nicht verbunden", "/dashboard/profil"],
          ["Offene Tickets", String(tickets), "/dashboard/tickets"],
          ["Bewerbung", application?.status || "Keine", "/dashboard/bewerbung"],
          ["Aktive Sanktionen", String(sanctions), "/dashboard"],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="surface surface-interactive p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">{label}</p>
            <p className="mt-4 truncate text-lg font-semibold">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="surface p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="badge badge-gold">Nächster Schritt</span>
              <h2 className="mt-4 text-xl font-semibold">Dein DRP-Profil vervollständigen</h2>
            </div>
            {profile?.robloxName && rulesComplete && <StatusBadge status="ACCEPTED" />}
          </div>
          <div className="mt-7 grid gap-3">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] p-4">
              <div>
                <p className="text-sm font-semibold">Roblox-Konto</p>
                <p className="mt-1 text-xs text-[#777d81]">{profile?.robloxName || "Noch nicht hinterlegt"}</p>
              </div>
              <Link href="/dashboard/profil" className="text-xs font-bold text-[#efc76e]">Bearbeiten</Link>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] p-4">
              <div>
                <p className="text-sm font-semibold">Regelwerk</p>
                <p className="mt-1 text-xs text-[#777d81]">{rulesComplete ? "Aktuelle Regeln bestätigt" : acceptedRules + " von " + rules.length + " bestätigt"}</p>
              </div>
              {rulesComplete ? (
                <span className="text-xs font-bold text-[#75d7a3]">Erledigt</span>
              ) : (
                <form action={acceptRulesAction}>
                  <SubmitButton variant="secondary">Bestätigen</SubmitButton>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="surface p-6 md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">Schnellzugriff</p>
          <div className="mt-5 grid gap-2">
            <Link href="/dashboard/tickets" className="rounded-xl bg-white/[0.035] p-4 text-sm font-semibold transition hover:bg-white/[0.06]">Support-Ticket erstellen <span className="float-right text-[#efc76e]">→</span></Link>
            <Link href="/dashboard/bewerbung" className="rounded-xl bg-white/[0.035] p-4 text-sm font-semibold transition hover:bg-white/[0.06]">Whitelist-Bewerbung <span className="float-right text-[#efc76e]">→</span></Link>
            <Link href="/regelwerk" className="rounded-xl bg-white/[0.035] p-4 text-sm font-semibold transition hover:bg-white/[0.06]">Regelwerk öffnen <span className="float-right text-[#efc76e]">→</span></Link>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }} className="mt-6">
            <button className="text-xs font-semibold text-[#777d81] hover:text-white" type="submit">Abmelden</button>
          </form>
        </section>
      </div>
    </PortalShell>
  );
}
