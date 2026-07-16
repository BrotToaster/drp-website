import { saveAccessRoleAction, saveRolePermissionsAction } from "@/app/actions/admin";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { authorization } = await requirePermission("roles.manage");
  const query = await searchParams;
  const [roles, permissions] = await Promise.all([
    prisma.accessRole.findMany({
      orderBy: { priority: "desc" },
      include: { permissions: { include: { permission: true } }, _count: { select: { assignments: true } } },
    }),
    prisma.permission.findMany({ orderBy: [{ group: "asc" }, { label: "asc" }] }),
  ]);
  const groups = Array.from(new Set(permissions.map((permission) => permission.group)));

  return (
    <PortalShell authorization={authorization} title="Rollen & Berechtigungen" description="Kombinierbare Rollen erstellen, sortieren und über eine Berechtigungsmatrix konfigurieren." section="admin">
      {(query.error || query.saved) && <p className={"mb-5 rounded-xl p-4 text-sm " + (query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]")}>{query.error ? "Eingaben konnten nicht gespeichert werden." : "Änderungen wurden gespeichert."}</p>}
      <details className="surface mb-5 p-6">
        <summary className="cursor-pointer font-semibold text-[#efc76e]">Neue Rolle erstellen</summary>
        <form action={saveAccessRoleAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="field-label">Name<input className="field" name="name" required /></label>
          <label className="field-label">Farbe<input className="field h-12" name="color" type="color" defaultValue="#d6aa4c" /></label>
          <label className="field-label">Priorität<input className="field" name="priority" type="number" defaultValue="10" /></label>
          <label className="field-label">Beschreibung<input className="field" name="description" /></label>
          <SubmitButton>Rolle erstellen</SubmitButton>
        </form>
      </details>
      <div className="grid gap-4">
        {roles.map((role) => {
          const selected = new Set(role.permissions.map((item) => item.permission.key));
          return (
            <details key={role.id} className="surface p-6">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-4">
                  <div><h2 className="font-semibold">{role.name}</h2><p className="mt-1 text-xs text-[#777d81]">{role._count.assignments} Zuweisungen · Priorität {role.priority}{role.isSystem ? " · Systemrolle" : ""}</p></div>
                  <span className="h-5 w-5 rounded-full" style={{ background: role.color }} />
                </div>
              </summary>
              <form action={saveAccessRoleAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6 md:grid-cols-2">
                <input type="hidden" name="roleId" value={role.id} />
                <label className="field-label">Name<input className="field" name="name" defaultValue={role.name} /></label>
                <label className="field-label">Farbe<input className="field h-12" name="color" type="color" defaultValue={role.color} /></label>
                <label className="field-label">Priorität<input className="field" name="priority" type="number" defaultValue={role.priority} /></label>
                <label className="field-label">Beschreibung<input className="field" name="description" defaultValue={role.description || ""} /></label>
                <SubmitButton variant="secondary">Rollendaten speichern</SubmitButton>
              </form>
              <form action={saveRolePermissionsAction} className="mt-6 border-t border-white/[0.07] pt-6">
                <input type="hidden" name="roleId" value={role.id} />
                <div className="grid gap-5 lg:grid-cols-2">
                  {groups.map((group) => (
                    <fieldset key={group} className="rounded-xl border border-white/[0.07] p-4">
                      <legend className="px-2 text-sm font-semibold text-[#efc76e]">{group}</legend>
                      <div className="grid gap-3">
                        {permissions.filter((permission) => permission.group === group).map((permission) => (
                          <label key={permission.id} className="flex items-center gap-3 text-sm">
                            <input type="checkbox" name="permissionKeys" value={permission.key} defaultChecked={role.key === "OWNER" || selected.has(permission.key)} disabled={role.key === "OWNER"} />
                            {permission.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className="mt-5"><SubmitButton>Rechtematrix speichern</SubmitButton></div>
              </form>
            </details>
          );
        })}
      </div>
    </PortalShell>
  );
}