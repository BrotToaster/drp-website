import Link from "next/link";
import type { TicketStatus } from "@prisma/client";
import { updateTicketStatusAction } from "@/app/actions/staff";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

const labels: Record<TicketStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  WAITING_USER: "Wartet auf Nutzer",
  RESOLVED: "Gelöst",
  CLOSED: "Geschlossen",
};

const transitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["WAITING_USER", "RESOLVED", "CLOSED"],
  WAITING_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

export default async function StaffTicketsPage() {
  const user = await requireRole("SUPPORTER");
  let tickets: Array<{
    id: string; number: number; subject: string; category: string; status: TicketStatus;
    updatedAt: Date; user: { name: string; robloxName: string | null }; assignee: { name: string } | null;
  }> = [];
  try {
    tickets = await prisma.ticket.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
      include: {
        user: { select: { name: true, robloxName: true } },
        assignee: { select: { name: true } },
      },
    });
  } catch {}
  return (
    <PortalShell role={user.role} title="Ticketverwaltung" description="Supportfälle priorisieren, übernehmen und nachvollziehbar abschließen." staff>
      <section className="surface overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Ticket</th><th>Nutzer</th><th>Status</th><th>Bearbeiter</th><th>Aktualisiert</th><th>Aktion</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => {
                const nextStates = transitions[ticket.status];
                return (
                  <tr key={ticket.id}>
                    <td><Link href={"/dashboard/tickets/" + ticket.id} className="font-semibold hover:text-[#efc76e]">#{ticket.number} · {ticket.subject}</Link><div className="mt-1 text-xs text-[#6f7579]">{ticket.category}</div></td>
                    <td>{ticket.user.robloxName || ticket.user.name}</td>
                    <td><StatusBadge status={ticket.status} /></td>
                    <td>{ticket.assignee?.name || "–"}</td>
                    <td className="text-[#858b90]">{formatDateTime(ticket.updatedAt)}</td>
                    <td>
                      {nextStates.length ? (
                        <form action={updateTicketStatusAction} className="flex items-center gap-2">
                          <input type="hidden" name="ticketId" value={ticket.id} />
                          <select name="status" className="field !min-h-9 !w-auto !py-1.5 text-xs">
                            {nextStates.map((status) => <option key={status} value={status}>{labels[status]}</option>)}
                          </select>
                          <SubmitButton variant="secondary">Setzen</SubmitButton>
                        </form>
                      ) : <span className="text-xs text-[#666c70]">Abgeschlossen</span>}
                    </td>
                  </tr>
                );
              })}
              {!tickets.length && <tr><td colSpan={6} className="py-12 text-center text-[#777d81]">Keine Tickets vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </PortalShell>
  );
}
