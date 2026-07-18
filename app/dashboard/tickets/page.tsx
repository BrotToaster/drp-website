import Link from "next/link";
import {
  archiveTicketAction,
  createTicketAction,
  hideArchivedTicketAction,
  restoreTicketAction,
} from "@/app/actions/player";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ensureDbUser, getAuthorizationContext } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; view?: string }>;
}) {
  const user = await ensureDbUser();
  const authorization = await getAuthorizationContext(user.id);
  const query = await searchParams;
  const archived = query.view === "archive";
  const [tickets, categories] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        userId: user.id,
        ownerHiddenAt: null,
        ownerArchivedAt: archived ? { not: null } : null,
      },
      orderBy: { updatedAt: "desc" },
      include: { category: { select: { label: true } } },
    }),
    prisma.ticketCategory.findMany({
      where: { enabled: true, key: { in: ["CONTACT", "TECHNICAL"] } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const feedback = query.saved === "archived"
    ? "Ticket wurde archiviert."
    : query.saved === "restored"
      ? "Ticket wurde wiederhergestellt."
      : query.saved === "hidden"
        ? "Ticket wurde aus deiner Ansicht entfernt."
        : null;

  return (
    <PortalShell
      authorization={authorization}
      title="Support & Kontakt"
      description="Erstelle Tickets und behalte aktive sowie archivierte Anliegen getrennt im Blick."
    >
      <div className="mb-5 flex gap-2" aria-label="Ticketansicht">
        <Link className={"button " + (!archived ? "button-primary" : "button-secondary")} href="/dashboard/tickets">
          Aktiv
        </Link>
        <Link className={"button " + (archived ? "button-primary" : "button-secondary")} href="/dashboard/tickets?view=archive">
          Archiv
        </Link>
      </div>
      {feedback && <p role="status" className="mb-5 rounded-xl bg-[#57c98c]/10 p-3 text-sm text-[#75d7a3]">{feedback}</p>}
      {query.error && <p role="alert" className="mb-5 rounded-xl bg-[#ef6f6c]/10 p-3 text-sm text-[#f28d8a]">Die Aktion konnte nicht ausgeführt werden.</p>}

      <div className={"grid gap-5 " + (!archived ? "xl:grid-cols-[.9fr_1.1fr]" : "")}>
        {!archived && (
          <form action={createTicketAction} className="surface h-fit p-6 md:p-7">
            <h2 className="text-xl font-semibold">Neues Ticket</h2>
            <div className="mt-6 grid gap-5">
              <label className="field-label">Kategorie
                <select className="field" name="category" defaultValue="TECHNICAL">
                  {categories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}
                </select>
              </label>
              <label className="field-label">Betreff
                <input className="field" name="subject" required minLength={5} maxLength={100} placeholder="Kurze Zusammenfassung" />
              </label>
              <label className="field-label">Beschreibung
                <textarea className="field" name="message" required minLength={20} maxLength={4000} placeholder="Beschreibe dein Anliegen möglichst genau …" />
              </label>
              <div><SubmitButton pendingText="Ticket wird gesendet …">Ticket absenden</SubmitButton></div>
            </div>
          </form>
        )}
        <section className="surface overflow-hidden">
          <div className="border-b border-white/[0.07] p-6">
            <h2 className="text-xl font-semibold">{archived ? "Archivierte Tickets" : "Deine aktiven Tickets"}</h2>
            <p className="mt-1 text-sm text-[#777d81]">{archived ? "Diese Tickets bleiben für Staff sichtbar." : "Erledigte Tickets kannst du im Detail archivieren."}</p>
          </div>
          {tickets.length ? (
            <div className="divide-y divide-white/[0.07]">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="flex flex-wrap items-center gap-4 p-5">
                  <span className="text-xs font-bold text-[#efc76e]">#{ticket.number}</span>
                  <Link href={"/dashboard/tickets/" + ticket.id} className="min-w-[180px] flex-1 hover:text-[#efc76e]">
                    <p className="truncate text-sm font-semibold">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-[#70767a]">{ticket.category.label} · {formatDateTime(ticket.updatedAt)}</p>
                  </Link>
                  <StatusBadge status={ticket.status} />
                  {archived && (
                    <div className="flex flex-wrap gap-2">
                      <form action={restoreTicketAction}>
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <SubmitButton variant="secondary" pendingText="Wird wiederhergestellt …">Wiederherstellen</SubmitButton>
                      </form>
                      {ticket.status === "CLOSED" && (
                        <form action={hideArchivedTicketAction}>
                          <input type="hidden" name="ticketId" value={ticket.id} />
                          <ConfirmSubmitButton message="Dieses Ticket aus deiner Ansicht entfernen? Staff kann es weiterhin sehen.">Aus Ansicht entfernen</ConfirmSubmitButton>
                        </form>
                      )}
                    </div>
                  )}
                  {!archived && ["RESOLVED", "CLOSED"].includes(ticket.status) && (
                    <form action={archiveTicketAction}>
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <SubmitButton variant="secondary" pendingText="Wird archiviert …">Archivieren</SubmitButton>
                    </form>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-[#777d81]">
              {archived ? "Dein Archiv ist leer." : "Du hast noch keine aktiven Tickets."}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
