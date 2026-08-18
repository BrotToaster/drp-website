"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/authz";
import { parseContentJson, plainTextFromContent } from "@/lib/content";
import { canAccessDocumentCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const value = (formData: FormData, key: string) => String(formData.get(key) || "").trim();

function slugify(input: string) {
  return input.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mediaData(formData: FormData) {
  let ids: string[] = [];
  let captions: Record<string, string> = {};
  try {
    const parsed = JSON.parse(value(formData, "mediaIds") || "[]");
    if (Array.isArray(parsed)) ids = parsed.filter((item): item is string => typeof item === "string");
  } catch {}
  try {
    const parsed = JSON.parse(value(formData, "mediaCaptions") || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) captions = parsed as Record<string, string>;
  } catch {}
  return { ids: Array.from(new Set(ids)), captions };
}

const documentSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  title: z.string().min(3).max(160),
  summary: z.string().max(500).optional(),
});

export async function saveInternalDocumentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult<{ navigateTo?: string }>> {
  try {
    const { user, authorization } = await requirePermission("documents.access");
    const content = parseContentJson(value(formData, "content"));
    const parsed = documentSchema.safeParse({
      id: value(formData, "id") || undefined,
      categoryId: value(formData, "categoryId"),
      title: value(formData, "title"),
      summary: value(formData, "summary") || undefined,
    });
    if (!parsed.success || !content || plainTextFromContent(content).length < 3) {
      return { ok: false, code: "VALIDATION", message: "Titel, Kategorie und Inhalt sind erforderlich." };
    }
    const existing = parsed.data.id ? await prisma.internalDocument.findUnique({ where: { id: parsed.data.id } }) : null;
    const ability = existing ? "canEdit" : "canCreate";
    const sourceCategory = existing?.categoryId || parsed.data.categoryId;
    if (!canAccessDocumentCategory(authorization, sourceCategory, ability) && !canAccessDocumentCategory(authorization, sourceCategory, "canManage")) {
      return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung für diese Dokumentkategorie." };
    }
    if (existing && existing.categoryId !== parsed.data.categoryId && !canAccessDocumentCategory(authorization, parsed.data.categoryId, "canCreate")) {
      return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung für die neue Dokumentkategorie." };
    }
    const media = mediaData(formData);
    const assets = await prisma.mediaAsset.findMany({ where: { id: { in: media.ids } }, select: { id: true, visibility: true } });
    if (assets.length !== media.ids.length || assets.some((asset) => asset.visibility !== "INTERNAL")) {
      return { ok: false, code: "VALIDATION", message: "Mindestens eine interne Datei ist ungültig." };
    }

    const saved = await prisma.$transaction(async (tx) => {
      const document = existing
        ? await tx.internalDocument.update({
            where: { id: existing.id },
            data: { categoryId: parsed.data.categoryId, title: parsed.data.title, summary: parsed.data.summary || null, archivedAt: null },
          })
        : await tx.internalDocument.create({
            data: {
              categoryId: parsed.data.categoryId,
              title: parsed.data.title,
              summary: parsed.data.summary || null,
              slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
              creatorId: user.id,
            },
          });
      const latest = await tx.internalDocumentRevision.aggregate({ where: { documentId: document.id }, _max: { version: true } });
      const revision = await tx.internalDocumentRevision.create({
        data: {
          documentId: document.id,
          version: (latest._max.version || 0) + 1,
          content: content as Prisma.InputJsonValue,
          searchText: `${parsed.data.title} ${parsed.data.summary || ""} ${plainTextFromContent(content)}`.toLocaleLowerCase("de"),
          editorId: user.id,
          media: {
            create: media.ids.map((mediaId, index) => ({ mediaId, sortOrder: index, caption: String(media.captions[mediaId] || "").trim().slice(0, 240) || null })),
          },
        },
      });
      await tx.auditLog.create({
        data: { actorId: user.id, action: existing ? "INTERNAL_DOCUMENT_UPDATED" : "INTERNAL_DOCUMENT_CREATED", entityType: "InternalDocument", entityId: document.id, metadata: { revisionId: revision.id, version: revision.version } },
      });
      return document;
    });
    revalidatePath("/staff/dokumente");
    revalidatePath(`/staff/dokumente/${saved.slug}`);
    return { ok: true, message: existing ? "Dokument wurde aktualisiert." : "Dokument wurde erstellt.", data: existing ? undefined : { navigateTo: `/staff/dokumente/${saved.slug}` } };
  } catch {
    return { ok: false, code: "SERVER", message: "Das Dokument konnte nicht gespeichert werden." };
  }
}

