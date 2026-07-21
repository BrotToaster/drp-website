"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { plainTextFromContent, parseContentJson } from "@/lib/content";
import { requirePermission } from "@/lib/authz";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { canAccessTicketCategory, canTransitionTicket } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { newsEditorSchema, ruleEditorSchema, ticketStatusSchema } from "@/lib/validators";

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

function mediaIds(formData: FormData) {
  try {
    const parsed = JSON.parse(value(formData, "mediaIds") || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function mediaCaptionMap(formData: FormData): Record<string, string> {
  try {
    const parsed = JSON.parse(value(formData, "mediaCaptions") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([id, caption]) => [id, caption.trim().slice(0, 240)]),
    );
  } catch {
    return {};
  }
}
function auditData(
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
) {
  return { actorId, action, entityType, entityId, metadata };
}

type AssetCandidate = { id: string; publicId: string; resourceType: string };

async function cleanupUnusedMedia(candidates: AssetCandidate[]) {
  const unique = Array.from(new Map(candidates.map((asset) => [asset.id, asset])).values());
  for (const asset of unique) {
    const [rules, news, thumbnails] = await Promise.all([
      prisma.ruleRevisionMedia.count({ where: { mediaId: asset.id } }),
      prisma.newsRevisionMedia.count({ where: { mediaId: asset.id } }),
      prisma.newsPost.count({ where: { thumbnailId: asset.id } }),
    ]);
    if (rules + news + thumbnails !== 0) continue;
    try {
      await deleteCloudinaryAsset(asset.publicId, asset.resourceType);
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
    } catch {
      // Keep the database record so a failed Cloudinary deletion can be retried safely.
    }
  }
}

export async function updateTicketStatusAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { user: actor, authorization } = await requirePermission("tickets.status");
  const parsed = ticketStatusSchema.safeParse({
    ticketId: value(formData, "ticketId"),
    status: value(formData, "status"),
    expectedStatus: value(formData, "expectedStatus"),
  });
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: "Ungültige Statusangabe." };
  }
  if (!canTransitionTicket(parsed.data.expectedStatus, parsed.data.status)) {
    return { ok: false, code: "VALIDATION", message: "Dieser Statuswechsel ist nicht erlaubt." };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket) return { ok: false, code: "VALIDATION", message: "Ticket nicht gefunden." };
  if (!canAccessTicketCategory(authorization, ticket.categoryId, "canStatus")) {
    return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung für diese Kategorie." };
  }

  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.ticket.updateMany({
      where: { id: ticket.id, status: parsed.data.expectedStatus },
      data: {
        status: parsed.data.status,
        assigneeId: ticket.assigneeId || actor.id,
      },
    });
    if (result.count !== 1) return false;
    await tx.auditLog.create({
      data: auditData(actor.id, "TICKET_STATUS_CHANGED", "Ticket", ticket.id, {
        from: parsed.data.expectedStatus,
        to: parsed.data.status,
      }),
    });
    return true;
  });

  if (!changed) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "Das Ticket wurde zwischenzeitlich geändert. Die Ansicht wurde aktualisiert.",
    };
  }
  revalidatePath("/staff");
  revalidatePath("/staff/tickets");
  revalidatePath("/dashboard/tickets");
  revalidatePath("/dashboard/tickets/" + ticket.id);
  return { ok: true, message: "Status wurde aktualisiert." };
}

export async function setManualRolesAction(formData: FormData) {
  const { user: actor, authorization } = await requirePermission("users.roles.assign");
  const userId = value(formData, "userId");
  const requested = formData.getAll("roleIds").map(String);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect("/admin/nutzerrollen?error=user");
  const protectedOwner =
    target.id === "demo-owner" ||
    Boolean(target.discordId && target.discordId === process.env.OWNER_DISCORD_ID);
  if (protectedOwner) redirect("/admin/nutzerrollen?error=owner");

  const roles = await prisma.accessRole.findMany({
    where: { id: { in: requested }, key: { not: "OWNER" } },
  });
  if (roles.length !== requested.length) redirect("/admin/nutzerrollen?error=role");

  await prisma.$transaction(async (tx) => {
    await tx.userRoleAssignment.deleteMany({
      where: { userId, source: "MANUAL" },
    });
    if (roles.length) {
      await tx.userRoleAssignment.createMany({
        data: roles.map((role) => ({
          userId,
          roleId: role.id,
          source: "MANUAL" as const,
          sourceKey: "staff-ui",
          assignedById: actor.id,
        })),
      });
    }
    await tx.auditLog.create({
      data: auditData(actor.id, "USER_ROLES_CHANGED", "User", userId, {
        roleIds: roles.map((role) => role.id),
        actorRoles: authorization.roleNames,
      }),
    });
  });
  revalidatePath("/admin/nutzerrollen");
  revalidatePath("/staff/nutzer");
  redirect("/admin/nutzerrollen?saved=roles");
}


