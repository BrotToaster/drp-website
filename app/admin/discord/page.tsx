import { saveDiscordRoleMappingAction } from "@/app/actions/admin";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function DiscordAdminPage() {
  const { authorization } = await requirePermission("discord.manage");
  const [discordRoles, accessRoles, receipts] = await Promise.all([
    prisma.discordRole.findMany({ orderBy: [{ guildId: "asc" }, { position: "desc" }], include: { mappings: true } }),
    prisma.accessRole.findMany({ orderBy: { priority: "desc" } }),
    prisma.botSyncReceipt.findMany({ where: { kind: { in: ["DISCORD_ROLES", "DISCORD_MEMBERS"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return (
    <PortalShell authorization={authorization} title="Discord-Integration" description="Synchronisierte Discord-Rollen mit Website-Rollen verknüpfen." section="admin">
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
                const mapping = discordRole.mappings[0];
                return (
                  <tr key={discordRole.id}>
                    <td><span className="font-semibold" style={{ color: discordRole.color || undefined }}>{discordRole.name}</span></td>
                    <td>{discordRole.guildId}</td>
                    <td>{discordRole.position}</td>
                    <td colSpan={3}>
                      <form action={saveDiscordRoleMappingAction} className="flex flex-wrap items-center gap-3">
                        <input type="hidden" name="discordRoleId" value={discordRole.id} />
                        <select className="field !min-h-10 !w-auto" name="accessRoleId" defaultValue={mapping?.accessRoleId || accessRoles[0]?.id}>
                          {accessRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="active" defaultChecked={mapping?.active ?? true} /> Aktiv</label>
                        <SubmitButton variant="secondary">Zuordnung speichern</SubmitButton>
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