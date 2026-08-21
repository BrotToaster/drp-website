import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { replyGuestTicketAction } from "@/app/actions/guest-tickets";
import { guestTicketCookieName, verifyGuestTicketSession } from "@/lib/guest-tickets";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const metadata: Metadata = { title: "Gastticket", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function GuestTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await prisma.guestTicketAccess.findUnique({ where: { ticketId: id }, include: { ticket: { include: { category: true, assignee: { select: { name: true } }, messages: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } } } } } });
  const cookieStore = await cookies();
  if (!access || !verifyGuestTicketSession(access, cookieStore.get(guestTicketCookieName(id))?.value)) notFound();
  const ticket = access.ticket;
  return <section className="guest-ticket-page"><div className="container-shell"><div className="guest-ticket-heading"><span className="badge badge-gold">Ticket #{ticket.number}</span><h1>{ticket.subject}</h1><p>{ticket.category.label} · erstellt von {access.displayName}</p></div><div className="grid gap-5 xl:grid-cols-[1fr_280px]"><section className="surface overflow-hidden"><div className="ticket-conversation">{ticket.messages.map((message) => <article key={message.id} className={message.authorKind === "GUEST" ? "guest-message" : "staff-message"}><div><strong>{message.authorKind === "GUEST" ? access.displayName : message.author?.name || "DRP Staff"}</strong><time>{formatDateTime(message.createdAt)}</time></div><p>{message.content}</p></article>)}</div>{!["CLOSED", "RESOLVED"].includes(ticket.status) && <form action={replyGuestTicketAction} className="guest-reply-form"><input type="hidden" name="ticketId" value={ticket.id} /><label className="field-label">Antwort<textarea className="field" name="content" minLength={2} maxLength={4000} required /></label><button className="button button-primary" type="submit">Antwort senden</button></form>}</section><aside className="surface h-fit p-5"><p className="eyebrow">Status</p><h2 className="mt-3 text-xl font-semibold">{ticket.status.replaceAll("_", " ")}</h2><dl className="mt-6 grid gap-4 text-sm"><div><dt className="text-[#686e72]">Bearbeitung</dt><dd className="mt-1 font-semibold">{ticket.assignee?.name || "Noch nicht zugewiesen"}</dd></div><div><dt className="text-[#686e72]">Letzte Änderung</dt><dd className="mt-1 font-semibold">{formatDateTime(ticket.updatedAt)}</dd></div>{access.discordContact && <div><dt className="text-[#686e72]">Discord-Kontakt</dt><dd className="mt-1 font-semibold">{access.discordContact}</dd></div>}</dl><p className="mt-7 border-t border-white/[.07] pt-5 text-xs leading-6 text-[#777d81]">Bewahre deinen Zugangslink sicher auf. DRP fragt dich niemals öffentlich danach.</p></aside></div></div></section>;
}