export async function deleteClosedTicketAction(formData: FormData) {
  const { user: actor, authorization } = await requirePermission("tickets.delete");
  const ticketId = value(formData, "ticketId");
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      number: true,
      categoryId: true,
      userId: true,
      subject: true,
      status: true,
    },
  });
  if (!ticket) redirect("/staff/tickets?error=missing");
  if (ticket.status !== "CLOSED") redirect("/staff/tickets?error=not-closed");
  if (!canAccessTicketCategory(authorization, ticket.categoryId, "canDelete")) {
    redirect("/staff/tickets?error=forbidden");
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: auditData(actor.id, "TICKET_DELETED", "Ticket", ticket.id, {
        number: ticket.number,
        categoryId: ticket.categoryId,
        affectedUserId: ticket.userId,
        subject: ticket.subject,
      }),
    });
    await tx.ticket.delete({ where: { id: ticket.id } });
  });

  revalidatePath("/staff");
  revalidatePath("/staff/tickets");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tickets");
  redirect("/staff/tickets?deleted=1");
}

export async function saveRuleAction(formData: FormData) {
  const content = parseContentJson(value(formData, "content"));
  const parsed = ruleEditorSchema.safeParse({
    ruleId: value(formData, "ruleId") || undefined,
    title: value(formData, "title"),
    category: value(formData, "category"),
    content,
    mediaIds: mediaIds(formData),
  });
  const intent = value(formData, "intent");
  if (!parsed.success) redirect("/staff/regelwerk?error=invalid");
  const permission = parsed.data.ruleId ? "rules.edit" : "rules.create";
  const { user: actor } = await requirePermission(permission);
  if (intent === "publish") await requirePermission("rules.publish");

  const saved = await prisma.$transaction(async (tx) => {
    const existing = parsed.data.ruleId
      ? await tx.rule.findUnique({ where: { id: parsed.data.ruleId } })
      : null;
    const rule = existing
      ? await tx.rule.update({
          where: { id: existing.id },
          data: { title: parsed.data.title, category: parsed.data.category, order: parsed.data.order },
        })
      : await tx.rule.create({
          data: {
            title: parsed.data.title,
            category: parsed.data.category,
            slug: slugify(parsed.data.title) + "-" + Date.now().toString(36),
            order: parsed.data.order,
          },
        });

    if (intent === "publish") {
      await tx.ruleRevision.updateMany({
        where: { ruleId: rule.id, status: "PUBLISHED" },
        data: { status: "SUPERSEDED" },
      });
    }
    const revision = await tx.ruleRevision.create({
      data: {
        ruleId: rule.id,
        status: intent === "publish" ? "PUBLISHED" : "DRAFT",
        content: parsed.data.content as Prisma.InputJsonValue,
        searchText: `${parsed.data.title} ${plainTextFromContent(parsed.data.content)}`,
        editorId: actor.id,
        publishedAt: intent === "publish" ? new Date() : null,
        media: {
          create: parsed.data.mediaIds.map((mediaId, index) => ({
            mediaId,
            sortOrder: index,
            caption: mediaCaptionMap(formData)[mediaId] || null,
          })),
        },
      },
    });
    if (intent === "publish") {
      await tx.rule.update({
        where: { id: rule.id },
        data: { published: true, version: { increment: 1 } },
      });
    }
    await tx.auditLog.create({
      data: auditData(
        actor.id,
        intent === "publish" ? "RULE_PUBLISHED" : "RULE_DRAFT_SAVED",
        "Rule",
        rule.id,
        { revisionId: revision.id },
      ),
    });
    return rule;
  });
  revalidatePath("/regelwerk");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/staff/regelwerk");
  redirect("/staff/regelwerk?saved=" + saved.id);
}

export async function withdrawRuleAction(formData: FormData) {
  const { user: actor } = await requirePermission("rules.publish");
  const ruleId = value(formData, "ruleId");
  await prisma.$transaction([
    prisma.rule.update({ where: { id: ruleId }, data: { published: false } }),
    prisma.ruleRevision.updateMany({
      where: { ruleId, status: "PUBLISHED" },
      data: { status: "SUPERSEDED" },
    }),
    prisma.auditLog.create({
      data: auditData(actor.id, "RULE_WITHDRAWN", "Rule", ruleId),
    }),
  ]);
  revalidatePath("/regelwerk");
  revalidatePath("/");
  revalidatePath("/staff/regelwerk");
}

export async function deleteRuleAction(formData: FormData) {
  const { user: actor } = await requirePermission("rules.delete");
  const ruleId = value(formData, "ruleId");
  const rule = await prisma.rule.findUnique({
    where: { id: ruleId },
    select: {
      revisions: {
        select: {
          media: { select: { media: { select: { id: true, publicId: true, resourceType: true } } } },
        },
      },
    },
  });
  const assets = rule?.revisions.flatMap((revision) => revision.media.map((item) => item.media)) || [];
  await prisma.$transaction(async (tx) => {
    await tx.rule.delete({ where: { id: ruleId } });
    await tx.auditLog.create({ data: auditData(actor.id, "RULE_DELETED", "Rule", ruleId) });
  });
  await cleanupUnusedMedia(assets);
  revalidatePath("/regelwerk");
  revalidatePath("/");
  revalidatePath("/staff/regelwerk");
}

