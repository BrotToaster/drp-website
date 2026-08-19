"use server";

import type { InternalDocumentSourceType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/authz";
import { parseContentJson, plainTextFromContent } from "@/lib/content";
import { canAccessDocumentCategory, canViewInternalDocument } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createCloudinaryPrivateDownloadUrl } from "@/lib/cloudinary";
import {
  contentText,
  internalDocumentPresets,
  parseDocumentHtml,
  parseDocx,
  parseWorkbook,
  sourceChecksum,
  splitTeamRulebook,
  workbookText,
  type WorkbookSnapshot,
} from "@/lib/internal-document-import";

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
    const existing = parsed.data.id ? await prisma.internalDocument.findUnique({ where: { id: parsed.data.id }, include: { roleAccess: true } }) : null;
    if (existing && !canViewInternalDocument(authorization, existing)) {
      return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung für dieses Dokument." };
    }
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
      const [latest, latestRevision] = await Promise.all([
        tx.internalDocumentRevision.aggregate({ where: { documentId: document.id }, _max: { version: true } }),
        existing
          ? tx.internalDocumentRevision.findFirst({ where: { documentId: document.id }, orderBy: { version: "desc" }, select: { structuredData: true, searchText: true } })
          : Promise.resolve(null),
      ]);
      const revision = await tx.internalDocumentRevision.create({
        data: {
          documentId: document.id,
          version: (latest._max.version || 0) + 1,
          content: content as Prisma.InputJsonValue,
          structuredData: latestRevision?.structuredData ?? undefined,
          searchText: `${parsed.data.title} ${parsed.data.summary || ""} ${plainTextFromContent(content)} ${latestRevision?.structuredData ? latestRevision.searchText : ""}`.toLocaleLowerCase("de"),
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
    const document = await prisma.internalDocument.findUnique({ where: { id }, include: { roleAccess: true } });
    if (!document) return { ok: false, code: "VALIDATION", message: "Dokument nicht gefunden." };
    if (!canViewInternalDocument(authorization, document)) return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung für dieses Dokument." };
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
      include: { document: { include: { roleAccess: true } }, media: true },
    });
    if (!revision) return { ok: false, code: "VALIDATION", message: "Version nicht gefunden." };
    if (!canViewInternalDocument(authorization, revision.document)) return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung für dieses Dokument." };
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
          structuredData: revision.structuredData ?? undefined,
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

export async function saveInternalDocumentAccessAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("documents.manage_categories");
    const documentId = value(formData, "documentId");
    const accessMode = value(formData, "accessMode") === "RESTRICTED" ? "RESTRICTED" : "CATEGORY";
    const roleIds = Array.from(new Set(formData.getAll("roleIds").map(String).filter(Boolean)));
    const [document, roleCount] = await Promise.all([
      prisma.internalDocument.findUnique({ where: { id: documentId }, select: { id: true, slug: true } }),
      prisma.accessRole.count({ where: { id: { in: roleIds }, key: { not: "OWNER" } } }),
    ]);
    if (!document || roleCount !== roleIds.length) return { ok: false, code: "VALIDATION", message: "Dokument oder Rollenfreigabe ist ungültig." };
    if (accessMode === "RESTRICTED" && !roleIds.length) {
      // Owner behält unabhängig von der Rollenmatrix immer Zugriff.
    }
    await prisma.$transaction(async (tx) => {
      await tx.internalDocument.update({ where: { id: document.id }, data: { accessMode } });
      await tx.internalDocumentRoleAccess.deleteMany({ where: { documentId: document.id } });
      if (accessMode === "RESTRICTED" && roleIds.length) {
        await tx.internalDocumentRoleAccess.createMany({ data: roleIds.map((roleId) => ({ documentId: document.id, roleId, canView: true })) });
      }
      await tx.auditLog.create({ data: { actorId: user.id, action: "INTERNAL_DOCUMENT_ACCESS_UPDATED", entityType: "InternalDocument", entityId: document.id, metadata: { accessMode, roleIds } } });
    });
    revalidatePath("/admin/dokumente");
    revalidatePath("/staff/dokumente");
    revalidatePath(`/staff/dokumente/${document.slug}`);
    return { ok: true, message: "Dokumentfreigaben wurden gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Dokumentfreigaben konnten nicht gespeichert werden." };
  }
}

