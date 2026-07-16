import { notFound } from "next/navigation";
import { replyTicketAction } from "@/app/actions/player";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ensureDbUser, getAuthorizationContext } from "@/lib/authz";
import { canAccessTicketCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await ensureDbUser();
  const authorization = await getAuthorizationContext(user.id);
  const { id } = await params;
  const query = await searchParams;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      user: { select: { name: true } },
      assignee: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              name: true,
              roleAssignments: { select: { role: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });
  if (!ticket) notFound();
  const staffCanView = canAccessTicketCategory(
    authorization,
    ticket.categoryId,
    "canView",
  );
  if (ticket.userId !== user.id && !staffCanView) notFound();
  const messages = staffCanView
    ? ticket.messages
    : ticket.messages.filter((message) => !message.internal);
  const section = ticket.userId !== user.id && staffCanView ? "staff" : "dashboard";

  return (
    <PortalShell
      authorization={authorization}
      title={"Ticket #" + ticket.number}
      description={ticket.subject}
      section={section}
    >
      {query.created && (
        <p role="status" className="mb-5 rounded-xl border border-[#57c98c]/25 bg-[#57c98c]/10 p-4 text-sm text-[#75d7a3]">
          Dein Ticket wurde erfolgreich gesendet.
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
        <section className="surface overflow-hidden">
          <div className="border-b border-white/[0.07] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs text-[#777d81]">{ticket.category.label}</p><h2 className="mt-1 font-semibold">{ticket.subject}</h2></div>
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          <div className="grid gap-4 p-5 md:p-6">
            {messages.map((message) => {
              const staffAuthor = message.author.roleAssignments.some(
                (assignment) => assignment.role.key !== "PLAYER",
              );
              return (
                <article key={message.id} className={"max-w-[85%] rounded-2xl border p-4 " + (staffAuthor ? "border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.06]" : "border-white/[0.07] bg-white/[0.025]")}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <strong>{message.author.name}</strong>
                    {staffAuthor && <span className="text-[#efc76e]">Staff</span>}
                    {message.internal && <span className="text-[#f28d8a]">Intern</span>}
                    <time className="text-[#686e72]">{formatDateTime(message.createdAt)}</time>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#afb3b5]">{message.content}</p>
                </article>
              );
            })}
          </div>
          {!["CLOSED", "RESOLVED"].includes(ticket.status) && (
            <form action={replyTicketAction} className="border-t border-white/[0.07] p-5 md:p-6">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="field-label">Antwort
                <textarea className="field" name="content" required minLength={2} maxLength={4000} placeholder="Deine Nachricht …" />
              </label>
              <div className="mt-4"><SubmitButton pendingText="Antwort wird gesendet …">Antwort senden</SubmitButton></div>
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