export async function archiveInternalDocumentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user, authorization } = await requirePermission("documents.access");
    const id = value(formData, "id");
    const document = await prisma.internalDocument.findUnique({ where: { id } });
    if (!document) return { ok: false, code: "VALIDATION", message: "Dokument nicht gefunden." };
    if (!canAccessDocumentCategory(authorization, document.categoryId, "canManage")) return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung zum Archivieren." };
    const archived = formData.get("archived") === "true";
    await prisma.$transaction([
      prisma.internalDocument.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } }),
      prisma.auditLog.create({ data: { actorId: user.id, action: archived ? "INTERNAL_DOCUMENT_ARCHIVED" : "INTERNAL_DOCUMENT_RESTORED", entityType: "InternalDocument", entityId: id } }),
    ]);
    revalidatePath("/staff/dokumente");
    revalidatePath(`/staff/dokumente/${document.slug}`);
    return { ok: true, message: archived ? "Dokument wurde archiviert." : "Dokument wurde wiederhergestellt." };
  } catch {
    return { ok: false, code: "SERVER", message: "Der Dokumentstatus konnte nicht geändert werden." };
  }
}

export async function restoreDocumentRevisionAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user, authorization } = await requirePermission("documents.access");
    const revision = await prisma.internalDocumentRevision.findUnique({
      where: { id: value(formData, "revisionId") },
      include: { document: true, media: true },
    });
    if (!revision) return { ok: false, code: "VALIDATION", message: "Version nicht gefunden." };
    if (!canAccessDocumentCategory(authorization, revision.document.categoryId, "canEdit") && !canAccessDocumentCategory(authorization, revision.document.categoryId, "canManage")) {
      return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung zum Wiederherstellen." };
    }
    await prisma.$transaction(async (tx) => {
      const latest = await tx.internalDocumentRevision.aggregate({ where: { documentId: revision.documentId }, _max: { version: true } });
      const restored = await tx.internalDocumentRevision.create({
        data: {
          documentId: revision.documentId,
          version: (latest._max.version || 0) + 1,
          content: revision.content as Prisma.InputJsonValue,
          searchText: revision.searchText,
          editorId: user.id,
          media: { create: revision.media.map((item) => ({ mediaId: item.mediaId, sortOrder: item.sortOrder, caption: item.caption })) },
        },
      });
      await tx.auditLog.create({ data: { actorId: user.id, action: "INTERNAL_DOCUMENT_REVISION_RESTORED", entityType: "InternalDocument", entityId: revision.documentId, metadata: { fromVersion: revision.version, newVersion: restored.version } } });
    });
    revalidatePath(`/staff/dokumente/${revision.document.slug}`);
    return { ok: true, message: `Version ${revision.version} wurde als neue Version wiederhergestellt.` };
  } catch {
    return { ok: false, code: "SERVER", message: "Die Version konnte nicht wiederhergestellt werden." };
  }
}

const categorySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(100),
  description: z.string().max(400).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  visible: z.boolean(),
});

export async function saveDocumentCategoryAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("documents.manage_categories");
    const parsed = categorySchema.safeParse({ id: value(formData, "id") || undefined, title: value(formData, "title"), description: value(formData, "description") || undefined, sortOrder: value(formData, "sortOrder"), visible: formData.get("visible") === "on" });
    if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Bitte prüfe die Kategorieangaben." };
    const { id, description, ...data } = parsed.data;
    const category = id
      ? await prisma.internalDocumentCategory.update({ where: { id }, data: { ...data, description: description || null } })
      : await prisma.internalDocumentCategory.create({ data: { ...data, description: description || null, slug: `${slugify(data.title)}-${Date.now().toString(36)}` } });
    await prisma.auditLog.create({ data: { actorId: user.id, action: id ? "DOCUMENT_CATEGORY_UPDATED" : "DOCUMENT_CATEGORY_CREATED", entityType: "InternalDocumentCategory", entityId: category.id } });
    revalidatePath("/admin/dokumente");
    revalidatePath("/staff/dokumente");
    return { ok: true, message: "Dokumentkategorie wurde gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Dokumentkategorie konnte nicht gespeichert werden." };
  }
}

export async function saveDocumentCategoryAccessAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("documents.manage_categories");
    const roleId = value(formData, "roleId");
    const categoryId = value(formData, "categoryId");
    if (!roleId || !categoryId) return { ok: false, code: "VALIDATION", message: "Rolle oder Kategorie fehlt." };
    await prisma.$transaction([
      prisma.roleDocumentCategoryAccess.upsert({
        where: { roleId_categoryId: { roleId, categoryId } },
        update: { canView: formData.get("canView") === "on", canCreate: formData.get("canCreate") === "on", canEdit: formData.get("canEdit") === "on", canManage: formData.get("canManage") === "on" },
        create: { roleId, categoryId, canView: formData.get("canView") === "on", canCreate: formData.get("canCreate") === "on", canEdit: formData.get("canEdit") === "on", canManage: formData.get("canManage") === "on" },
      }),
      prisma.auditLog.create({ data: { actorId: user.id, action: "DOCUMENT_CATEGORY_ACCESS_UPDATED", entityType: "InternalDocumentCategory", entityId: categoryId, metadata: { roleId } } }),
    ]);
    revalidatePath("/admin/dokumente");
    return { ok: true, message: "Dokumentzugriff wurde gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Dokumentzugriff konnte nicht gespeichert werden." };
  }
}
