import Link from "next/link";
import { deleteClosedTicketAction } from "@/app/actions/staff";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { TicketStatusForm } from "@/components/ticket-status-form";
import { requirePermission } from "@/lib/authz";
import { canAccessTicketCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function StaffTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const { authorization } = await requirePermission("tickets.view");
  const query = await searchParams;
  const visibleCategoryIds = authorization.isOwner
    ? undefined
    : authorization.ticketAccess.filter((item) => item.canView).map((item) => item.categoryId);
  const categories = await prisma.ticketCategory.findMany({
    where: {
      enabled: true,
      ...(visibleCategoryIds ? { id: { in: visibleCategoryIds } } : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      tickets: {
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 100,
        include: {
          user: {
            select: {
              name: true,
              robloxName: true,
              robloxDisplayName: true,
              discordDisplayName: true,
            },
          },
          assignee: { select: { name: true } },
        },
      },
    },
  });

  return (
    <PortalShell
      authorization={authorization}
      title="Ticketverwaltung"
      description="Tickets sind nach Kategorie gruppiert. Nur geschlossene Tickets können endgültig gelöscht werden."
      section="staff"
    >
      {query.deleted && <p role="status" className="mb-5 rounded-xl bg-[#57c98c]/10 p-3 text-sm text-[#75d7a3]">Das geschlossene Ticket wurde endgültig gelöscht.</p>}
      {query.error && <p role="alert" className="mb-5 rounded-xl bg-[#ef6f6c]/10 p-3 text-sm text-[#f28d8a]">Das Ticket konnte nicht gelöscht werden. Prüfe Status und Berechtigung.</p>}
      <div className="grid gap-5">
        {categories.map((category) => {
          const canStatus = canAccessTicketCategory(authorization, category.id, "canStatus");
          const canDelete = canAccessTicketCategory(authorization, category.id, "canDelete");
          return (
            <section className="surface overflow-hidden" key={category.id}>
              <div className="flex items-center justify-between border-b border-white/[0.07] p-6">
                <div>
                  <h2 className="text-xl font-semibold">{category.label}</h2>
                  <p className="mt-1 text-sm text-[#777d81]">{category.description}</p>
                </div>
                <span className="badge badge-gold">{category.tickets.length} Tickets</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Ticket</th><th>Nutzer</th><th>Status</th><th>Bearbeiter</th><th>Aktualisiert</th><th>Aktionen</th></tr></thead>
                  <tbody>
                    {category.tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td><Link href={"/dashboard/tickets/" + ticket.id} className="font-semibold hover:text-[#efc76e]">#{ticket.number} · {ticket.subject}</Link></td>
                        <td>{ticket.user.robloxDisplayName || ticket.user.robloxName || ticket.user.discordDisplayName || ticket.user.name}</td>
                        <td><StatusBadge status={ticket.status} /></td>
                        <td>{ticket.assignee?.name || "–"}</td>
                        <td className="text-[#858b90]">{formatDateTime(ticket.updatedAt)}</td>
                        <td>
                          <div className="flex min-w-[190px] flex-wrap gap-2">
                            {canStatus && <TicketStatusForm ticketId={ticket.id} status={ticket.status} />}
                            {ticket.status === "CLOSED" && canDelete && (
                              <form action={deleteClosedTicketAction}>
                                <input type="hidden" name="ticketId" value={ticket.id} />
                                <ConfirmSubmitButton
                                  className="button button-danger !min-h-9 !px-3"
                                  message={"Ticket #" + ticket.number + " endgültig mitsamt Nachrichten löschen?"}
                                >
                                  Löschen
                                </ConfirmSubmitButton>
                              </form>
                            )}
                            {!canStatus && !(ticket.status === "CLOSED" && canDelete) && <span className="text-xs text-[#666c70]">Nur Ansicht</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!category.tickets.length && <tr><td colSpan={6} className="py-10 text-center text-[#777d81]">Keine Tickets in dieser Kategorie.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        {!categories.length && <div className="surface p-10 text-center text-sm text-[#777d81]">Für deine Rollen sind keine Ticketkategorien freigegeben.</div>}
      </div>
    </PortalShell>
  );
}