export async function saveNewsAction(formData: FormData) {
  const content = parseContentJson(value(formData, "content"));
  const parsed = newsEditorSchema.safeParse({
    postId: value(formData, "postId") || undefined,
    title: value(formData, "title"),
    excerpt: value(formData, "excerpt"),
    coverLabel: value(formData, "coverLabel") || undefined,
    content,
    thumbnailId: value(formData, "thumbnailId") || undefined,
    mediaIds: mediaIds(formData),
  });
  const intent = value(formData, "intent");
  if (!parsed.success) redirect("/staff/news?error=invalid");
  const permission = parsed.data.postId ? "news.edit" : "news.create";
  const { user: actor } = await requirePermission(permission);
  if (intent === "publish") await requirePermission("news.publish");

  const post = await prisma.$transaction(async (tx) => {
    const existing = parsed.data.postId
      ? await tx.newsPost.findUnique({ where: { id: parsed.data.postId } })
      : null;
    const record = existing
      ? await tx.newsPost.update({
          where: { id: existing.id },
          data: {
            title: parsed.data.title,
            excerpt: parsed.data.excerpt,
            coverLabel: parsed.data.coverLabel || null,
            thumbnailId: parsed.data.thumbnailId || null,
            editedAt: existing.published ? new Date() : existing.editedAt,
          },
        })
      : await tx.newsPost.create({
          data: {
            title: parsed.data.title,
            excerpt: parsed.data.excerpt,
            coverLabel: parsed.data.coverLabel || null,
            thumbnailId: parsed.data.thumbnailId || null,
            slug: slugify(parsed.data.title) + "-" + Date.now().toString(36),
            authorId: actor.id,
          },
        });
    if (intent === "publish") {
      await tx.newsRevision.updateMany({
        where: { newsPostId: record.id, status: "PUBLISHED" },
        data: { status: "SUPERSEDED" },
      });
    }
    const revision = await tx.newsRevision.create({
      data: {
        newsPostId: record.id,
        status: intent === "publish" ? "PUBLISHED" : "DRAFT",
        content: parsed.data.content as Prisma.InputJsonValue,
        searchText: `${parsed.data.title} ${plainTextFromContent(parsed.data.content)}`,
        editorId: actor.id,
        publishedAt: intent === "publish" ? new Date() : null,
        media: {
          create: parsed.data.mediaIds.map((mediaId, index) => ({
            mediaId,
            sortOrder: index,
            caption: mediaCaptionMap(formData)[mediaId] || null,
          })),
        },
      },
    });
    if (intent === "publish") {
      await tx.newsPost.update({
        where: { id: record.id },
        data: { published: true, publishedAt: new Date() },
      });
    }
    await tx.auditLog.create({
      data: auditData(
        actor.id,
        intent === "publish" ? "NEWS_PUBLISHED" : "NEWS_DRAFT_SAVED",
        "NewsPost",
        record.id,
        { revisionId: revision.id },
      ),
    });
    return record;
  });
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/staff/news");
  redirect("/staff/news?saved=" + post.id);
}

export async function withdrawNewsAction(formData: FormData) {
  const { user: actor } = await requirePermission("news.publish");
  const postId = value(formData, "postId");
  await prisma.$transaction([
    prisma.newsPost.update({ where: { id: postId }, data: { published: false } }),
    prisma.newsRevision.updateMany({
      where: { newsPostId: postId, status: "PUBLISHED" },
      data: { status: "SUPERSEDED" },
    }),
    prisma.auditLog.create({
      data: auditData(actor.id, "NEWS_WITHDRAWN", "NewsPost", postId),
    }),
  ]);
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/staff/news");
}

export async function deleteNewsAction(formData: FormData) {
  const { user: actor } = await requirePermission("news.delete");
  const postId = value(formData, "postId");
  const post = await prisma.newsPost.findUnique({
    where: { id: postId },
    select: {
      thumbnail: { select: { id: true, publicId: true, resourceType: true } },
      revisions: {
        select: {
          media: { select: { media: { select: { id: true, publicId: true, resourceType: true } } } },
        },
      },
    },
  });
  const assets = [
    ...(post?.thumbnail ? [post.thumbnail] : []),
    ...(post?.revisions.flatMap((revision) => revision.media.map((item) => item.media)) || []),
  ];
  await prisma.$transaction(async (tx) => {
    await tx.newsPost.delete({ where: { id: postId } });
    await tx.auditLog.create({ data: auditData(actor.id, "NEWS_DELETED", "NewsPost", postId) });
  });
  await cleanupUnusedMedia(assets);
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/staff/news");
}