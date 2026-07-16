import Link from "next/link";
import { setManualRolesAction } from "@/app/actions/staff";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { getServerDetails } from "@/lib/erlc";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    source?: string;
    page?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  const { authorization } = await requirePermission("staff.access");
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = 20;
  const visibleCategoryIds = authorization.isOwner
    ? undefined
    : authorization.ticketAccess.filter((item) => item.canView).map((item) => item.categoryId);
  const search = query.q?.trim() || "";

  const [server, ticketCount, userCount, roles] = await Promise.all([
    getServerDetails(true),
    prisma.ticket.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_USER"] },
        ...(visibleCategoryIds ? { categoryId: { in: visibleCategoryIds } } : {}),
      },
    }),
    prisma.user.count(),
    prisma.accessRole.findMany({ orderBy: { priority: "desc" } }),
  ]);

  const canViewUsers = hasPermission(authorization, "users.view");
  const canAssignRoles = hasPermission(authorization, "users.roles.assign");
  const userWhere = canViewUsers
    ? {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" as const } },
                  { discordUsername: { contains: search, mode: "insensitive" as const } },
                  { discordDisplayName: { contains: search, mode: "insensitive" as const } },
                  { robloxName: { contains: search, mode: "insensitive" as const } },
                  { robloxDisplayName: { contains: search, mode: "insensitive" as const } },
                ],
              }
            : {},
          query.role ? { roleAssignments: { some: { roleId: query.role } } } : {},
          query.source
            ? { roleAssignments: { some: { source: query.source as "MANUAL" | "DISCORD" | "SYSTEM" } } }
            : {},
        ],
      }
    : { id: "__hidden__" };

  const [users, filteredCount] = canViewUsers
    ? await Promise.all([
        prisma.user.findMany({
          where: userWhere,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            roleAssignments: {
              include: { role: true },
              orderBy: { role: { priority: "desc" } },
            },
          },
        }),
        prisma.user.count({ where: userWhere }),
      ])
    : [[], 0];

  return (
    <PortalShell
      authorization={authorization}
      title="Staff-Übersicht"
      description="Live-Lage, sichtbare Aufgaben und Nutzerverwaltung auf einen Blick."
      section="staff"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Für dich sichtbare offene Tickets", ticketCount],
          ["Registrierte Nutzer", userCount],
          ["ER:LC Spieler", server.status.players ?? "–"],
        ].map(([label, value]) => (
          <div key={label} className="surface p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">{label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
          </div>
        ))}
      </div>

      {canViewUsers && (
        <section className="surface mt-5 overflow-hidden">
          <div className="border-b border-white/[0.07] p-6">
            <h2 className="text-xl font-semibold">User-Verwaltung</h2>
            <form className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
              <input className="field" name="q" defaultValue={search} placeholder="Discord- oder Roblox-Name" />
              <select className="field" name="role" defaultValue={query.role || ""}>
                <option value="">Alle Rollen</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <select className="field" name="source" defaultValue={query.source || ""}>
                <option value="">Alle Quellen</option>
                <option value="MANUAL">Manuell</option>
                <option value="DISCORD">Discord</option>
                <option value="SYSTEM">System</option>
              </select>
              <button className="button button-secondary">Filtern</button>
            </form>
          </div>
          {(query.error || query.saved) && (
            <p role={query.error ? "alert" : "status"} className={"m-5 rounded-xl p-3 text-sm " + (query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]")}>
              {query.error === "owner" ? "Die geschützte Owner-Zuweisung kann nicht verändert werden." : query.error ? "Rollen konnten nicht gespeichert werden." : "Rollen wurden gespeichert."}
            </p>
          )}
          <div className="divide-y divide-white/[0.07]">
            {users.map((member) => {
              const manualIds = new Set(
                member.roleAssignments.filter((assignment) => assignment.source === "MANUAL").map((assignment) => assignment.roleId),
              );
              return (
                <form action={setManualRolesAction} key={member.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
                  <input type="hidden" name="userId" value={member.id} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{member.discordDisplayName || member.name}</p>
                    <p className="mt-1 truncate text-xs text-[#6f7579]">
                      {member.discordUsername ? "@" + member.discordUsername : "Kein Discord-Name"} · {member.robloxDisplayName || member.robloxName || "Kein Roblox-Name"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.roleAssignments.map((assignment) => (
                        <span key={assignment.id} className="badge" title={assignment.source}>
                          {assignment.role.name} · {assignment.source}
                        </span>
                      ))}
                    </div>
                  </div>
                  {canAssignRoles ? (
                    <div className="flex flex-wrap gap-3">
                      {roles.filter((role) => role.key !== "OWNER" && role.key !== "PLAYER").map((role) => (
                        <label key={role.id} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" name="roleIds" value={role.id} defaultChecked={manualIds.has(role.id)} />
                          {role.name}
                        </label>
                      ))}
                    </div>
                  ) : <span />}
                  {canAssignRoles && <SubmitButton variant="secondary">Speichern</SubmitButton>}
                </form>
              );
            })}
            {!users.length && <p className="p-8 text-center text-sm text-[#777d81]">Keine passenden Nutzer gefunden.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.07] p-5 text-sm">
            <span>{filteredCount} Nutzer</span>
            <div className="flex gap-2">
              {page > 1 && <Link className="button button-secondary !min-h-9" href={{ query: { ...query, page: page - 1 } }}>Zurück</Link>}
              {page * pageSize < filteredCount && <Link className="button button-secondary !min-h-9" href={{ query: { ...query, page: page + 1 } }}>Weiter</Link>}
            </div>
          </div>
        </section>
      )}
    </PortalShell>
  );
}