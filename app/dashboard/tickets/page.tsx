import Link from "next/link";
import { createTicketAction } from "@/app/actions/player";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  let tickets: Array<{ id: string; number: number; subject: string; category: string; status: string; updatedAt: Date }> = [];
  try {
    tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, number: true, subject: true, category: true, status: true, updatedAt: true },
    });
  } catch {}
  return (
    <PortalShell role={user.role} title="Support & Meldungen" description="Erstelle Tickets und verfolge transparent den aktuellen Bearbeitungsstand.">
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <form action={createTicketAction} className="surface h-fit p-6 md:p-7">
          <h2 className="text-xl font-semibold">Neues Ticket</h2>
          {query.error && <p className="mt-4 rounded-xl bg-[#ef6f6c]/10 p-3 text-sm text-[#f28d8a]">Bitte fülle alle Felder vollständig aus.</p>}
          <div className="mt-6 grid gap-5">
            <label className="field-label">Kategorie
              <select className="field" name="category" defaultValue="SUPPORT">
                <option value="SUPPORT">Allgemeiner Support</option>
                <option value="REPORT">Spielermeldung</option>
                <option value="APPEAL">Entbannungsantrag</option>
                <option value="TECHNICAL">Technisches Problem</option>
              </select>
            </label>
            <label className="field-label">Betreff
              <input className="field" name="subject" required minLength={5} maxLength={100} placeholder="Kurze Zusammenfassung" />
            </label>
            <label className="field-label">Beschreibung
              <textarea className="field" name="message" required minLength={20} maxLength={4000} placeholder="Beschreibe dein Anliegen möglichst genau …" />
            </label>
            <div><SubmitButton>Ticket absenden</SubmitButton></div>
          </div>
        </form>
        <section className="surface overflow-hidden">
          <div className="border-b border-white/[0.07] p-6">
            <h2 className="text-xl font-semibold">Deine Tickets</h2>
          </div>
          {tickets.length ? (
            <div className="divide-y divide-white/[0.07]">
              {tickets.map((ticket) => (
                <Link key={ticket.id} href={"/dashboard/tickets/" + ticket.id} className="flex flex-wrap items-center gap-4 p-5 transition hover:bg-white/[0.025]">
                  <span className="text-xs font-bold text-[#efc76e]">#{ticket.number}</span>
                  <div className="min-w-[180px] flex-1">
                    <p className="truncate text-sm font-semibold">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-[#70767a]">{ticket.category} · {formatDateTime(ticket.updatedAt)}</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-[#777d81]">Du hast noch keine Tickets erstellt.</div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
