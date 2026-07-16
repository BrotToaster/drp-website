import { changeUserRoleAction } from "@/app/actions/staff";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/authz";
import { getServerDetails } from "@/lib/erlc";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const user = await requireRole("SUPPORTER");
  const server = await getServerDetails(true);
  let metrics = { tickets: 0, applications: 0, sanctions: 0, users: 0 };
  let users: Array<{ id: string; name: string; robloxName: string | null; role: string }> = [];
  try {
    const [tickets, applications, sanctions, userCount] = await Promise.all([
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_USER"] } } }),
      prisma.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.sanction.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
    ]);
    metrics = { tickets, applications, sanctions, users: userCount };
    if (user.role === "OWNER") {
      users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, robloxName: true, role: true },
      });
    }
  } catch {}

  return (
    <PortalShell role={user.role} title="Staff-Übersicht" description="Live-Lage, offene Aufgaben und zentrale Administration auf einen Blick." staff>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Offene Tickets", metrics.tickets],
          ["Bewerbungen", metrics.applications],
          ["Aktive Sanktionen", metrics.sanctions],
          ["Registrierte Nutzer", metrics.users],
        ].map(([label, value]) => (
          <div key={label} className="surface p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">{label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
          </div>
        ))}
      </div>

      <section className="surface mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">ER:LC Live-Lage</p>
            <h2 className="mt-2 text-xl font-semibold">{server.status.name}</h2>
          </div>
          <span className="badge badge-gold">{server.status.players ?? "–"} / {server.status.maxPlayers ?? "–"} Spieler · {server.status.queue ?? "–"} Queue</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Spieler</th><th>Team</th><th>Callsign</th><th>Berechtigung</th></tr></thead>
            <tbody>
              {(server.details.Players || []).map((player) => (
                <tr key={player.Player}>
                  <td className="font-semibold">{player.Player?.split(":")[0]}</td>
                  <td>{player.Team || "–"}</td>
                  <td>{player.Callsign || "–"}</td>
                  <td className="text-[#8d9397]">{player.Permission || "Normal"}</td>
                </tr>
              ))}
              {!server.details.Players?.length && <tr><td colSpan={4} className="py-10 text-center text-[#777d81]">Keine Live-Spielerdaten verfügbar.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {user.role === "OWNER" && (
        <section className="surface mt-5 overflow-hidden">
          <div className="border-b border-white/[0.07] p-6">
            <h2 className="text-xl font-semibold">Rollenverwaltung</h2>
            <p className="mt-2 text-sm text-[#858b90]">Nur die Projektleitung kann Staff-Rollen vergeben.</p>
          </div>
          <div className="divide-y divide-white/[0.07]">
            {users.map((member) => (
              <form action={changeUserRoleAction} key={member.id} className="flex flex-wrap items-center gap-4 p-5">
                <input type="hidden" name="userId" value={member.id} />
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm font-semibold">{member.name}</p>
                  <p className="mt-1 text-xs text-[#6f7579]">{member.robloxName || "Kein Roblox-Profil"}</p>
                </div>
                <select className="field !min-h-10 !w-auto !py-2" name="role" defaultValue={member.role}>
                  <option value="PLAYER">Player</option>
                  <option value="SUPPORTER">Supporter</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                </select>
                <SubmitButton variant="secondary">Speichern</SubmitButton>
              </form>
            ))}
            {!users.length && <p className="p-8 text-center text-sm text-[#777d81]">Noch keine Nutzer in der Datenbank.</p>}
          </div>
        </section>
      )}
    </PortalShell>
  );
}
