import { saveTicketAccessAction, saveTicketCategoryAction } from "@/app/actions/admin";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TicketAdminPage() {
  const { authorization } = await requirePermission("tickets.manage_categories");
  const [categories, roles] = await Promise.all([
    prisma.ticketCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.accessRole.findMany({
      where: { key: { not: "PLAYER" } },
      orderBy: { priority: "desc" },
      include: { ticketAccesses: true },
    }),
  ]);

  return (
    <PortalShell authorization={authorization} title="Ticketkategorien & Zugriffe" description="Anzeigen, Antworten, Zuweisen und Statusänderungen werden je Rolle und Kategorie getrennt gesteuert." section="admin">
      <div className="grid gap-4">
        {categories.map((category) => (
          <section className="surface p-6" key={category.id}>
            <form action={saveTicketCategoryAction} className="grid gap-4 md:grid-cols-[1fr_1.4fr_100px_auto_auto] md:items-end">
              <input type="hidden" name="categoryId" value={category.id} />
              <label className="field-label">Name<input className="field" name="label" defaultValue={category.label} /></label>
              <label className="field-label">Beschreibung<input className="field" name="description" defaultValue={category.description || ""} /></label>
              <label className="field-label">Sortierung<input className="field" name="sortOrder" type="number" defaultValue={category.sortOrder} /></label>
              <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={category.enabled} /> Aktiv</label>
              <SubmitButton variant="secondary">Kategorie speichern</SubmitButton>
            </form>
            <div className="mt-6 grid gap-3 border-t border-white/[0.07] pt-6">
              {roles.map((role) => {
                const access = role.ticketAccesses.find((item) => item.categoryId === category.id);
                return (
                  <form action={saveTicketAccessAction} key={role.id} className="grid gap-3 rounded-xl border border-white/[0.07] p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
                    <input type="hidden" name="roleId" value={role.id} />
                    <input type="hidden" name="categoryId" value={category.id} />
                    <strong className="text-sm">{role.name}</strong>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <label><input type="checkbox" name="canView" defaultChecked={access?.canView} /> Anzeigen</label>
                      <label><input type="checkbox" name="canReply" defaultChecked={access?.canReply} /> Antworten</label>
                      <label><input type="checkbox" name="canAssign" defaultChecked={access?.canAssign} /> Zuweisen</label>
                      <label><input type="checkbox" name="canStatus" defaultChecked={access?.canStatus} /> Status ändern</label>
                    </div>
                    <SubmitButton variant="secondary">Zugriff speichern</SubmitButton>
                  </form>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PortalShell>
  );
}