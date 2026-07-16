import { notFound } from "next/navigation";
import { replyTicketAction } from "@/app/actions/player";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/authz";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      assignee: { select: { name: true } },
      messages: {
        where: isStaff(user.role) ? {} : { internal: false },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });
  if (!ticket || (ticket.userId !== user.id && !isStaff(user.role))) notFound();

  return (
    <PortalShell role={user.role} title={"Ticket #" + ticket.number} description={ticket.subject}>
      <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
        <section className="surface overflow-hidden">
          <div className="border-b border-white/[0.07] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs text-[#777d81]">{ticket.category}</p><h2 className="mt-1 font-semibold">{ticket.subject}</h2></div>
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          <div className="grid gap-4 p-5 md:p-6">
            {ticket.messages.map((message) => (
              <article key={message.id} className={"max-w-[85%] rounded-2xl border p-4 " + (message.author.role !== "PLAYER" ? "border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.06]" : "border-white/[0.07] bg-white/[0.025]")}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <strong>{message.author.name}</strong>
                  {message.author.role !== "PLAYER" && <span className="text-[#efc76e]">Staff</span>}
                  <time className="text-[#686e72]">{formatDateTime(message.createdAt)}</time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#afb3b5]">{message.content}</p>
              </article>
            ))}
          </div>
          {!["CLOSED", "RESOLVED"].includes(ticket.status) && (
            <form action={replyTicketAction} className="border-t border-white/[0.07] p-5 md:p-6">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="field-label">Antwort
                <textarea className="field" name="content" required minLength={2} maxLength={4000} placeholder="Deine Nachricht …" />
              </label>
              <div className="mt-4"><SubmitButton>Antwort senden</SubmitButton></div>
            </form>
          )}
        </section>
        <aside className="surface h-fit p-5 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">Details</p>
          <dl className="mt-5 grid gap-4">
            <div><dt className="text-xs text-[#686e72]">Erstellt von</dt><dd className="mt-1 font-semibold">{ticket.user.name}</dd></div>
            <div><dt className="text-xs text-[#686e72]">Bearbeitung</dt><dd className="mt-1 font-semibold">{ticket.assignee?.name || "Noch nicht zugewiesen"}</dd></div>
            <div><dt className="text-xs text-[#686e72]">Zuletzt aktualisiert</dt><dd className="mt-1 font-semibold">{formatDateTime(ticket.updatedAt)}</dd></div>
          </dl>
        </aside>
      </div>
    </PortalShell>
  );
}
