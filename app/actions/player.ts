"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDbUser, getAuthorizationContext } from "@/lib/authz";
import { canAccessTicketCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ticketMessageSchema, ticketSchema } from "@/lib/validators";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || "");
}

export async function acceptRulesAction() {
  const user = await ensureDbUser();
  const rules = await prisma.rule.findMany({
    where: { published: true },
    select: { id: true, version: true },
  });
  await prisma.$transaction(
    rules.map((rule) =>
      prisma.ruleAcceptance.upsert({
        where: {
          userId_ruleId_version: {
            userId: user.id,
            ruleId: rule.id,
            version: rule.version,
          },
        },
        update: { acceptedAt: new Date() },
        create: { userId: user.id, ruleId: rule.id, version: rule.version },
      }),
    ),
  );
  revalidatePath("/dashboard");
}

export async function createTicketAction(formData: FormData) {
  const user = await ensureDbUser();
  const parsed = ticketSchema.safeParse({
    subject: formValue(formData, "subject"),
    category: formValue(formData, "category"),
    message: formValue(formData, "message"),
  });
  if (!parsed.success) redirect("/dashboard/tickets?error=invalid");

  const category = await prisma.ticketCategory.findUnique({
    where: { key: parsed.data.category },
  });
  if (!category?.enabled) redirect("/dashboard/tickets?error=category");

  const ticket = await prisma.$transaction(async (tx) => {
    const latest = await tx.ticket.aggregate({ _max: { number: true } });
    return tx.ticket.create({
      data: {
        number: (latest._max.number || 0) + 1,
        subject: parsed.data.subject,
        categoryId: category.id,
        userId: user.id,
        messages: {
          create: { authorId: user.id, content: parsed.data.message },
        },
      },
    });
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tickets");
  revalidatePath("/staff");
  revalidatePath("/staff/tickets");
  redirect("/dashboard/tickets/" + ticket.id + "?created=1");
}

export async function replyTicketAction(formData: FormData) {
  const user = await ensureDbUser();
  const parsed = ticketMessageSchema.safeParse({
    ticketId: formValue(formData, "ticketId"),
    content: formValue(formData, "content"),
  });
  if (!parsed.success) redirect("/dashboard/tickets?error=message");

  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket) redirect("/dashboard/tickets");
  const authorization = await getAuthorizationContext(user.id);
  const staffCanReply = canAccessTicketCategory(
    authorization,
    ticket.categoryId,
    "canReply",
  );
  if (ticket.userId !== user.id && !staffCanReply) redirect("/dashboard");

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: user.id,
        content: parsed.data.content,
      },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status:
          ticket.userId === user.id && ticket.status === "WAITING_USER"
            ? "IN_PROGRESS"
            : ticket.status,
      },
    }),
  ]);
  revalidatePath("/dashboard/tickets/" + ticket.id);
  revalidatePath("/staff/tickets");
}
export async function archiveTicketAction(formData: FormData) {
  const user = await ensureDbUser();
  const ticketId = formValue(formData, "ticketId");
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, userId: user.id } });
  if (!ticket || !["RESOLVED", "CLOSED"].includes(ticket.status) || ticket.ownerHiddenAt) {
    redirect("/dashboard/tickets?error=archive");
  }
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { ownerArchivedAt: new Date() },
  });
  revalidatePath("/dashboard/tickets");
  revalidatePath("/dashboard/tickets/" + ticket.id);
  redirect("/dashboard/tickets?view=archive&saved=archived");
}

export async function restoreTicketAction(formData: FormData) {
  const user = await ensureDbUser();
  const ticketId = formValue(formData, "ticketId");
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId: user.id, ownerArchivedAt: { not: null }, ownerHiddenAt: null },
  });
  if (!ticket) redirect("/dashboard/tickets?view=archive&error=restore");
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { ownerArchivedAt: null },
  });
  revalidatePath("/dashboard/tickets");
  revalidatePath("/dashboard/tickets/" + ticket.id);
  redirect("/dashboard/tickets?saved=restored");
}

export async function hideArchivedTicketAction(formData: FormData) {
  const user = await ensureDbUser();
  const ticketId = formValue(formData, "ticketId");
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId: user.id,
      status: "CLOSED",
      ownerArchivedAt: { not: null },
      ownerHiddenAt: null,
    },
  });
  if (!ticket) redirect("/dashboard/tickets?view=archive&error=hide");
  await prisma.ticket.update({ where: { id: ticket.id }, data: { ownerHiddenAt: new Date() } });
  revalidatePath("/dashboard/tickets");
  redirect("/dashboard/tickets?view=archive&saved=hidden");
}