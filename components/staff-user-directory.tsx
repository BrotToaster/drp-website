import Link from "next/link";
import { setManualRolesAction } from "@/app/actions/staff";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/prisma";

export type UserDirectoryQuery = {
  q?: string;
  role?: string;
  source?: string;
  page?: string;
  error?: string;
  saved?: string;
};

export async function StaffUserDirectory({
  query,
  editable,
  basePath,
}: {
  query: UserDirectoryQuery;
  editable: boolean;
  basePath: "/staff/nutzer" | "/staff/rollen" | "/admin/nutzerrollen";
}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = 20;
  const search = query.q?.trim() || "";
  const where = {
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
  };
  const [roles, users, count] = await Promise.all([
    prisma.accessRole.findMany({ orderBy: { priority: "desc" } }),
    prisma.user.findMany({
      where,
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
    prisma.user.count({ where }),
  ]);

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-white/[0.07] p-6">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
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
          const manualIds = new Set(member.roleAssignments.filter((assignment) => assignment.source === "MANUAL").map((assignment) => assignment.roleId));
          const content = (
            <>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{member.discordDisplayName || member.name}</p>
                <p className="mt-1 truncate text-xs text-[#6f7579]">
                  {member.discordUsername ? "Discord @" + member.discordUsername : "Kein Discord-Name"} · {member.robloxDisplayName || member.robloxName || "Kein Roblox-Name"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {member.roleAssignments.map((assignment) => (
                    <span key={assignment.id} className="badge" title={assignment.source}>
                      {assignment.role.name} · {assignment.source}
                    </span>
                  ))}
                </div>
              </div>
              {editable && (
                <>
                  <div className="flex flex-wrap gap-3">
                    {roles.filter((role) => role.key !== "OWNER" && role.key !== "PLAYER").map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" name="roleIds" value={role.id} defaultChecked={manualIds.has(role.id)} />
                        {role.name}
                      </label>
                    ))}
                  </div>
                  <SubmitButton variant="secondary">Speichern</SubmitButton>
                </>
              )}
            </>
          );
          return editable ? (
            <form action={setManualRolesAction} key={member.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
              <input type="hidden" name="userId" value={member.id} />
              {content}
            </form>
          ) : (
            <article key={member.id} className="p-5">{content}</article>
          );
        })}
        {!users.length && <p className="p-8 text-center text-sm text-[#777d81]">Keine passenden Nutzer gefunden.</p>}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.07] p-5 text-sm">
        <span>{count} Nutzer</span>
        <div className="flex gap-2">
          {page > 1 && <Link className="button button-secondary !min-h-9" href={{ pathname: basePath, query: { ...query, page: page - 1 } }}>Zurück</Link>}
          {page * pageSize < count && <Link className="button button-secondary !min-h-9" href={{ pathname: basePath, query: { ...query, page: page + 1 } }}>Weiter</Link>}
        </div>
      </div>
    </section>
  );
}
