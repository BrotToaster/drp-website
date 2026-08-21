"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { createGuestTicketToken, guestFingerprint, guestTicketCookieName, hashGuestTicketToken, verifyGuestTicketSession } from "@/lib/guest-tickets";
import { prisma } from "@/lib/prisma";
import { guestTicketSchema, ticketMessageSchema } from "@/lib/validators";

const formValue = (formData: FormData, key: string) => String(formData.get(key) || "");

export async function createGuestTicketAction(_previous: ActionResult<{ accessUrl: string }>, formData: FormData): Promise<ActionResult<{ accessUrl: string }>> {
  const parsed = guestTicketSchema.safeParse({
    displayName: formValue(formData, "displayName"),
    discordContact: formValue(formData, "discordContact") || undefined,
    subject: formValue(formData, "subject"),
    category: formValue(formData, "category"),
    message: formValue(formData, "message"),
    website: formValue(formData, "website"),
  });
  if (!parsed.success) return actionFailure("Bitte prüfe Name, Kategorie, Betreff und Nachricht.", "VALIDATION");
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local";
  const fingerprintHash = guestFingerprint(ip);
  await prisma.guestTicketRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const recent = await prisma.guestTicketRateLimit.count({ where: { fingerprintHash, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= 3) return actionFailure("Zu viele neue Tickets. Bitte versuche es später erneut oder nutze Discord.", "CONFLICT");
  const category = await prisma.ticketCategory.findFirst({ where: { key: parsed.data.category, enabled: true } });
  if (!category) return actionFailure("Diese Ticketkategorie ist derzeit nicht verfügbar.", "VALIDATION");
  const token = createGuestTicketToken();
  const accessId = randomUUID();
  const ticketId = randomUUID();
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const latest = await tx.ticket.aggregate({ _max: { number: true } });
      const created = await tx.ticket.create({ data: { id: ticketId, number: (latest._max.number || 0) + 1, subject: parsed.data.subject, categoryId: category.id, userId: null } });
      await tx.guestTicketAccess.create({ data: { id: accessId, ticketId: created.id, tokenHash: hashGuestTicketToken(token), displayName: parsed.data.displayName, discordContact: parsed.data.discordContact || null } });
      await tx.ticketMessage.create({ data: { ticketId: created.id, authorId: null, guestAccessId: accessId, authorKind: "GUEST", content: parsed.data.message } });
      await tx.guestTicketRateLimit.create({ data: { fingerprintHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      return created;
    });
    revalidatePath("/staff");
    revalidatePath("/staff/tickets");
    return actionSuccess(`Ticket #${ticket.number} wurde erstellt. Speichere jetzt deinen sicheren Zugriffslink.`, {
      data: { accessUrl: `/kontakt/zugang?token=${encodeURIComponent(token)}` },
      refresh: "none",
    });
  } catch {
    return actionFailure("Das Ticket konnte nicht erstellt werden. Bitte nutze alternativ den Discord-Support.");
  }
}

export async function replyGuestTicketAction(formData: FormData) {
  const parsed = ticketMessageSchema.safeParse({ ticketId: formValue(formData, "ticketId"), content: formValue(formData, "content") });
  if (!parsed.success) return;
  const access = await prisma.guestTicketAccess.findUnique({ where: { ticketId: parsed.data.ticketId }, include: { ticket: true } });
  if (!access || ["CLOSED", "RESOLVED"].includes(access.ticket.status)) return;
  const cookieStore = await cookies();
  if (!verifyGuestTicketSession(access, cookieStore.get(guestTicketCookieName(access.ticketId))?.value)) return;
  await prisma.$transaction([
    prisma.ticketMessage.create({ data: { ticketId: access.ticketId, guestAccessId: access.id, authorKind: "GUEST", content: parsed.data.content } }),
    prisma.ticket.update({ where: { id: access.ticketId }, data: { status: access.ticket.status === "WAITING_USER" ? "IN_PROGRESS" : access.ticket.status } }),
  ]);
  revalidatePath(`/kontakt/ticket/${access.ticketId}`);
  revalidatePath("/staff/tickets");
}
