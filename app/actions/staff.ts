"use server";

import type { ApplicationStatus, Role, SanctionType, TicketStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDbUser, requireRole } from "@/lib/authz";
import { canTransitionTicket } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { newsSchema, ruleSchema, sanctionSchema } from "@/lib/validators";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function audit(actorId: string, action: string, entityType: string, entityId?: string, metadata?: object) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
}

export async function updateTicketStatusAction(formData: FormData) {
  await requireRole("SUPPORTER");
  const actor = await ensureDbUser();
  const ticketId = value(formData, "ticketId");
  const nextStatus = value(formData, "status") as TicketStatus;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !canTransitionTicket(ticket.status, nextStatus)) {
    throw new Error("Dieser Statuswechsel ist nicht erlaubt.");
  }
  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: nextStatus,
        assigneeId: ticket.assigneeId || actor.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "TICKET_STATUS_CHANGED",
        entityType: "Ticket",
        entityId: ticketId,
        metadata: { from: ticket.status, to: nextStatus },
      },
    }),
  ]);
  revalidatePath("/staff/tickets");
}

export async function reviewApplicationAction(formData: FormData) {
  await requireRole("MODERATOR");
  const actor = await ensureDbUser();
  const applicationId = value(formData, "applicationId");
  const status = value(formData, "status") as ApplicationStatus;
  if (!["UNDER_REVIEW", "ACCEPTED", "REJECTED"].includes(status)) {
    throw new Error("Ungültiger Bewerbungsstatus.");
  }
  const note = value(formData, "staffNote").trim();
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status,
      reviewerId: actor.id,
      staffNote: note || null,
      reviewedAt: status === "ACCEPTED" || status === "REJECTED" ? new Date() : null,
    },
  });
  await audit(actor.id, "APPLICATION_REVIEWED", "Application", applicationId, { status });
  revalidatePath("/staff/bewerbungen");
}

export async function createSanctionAction(formData: FormData) {
  await requireRole("MODERATOR");
  const actor = await ensureDbUser();
  const parsed = sanctionSchema.safeParse({
    robloxName: value(formData, "robloxName"),
    robloxUserId: value(formData, "robloxUserId"),
    type: value(formData, "type"),
    reason: value(formData, "reason"),
    evidenceUrl: value(formData, "evidenceUrl"),
    expiresAt: value(formData, "expiresAt"),
  });
  if (!parsed.success) redirect("/staff/sanktionen?error=invalid");
  const sanction = await prisma.sanction.create({
    data: {
      issuerId: actor.id,
      robloxName: parsed.data.robloxName,
      robloxUserId: parsed.data.robloxUserId || null,
      type: parsed.data.type as SanctionType,
      reason: parsed.data.reason,
      evidenceUrl: parsed.data.evidenceUrl || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });
  await audit(actor.id, "SANCTION_CREATED", "Sanction", sanction.id, { type: sanction.type });
  redirect("/staff/sanktionen?created=1");
}

export async function revokeSanctionAction(formData: FormData) {
  await requireRole("ADMIN");
  const actor = await ensureDbUser();
  const sanctionId = value(formData, "sanctionId");
  await prisma.sanction.update({
    where: { id: sanctionId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await audit(actor.id, "SANCTION_REVOKED", "Sanction", sanctionId);
  revalidatePath("/staff/sanktionen");
}

export async function createRuleAction(formData: FormData) {
  await requireRole("ADMIN");
  const actor = await ensureDbUser();
  const parsed = ruleSchema.safeParse({
    title: value(formData, "title"),
    category: value(formData, "category"),
    content: value(formData, "content"),
  });
  if (!parsed.success) redirect("/staff/inhalte?error=rule");
  const rule = await prisma.rule.create({
    data: {
      ...parsed.data,
      slug: slugify(parsed.data.title) + "-" + Date.now().toString(36),
      order: await prisma.rule.count(),
      published: true,
    },
  });
  await audit(actor.id, "RULE_CREATED", "Rule", rule.id);
  revalidatePath("/regelwerk");
  redirect("/staff/inhalte?created=rule");
}

export async function createNewsAction(formData: FormData) {
  await requireRole("ADMIN");
  const actor = await ensureDbUser();
  const parsed = newsSchema.safeParse({
    title: value(formData, "title"),
    excerpt: value(formData, "excerpt"),
    content: value(formData, "content"),
    coverLabel: value(formData, "coverLabel"),
  });
  if (!parsed.success) redirect("/staff/inhalte?error=news");
  const post = await prisma.newsPost.create({
    data: {
      ...parsed.data,
      coverLabel: parsed.data.coverLabel || null,
      slug: slugify(parsed.data.title) + "-" + Date.now().toString(36),
      authorId: actor.id,
      published: true,
      publishedAt: new Date(),
    },
  });
  await audit(actor.id, "NEWS_CREATED", "NewsPost", post.id);
  revalidatePath("/news");
  redirect("/staff/inhalte?created=news");
}

export async function changeUserRoleAction(formData: FormData) {
  await requireRole("OWNER");
  const actor = await ensureDbUser();
  const userId = value(formData, "userId");
  const role = value(formData, "role") as Role;
  if (!["PLAYER", "SUPPORTER", "MODERATOR", "ADMIN", "OWNER"].includes(role)) {
    throw new Error("Ungültige Rolle.");
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await audit(actor.id, "USER_ROLE_CHANGED", "User", userId, { role });
  revalidatePath("/staff");
}
