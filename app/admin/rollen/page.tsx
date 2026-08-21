import { deleteAccessRoleAction, saveAccessRoleAction, saveDefaultAccessRoleAction, saveRolePermissionsAction } from "@/app/actions/admin";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DiscordRolePicker } from "@/components/discord-role-picker";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { canManageDiscordRoleMappings } from "@/lib/role-mappings";

export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { authorization } = await requirePermission("roles.manage");
  const query = await searchParams;
  const canManageDiscord = canManageDiscordRoleMappings(authorization);
  const [roles, permissions, defaultRoleSetting, discordRoles] = await Promise.all([
    prisma.accessRole.findMany({
      orderBy: { priority: "desc" },
      include: {
        permissions: { include: { permission: true } },
        assignments: { select: { source: true, userId: true } },
        discordMappings: { include: { discordRole: true } },
        _count: { select: { assignments: true, discordMappings: true, ticketAccesses: true, documentAccesses: true, documentGrants: true, calendarAccesses: true } },
      },
    }),
    prisma.permission.findMany({ orderBy: [{ group: "asc" }, { label: "asc" }] }),
    prisma.siteSetting.findUnique({ where: { key: "auth.defaultAccessRole" } }),
    canManageDiscord
      ? prisma.discordRole.findMany({ orderBy: [{ guildId: "asc" }, { position: "desc" }, { name: "asc" }] })
      : Promise.resolve([]),
  ]);
  const groups = Array.from(new Set(permissions.map((permission) => permission.group)));
  const defaultRoleId = defaultRoleSetting?.value && typeof defaultRoleSetting.value === "object" && !Array.isArray(defaultRoleSetting.value)
    ? String((defaultRoleSetting.value as { roleId?: unknown }).roleId || "")
    : "";

  return (
    <PortalShell authorization={authorization} title="Rollen & Berechtigungen" description="Kombinierbare Rollen erstellen, sortieren und über eine Berechtigungsmatrix konfigurieren." section="admin">
      {(query.error || query.saved) && <p className={"mb-5 rounded-xl p-4 text-sm " + (query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]")}>{query.error === "protected" ? "Owner kann weder gelöscht noch als Ersatzrolle verwendet werden." : query.error === "replacement" ? "Bitte wähle eine andere Ersatzrolle." : query.error === "default" ? "Die Standardrolle muss eine vorhandene Rolle außer Owner sein." : query.error === "discord-permission" ? "Dir fehlt die Berechtigung, Discord-Zuordnungen zu ändern." : query.error === "discord-role" ? "Mindestens eine ausgewählte Discord-Rolle ist nicht mehr verfügbar." : query.error ? "Eingaben konnten nicht gespeichert werden." : query.saved === "deleted" ? "Rolle wurde gelöscht und ihre Zuweisungen wurden übertragen." : query.saved === "default" ? "Standardrolle wurde aktualisiert." : "Änderungen wurden gespeichert."}</p>}
      <form action={saveDefaultAccessRoleAction} className="surface mb-5 grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-end">
        <label className="field-label">Standardrolle für neue Mitglieder
          <select className="field" name="roleId" defaultValue={defaultRoleId} required>
            <option value="" disabled>Rolle auswählen</option>
            {roles.filter((role) => role.key !== "OWNER").map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          <span className="text-xs font-normal leading-5 text-[#777d81]">Diese Rolle wird neuen Website-Konten automatisch zugewiesen.</span>
        </label>
        <SubmitButton variant="secondary">Standardrolle speichern</SubmitButton>
      </form>
      <details className="surface mb-5 p-6">
        <summary className="cursor-pointer font-semibold text-[#efc76e]">Neue Rolle erstellen</summary>
        <form action={saveAccessRoleAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="field-label">Name<input className="field" name="name" required /></label>
          <label className="field-label">Farbe<input className="field h-12" name="color" type="color" defaultValue="#d6aa4c" /></label>
          <label className="field-label">Priorität<input className="field" name="priority" type="number" defaultValue="10" /></label>
          <label className="field-label">Beschreibung<input className="field" name="description" /></label>
          {canManageDiscord && <DiscordRolePicker roles={discordRoles} />}
          <SubmitButton>Rolle erstellen</SubmitButton>
        </form>
      </details>
      <div className="grid gap-4">
        {roles.map((role) => {
          const selected = new Set(role.permissions.map((item) => item.permission.key));
          const manualAssignments = role.assignments.filter((assignment) => assignment.source === "MANUAL").length;
          const automaticAssignments = role.assignments.length - manualAssignments;
          const affectedUsers = new Set(role.assignments.map((assignment) => assignment.userId)).size;
          return (
            <details key={role.id} className="surface p-6">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-4">
                  <div><h2 className="font-semibold">{role.name}</h2><p className="mt-1 text-xs text-[#777d81]">{role._count.assignments} Zuweisungen · Priorität {role.priority}{role.isSystem ? " · Systemrolle" : ""}</p></div>
                  <span className="h-5 w-5 rounded-full" style={{ background: role.color }} />
                </div>
              </summary>
              {role.key === "OWNER" ? (
                <div className="mt-6 rounded-xl border border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.06] p-4 text-sm text-[#c8c3b7]">
                  Die Owner-Rolle ist geschützt. Name, Farbe, Priorität und vollständige Rechte können nicht verändert werden.
                </div>
              ) : <form action={saveAccessRoleAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6 md:grid-cols-2">
                <input type="hidden" name="roleId" value={role.id} />
                <label className="field-label">Name<input className="field" name="name" defaultValue={role.name} /></label>
                <label className="field-label">Farbe<input className="field h-12" name="color" type="color" defaultValue={role.color} /></label>
                <label className="field-label">Priorität<input className="field" name="priority" type="number" defaultValue={role.priority} /></label>
                <label className="field-label">Beschreibung<input className="field" name="description" defaultValue={role.description || ""} /></label>
                {canManageDiscord && <DiscordRolePicker roles={discordRoles} selectedIds={role.discordMappings.filter((mapping) => mapping.active).map((mapping) => mapping.discordRoleId)} />}
                <SubmitButton variant="secondary">Rollendaten speichern</SubmitButton>
              </form>}
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
                {role.key !== "OWNER" && <div className="mt-5"><SubmitButton>Rechtematrix speichern</SubmitButton></div>}
              </form>
              {role.key !== "OWNER" && <form action={deleteAccessRoleAction} className="mt-6 grid gap-4 border-t border-[#ef6f6c]/20 pt-6 md:grid-cols-[1fr_auto] md:items-end">
                <input type="hidden" name="roleId" value={role.id} />
                <label className="field-label">Ersatzrolle
                  <select className="field" name="replacementRoleId" required defaultValue="">
                    <option value="" disabled>Rolle auswählen</option>
                    {roles.filter((candidate) => candidate.id !== role.id && candidate.key !== "OWNER").map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                  </select>
                  <span className="text-xs font-normal leading-5 text-[#777d81]">{affectedUsers} betroffene Nutzer · {role._count.assignments} Zuweisungen ({manualAssignments} manuell, {automaticAssignments} automatisch) · {role._count.discordMappings} Discord-Verknüpfungen · {role._count.ticketAccesses} Ticket-, {role._count.documentAccesses + role._count.documentGrants} Dokument- und {role._count.calendarAccesses} Kalenderfreigaben. Rechte werden nicht mit übertragen.</span>
                </label>
                <ConfirmSubmitButton message={`Rolle „${role.name}“ wirklich löschen? Nutzer und Discord-Zuordnungen werden auf die gewählte Ersatzrolle übertragen.`}>Rolle löschen</ConfirmSubmitButton>
              </form>}
            </details>
          );
        })}
      </div>
    </PortalShell>
  );
}