async function storeImportedDocument(input: {
  actorId: string;
  categoryId: string;
  title: string;
  slug: string;
  summary: string;
  sourceType: InternalDocumentSourceType;
  sourceExternalId: string;
  sourceUrl?: string;
  content: NonNullable<ReturnType<typeof parseContentJson>>;
  structuredData?: WorkbookSnapshot | null;
  mediaId?: string;
}) {
  const checksum = sourceChecksum(input.content, input.structuredData);
  const existing = await prisma.internalDocument.findUnique({
    where: { sourceType_sourceExternalId: { sourceType: input.sourceType, sourceExternalId: input.sourceExternalId } },
    include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (existing?.sourceChecksum === checksum) {
    await prisma.internalDocument.update({
      where: { id: existing.id },
      data: { sourceImportedAt: new Date(), sourceImportStatus: "SUCCEEDED", sourceImportError: null },
    });
    return { document: existing, changed: false };
  }

  const saved = await prisma.$transaction(async (tx) => {
    const document = await tx.internalDocument.upsert({
      where: { sourceType_sourceExternalId: { sourceType: input.sourceType, sourceExternalId: input.sourceExternalId } },
      update: {
        categoryId: input.categoryId,
        title: input.title,
        summary: input.summary,
        sourceUrl: input.sourceUrl || null,
        sourceChecksum: checksum,
        sourceImportedAt: new Date(),
        sourceImportStatus: "SUCCEEDED",
        sourceImportError: null,
        archivedAt: null,
      },
      create: {
        categoryId: input.categoryId,
        title: input.title,
        summary: input.summary,
        slug: input.slug,
        creatorId: input.actorId,
        accessMode: "RESTRICTED",
        sourceType: input.sourceType,
        sourceExternalId: input.sourceExternalId,
        sourceUrl: input.sourceUrl || null,
        sourceChecksum: checksum,
        sourceImportedAt: new Date(),
        sourceImportStatus: "SUCCEEDED",
      },
    });
    const latest = await tx.internalDocumentRevision.aggregate({ where: { documentId: document.id }, _max: { version: true } });
    const revision = await tx.internalDocumentRevision.create({
      data: {
        documentId: document.id,
        version: (latest._max.version || 0) + 1,
        content: input.content as Prisma.InputJsonValue,
        structuredData: input.structuredData ? input.structuredData as unknown as Prisma.InputJsonValue : undefined,
        searchText: `${input.title} ${input.summary} ${contentText(input.content)} ${workbookText(input.structuredData || null)}`.toLocaleLowerCase("de"),
        editorId: input.actorId,
        ...(input.mediaId ? { media: { create: [{ mediaId: input.mediaId, sortOrder: 0, caption: "Importierte Originaldatei" }] } } : {}),
      },
    });
    await tx.auditLog.create({ data: { actorId: input.actorId, action: existing ? "INTERNAL_DOCUMENT_REIMPORTED" : "INTERNAL_DOCUMENT_IMPORTED", entityType: "InternalDocument", entityId: document.id, metadata: { sourceType: input.sourceType, sourceExternalId: input.sourceExternalId, revisionId: revision.id, checksum } } });
    return document;
  });
  return { document: saved, changed: true };
}

async function fetchImportSource(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Google antwortete mit HTTP ${response.status}.`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 25_000_000) throw new Error("Die Quelldatei ist größer als 25 MB.");
  return buffer;
}

export async function importInternalDocumentPresetAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const presetKey = value(formData, "presetKey");
  const categoryId = value(formData, "categoryId");
  const preset = internalDocumentPresets.find((item) => item.key === presetKey);
  try {
    const { user } = await requirePermission("documents.manage_categories");
    if (!preset || !categoryId || !(await prisma.internalDocumentCategory.count({ where: { id: categoryId } }))) {
      return { ok: false, code: "VALIDATION", message: "Importquelle oder Kategorie ist ungültig." };
    }
    if (preset.type === "UPLOAD_DOCX" || preset.type === "UPLOAD_XLSX") {
      return { ok: false, code: "VALIDATION", message: "Diese Quelle muss über eine hochgeladene Datei importiert werden." };
    }
    if (preset.type === "GOOGLE_SHEETS") {
      const buffer = await fetchImportSource(`https://docs.google.com/spreadsheets/d/${preset.externalId}/export?format=xlsx`);
      const structuredData = await parseWorkbook(buffer);
      const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${preset.title} wurde als geschützte Tabellenkopie importiert.` }] }] } as NonNullable<ReturnType<typeof parseContentJson>>;
      const result = await storeImportedDocument({ actorId: user.id, categoryId, title: preset.title, slug: preset.key, summary: "Geschützte, versionierte Kopie der Google-Tabelle.", sourceType: preset.type, sourceExternalId: preset.externalId, sourceUrl: preset.url, content, structuredData });
      revalidatePath("/admin/dokumente"); revalidatePath("/staff/dokumente");
      return { ok: true, message: result.changed ? `${preset.title} wurde importiert.` : `${preset.title} ist bereits aktuell.` };
    }
    const html = (await fetchImportSource(`https://docs.google.com/document/d/${preset.externalId}/export?format=html`)).toString("utf8");
    const parsed = parseDocumentHtml(html) as NonNullable<ReturnType<typeof parseContentJson>>;
    if ("splitProtocols" in preset && preset.splitProtocols) {
      const split = splitTeamRulebook(parsed);
      const main = await storeImportedDocument({ actorId: user.id, categoryId, title: preset.title, slug: preset.key, summary: "Vertrauliches Regelwerk für das DRP-Team.", sourceType: preset.type, sourceExternalId: preset.externalId, sourceUrl: preset.url, content: split.main as NonNullable<ReturnType<typeof parseContentJson>> });
      for (const protocol of split.protocols) {
        await storeImportedDocument({ actorId: user.id, categoryId, title: protocol.title, slug: protocol.slug, summary: "Aus dem Team-Regelwerk ausgelagertes internes Protokoll.", sourceType: preset.type, sourceExternalId: `${preset.externalId}:${protocol.slug}`, sourceUrl: preset.url, content: protocol.content as NonNullable<ReturnType<typeof parseContentJson>> });
      }
      revalidatePath("/admin/dokumente"); revalidatePath("/staff/dokumente");
      return { ok: true, message: split.protocols.length ? "Team-Regelwerk und fünf Protokolle wurden importiert." : main.changed ? "Team-Regelwerk wurde importiert; die Protokollabschnitte konnten nicht sicher getrennt werden." : "Team-Regelwerk ist bereits aktuell." };
    }
    const result = await storeImportedDocument({ actorId: user.id, categoryId, title: preset.title, slug: preset.key, summary: "Geschützte, versionierte Kopie des Google-Dokuments.", sourceType: preset.type, sourceExternalId: preset.externalId, sourceUrl: preset.url, content: parsed });
    revalidatePath("/admin/dokumente"); revalidatePath("/staff/dokumente");
    return { ok: true, message: result.changed ? `${preset.title} wurde importiert.` : `${preset.title} ist bereits aktuell.` };
  } catch (error) {
    if (preset) {
      await prisma.internalDocument.updateMany({ where: { sourceExternalId: preset.externalId }, data: { sourceImportStatus: "FAILED", sourceImportError: error instanceof Error ? error.message.slice(0, 500) : "Import fehlgeschlagen." } }).catch(() => undefined);
    }
    return { ok: false, code: "SERVER", message: error instanceof Error ? `Import fehlgeschlagen: ${error.message}` : "Import fehlgeschlagen." };
  }
}

export async function importUploadedInternalDocumentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const presetKey = value(formData, "presetKey");
  const categoryId = value(formData, "categoryId");
  const mediaId = value(formData, "sourceMediaId");
  const preset = internalDocumentPresets.find((item) => item.key === presetKey && (item.type === "UPLOAD_DOCX" || item.type === "UPLOAD_XLSX"));
  try {
    const { user } = await requirePermission("documents.manage_categories");
    const asset = mediaId ? await prisma.mediaAsset.findUnique({ where: { id: mediaId } }) : null;
    if (!preset || !categoryId || !asset || asset.visibility !== "INTERNAL" || asset.kind !== "DOCUMENT") return { ok: false, code: "VALIDATION", message: "Bitte lade die passende interne Quelldatei hoch." };
    const expected = preset.type === "UPLOAD_XLSX" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (asset.mimeType !== expected) return { ok: false, code: "VALIDATION", message: preset.type === "UPLOAD_XLSX" ? "Für diese Quelle wird eine XLSX-Datei benötigt." : "Für diese Quelle wird eine DOCX-Datei benötigt." };
    const response = await fetch(createCloudinaryPrivateDownloadUrl(asset.publicId, asset.resourceType), { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("Die hochgeladene Quelldatei konnte nicht geladen werden.");
    const buffer = Buffer.from(await response.arrayBuffer());
    const structuredData = preset.type === "UPLOAD_XLSX" ? await parseWorkbook(buffer) : null;
    const content = preset.type === "UPLOAD_DOCX"
      ? await parseDocx(buffer) as NonNullable<ReturnType<typeof parseContentJson>>
      : { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${preset.title} wurde als geschützte Tabellenkopie importiert.` }] }] } as NonNullable<ReturnType<typeof parseContentJson>>;
    const result = await storeImportedDocument({ actorId: user.id, categoryId, title: preset.title, slug: preset.key, summary: "Geschützte, versionierte Kopie einer hochgeladenen Quelldatei.", sourceType: preset.type, sourceExternalId: preset.externalId, sourceUrl: preset.url, content, structuredData, mediaId: asset.id });
    revalidatePath("/admin/dokumente"); revalidatePath("/staff/dokumente");
    return { ok: true, message: result.changed ? `${preset.title} wurde importiert.` : `${preset.title} ist bereits aktuell.` };
  } catch (error) {
    return { ok: false, code: "SERVER", message: error instanceof Error ? `Dateiimport fehlgeschlagen: ${error.message}` : "Dateiimport fehlgeschlagen." };
  }
}
