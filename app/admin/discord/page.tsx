import { saveDiscordRoleMappingAction } from "@/app/actions/admin";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { canManageDiscordRoleMappings } from "@/lib/role-mappings";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function DiscordAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { authorization } = await requirePermission("discord.manage");
  const query = await searchParams;
  const canManageMappings = canManageDiscordRoleMappings(authorization);
  const [discordRoles, accessRoles, receipts] = await Promise.all([
    prisma.discordRole.findMany({ orderBy: [{ guildId: "asc" }, { position: "desc" }], include: { mappings: true } }),
    prisma.accessRole.findMany({ orderBy: { priority: "desc" } }),
    prisma.botSyncReceipt.findMany({ where: { kind: { in: ["DISCORD_ROLES", "DISCORD_MEMBERS"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return (
    <PortalShell authorization={authorization} title="Discord-Integration" description="Synchronisierte Discord-Rollen mit Website-Rollen verknüpfen." section="admin">
      {(query.saved || query.error) && <p className={`mb-5 rounded-xl p-4 text-sm ${query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]"}`}>{query.error === "permissions" ? "Zum Ändern der Zuordnungen werden Rollen- und Discord-Verwaltungsrechte benötigt." : query.error ? "Die Discord-Zuordnung konnte nicht gespeichert werden." : "Discord-Zuordnung wurde gespeichert."}</p>}
      {!canManageMappings && <p className="mb-5 rounded-xl border border-[#f2c14e]/20 bg-[#f2c14e]/[0.06] p-4 text-sm text-[#d9c98f]">Du kannst die synchronisierten Discord-Rollen ansehen. Zum Ändern einer Website-Zuordnung werden zusätzlich Rechte zur Rollenverwaltung benötigt.</p>}
      <div className="surface mb-5 p-5">
        <h2 className="font-semibold">Letzter Synchronisierungsstatus</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {receipts.map((receipt) => <span className="badge" key={receipt.id}>{receipt.kind} · {formatDateTime(receipt.createdAt)}</span>)}
          {!receipts.length && <span className="text-sm text-[#777d81]">Noch kein Bot-Abgleich empfangen.</span>}
        </div>
      </div>
      <section className="surface overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Discord-Rolle</th><th>Guild</th><th>Position</th><th>Website-Rolle</th><th>Aktiv</th><th /></tr></thead>
            <tbody>
              {discordRoles.map((discordRole) => {
                const selected = new Set(discordRole.mappings.filter((mapping) => mapping.active).map((mapping) => mapping.accessRoleId));
                return (
                  <tr key={discordRole.id}>
                    <td><span className="font-semibold" style={{ color: discordRole.color || undefined }}>{discordRole.name}</span></td>
                    <td>{discordRole.guildId}</td>
                    <td>{discordRole.position}</td>
                    <td colSpan={3}>
                      <form action={saveDiscordRoleMappingAction} className="grid gap-3">
                        <input type="hidden" name="discordRoleId" value={discordRole.id} />
                        <div className="discord-inline-role-grid">
                          {accessRoles.map((role) => <label key={role.id}><input type="checkbox" name="accessRoleIds" value={role.id} defaultChecked={selected.has(role.id)} disabled={!canManageMappings} /><span style={{ backgroundColor: role.color }} />{role.name}</label>)}
                        </div>
                        {canManageMappings && <SubmitButton variant="secondary">Zuordnung speichern</SubmitButton>}
                      </form>
                    </td>
                  </tr>
                );
              })}
              {!discordRoles.length && <tr><td colSpan={6} className="py-12 text-center text-[#777d81]">Der Bot hat noch keine Discord-Rollen synchronisiert.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </PortalShell>
  );
}
