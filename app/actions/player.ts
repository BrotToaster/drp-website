"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDbUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  applicationSchema,
  profileSchema,
  ticketMessageSchema,
  ticketSchema,
} from "@/lib/validators";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || "");
}

export async function updateProfileAction(formData: FormData) {
  const user = await ensureDbUser();
  const parsed = profileSchema.safeParse({
    robloxName: formValue(formData, "robloxName"),
    robloxUserId: formValue(formData, "robloxUserId"),
  });
  if (!parsed.success) redirect("/dashboard/profil?error=invalid");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      robloxName: parsed.data.robloxName,
      robloxUserId: parsed.data.robloxUserId || null,
    },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard/profil?saved=1");
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

  const latestTicket = await prisma.ticket.aggregate({ _max: { number: true } });
  const ticket = await prisma.ticket.create({
    data: {
      number: (latestTicket._max.number || 0) + 1,
      subject: parsed.data.subject,
      category: parsed.data.category,
      userId: user.id,
      messages: {
        create: { authorId: user.id, content: parsed.data.message },
      },
    },
  });
  redirect("/dashboard/tickets/" + ticket.id);
}

export async function replyTicketAction(formData: FormData) {
  const user = await ensureDbUser();
  const parsed = ticketMessageSchema.safeParse({
    ticketId: formValue(formData, "ticketId"),
    content: formValue(formData, "content"),
  });
  if (!parsed.success) throw new Error("Ungültige Nachricht.");
  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket || (ticket.userId !== user.id && user.role === "PLAYER")) {
    throw new Error("Kein Zugriff auf dieses Ticket.");
  }
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
        status: ticket.status === "WAITING_USER" ? "IN_PROGRESS" : ticket.status,
      },
    }),
  ]);
  revalidatePath("/dashboard/tickets/" + ticket.id);
}

export async function submitApplicationAction(formData: FormData) {
  const user = await ensureDbUser();
  const parsed = applicationSchema.safeParse({
    motivation: formValue(formData, "motivation"),
    experience: formValue(formData, "experience"),
    scenario: formValue(formData, "scenario"),
  });
  if (!parsed.success) redirect("/dashboard/bewerbung?error=invalid");
  const openApplication = await prisma.application.findFirst({
    where: {
      userId: user.id,
      status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
    },
  });
  if (openApplication) redirect("/dashboard/bewerbung?error=existing");
  await prisma.application.create({
    data: {
      userId: user.id,
      type: "WHITELIST",
      status: "SUBMITTED",
      answers: parsed.data as Prisma.InputJsonValue,
      submittedAt: new Date(),
    },
  });
  redirect("/dashboard/bewerbung?submitted=1");
}
