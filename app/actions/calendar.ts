"use server";

import type { CalendarEventStatus, Prisma, RecurrenceFrequency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/authz";
import { localDateTimeToUtc } from "@/lib/calendar";
import { parseContentJson, plainTextFromContent } from "@/lib/content";
import { canAccessCalendarCategory } from "@/lib/permissions";
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

const eventSchema = z.object({
  eventId: z.string().optional(),
  categoryId: z.string().min(1),
  title: z.string().min(3).max(160),
  summary: z.string().max(500).optional(),
  location: z.string().max(180).optional(),
  externalUrl: z.union([z.literal(""), z.string().url().refine((url) => url.startsWith("https://"))]),
  recurrenceFrequency: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]),
  recurrenceInterval: z.coerce.number().int().min(1).max(52),
  allDay: z.boolean(),
});

function revalidateCalendar(slug?: string) {
  revalidatePath("/kalender");
  revalidatePath("/staff/kalender");
  revalidatePath("/admin/kalender");
  if (slug) revalidatePath(`/kalender/${slug}`);
}

export async function saveCalendarEventAction(_previous: ActionResult, formData: FormData): Promise<ActionResult<{ navigateTo?: string }>> {
  try {
    const { user, authorization } = await requirePermission("staff.access");
    const content = parseContentJson(value(formData, "content"));
    const parsed = eventSchema.safeParse({
      eventId: value(formData, "eventId") || undefined,
      categoryId: value(formData, "categoryId"),
      title: value(formData, "title"),
      summary: value(formData, "summary") || undefined,
      location: value(formData, "location") || undefined,
      externalUrl: value(formData, "externalUrl"),
      recurrenceFrequency: value(formData, "recurrenceFrequency") || "NONE",
      recurrenceInterval: value(formData, "recurrenceInterval") || "1",
      allDay: formData.get("allDay") === "on",
    });
    const startsAt = localDateTimeToUtc(value(formData, "startsAt"));
    const endsAt = localDateTimeToUtc(value(formData, "endsAt"));
    const recurrenceUntil = value(formData, "recurrenceUntil") ? localDateTimeToUtc(value(formData, "recurrenceUntil")) : null;
    if (!parsed.success || !content || plainTextFromContent(content).length < 3 || !startsAt || !endsAt || endsAt <= startsAt) {
      return { ok: false, code: "VALIDATION", message: "Bitte prüfe Titel, Inhalt sowie Start- und Endzeit." };
    }
    if (recurrenceUntil && recurrenceUntil < startsAt) return { ok: false, code: "VALIDATION", message: "Das Ende der Wiederholung muss nach dem ersten Termin liegen." };
    const existing = parsed.data.eventId ? await prisma.calendarEvent.findUnique({ where: { id: parsed.data.eventId } }) : null;
    const ownsEvent = existing?.creatorId === user.id;
    const canCreate = canAccessCalendarCategory(authorization, parsed.data.categoryId, "canCreate");
    const canManage = canAccessCalendarCategory(authorization, parsed.data.categoryId, "canManage");
    const canEditOwn = ownsEvent && canAccessCalendarCategory(authorization, existing!.categoryId, "canEditOwn");
    if (existing ? !canManage && !canEditOwn : !canCreate && !canManage) {
      return { ok: false, code: "FORBIDDEN", message: "Du darfst in dieser Kategorie keine Termine speichern." };
    }
    if (existing && existing.categoryId !== parsed.data.categoryId && !canCreate && !canManage) {
      return { ok: false, code: "FORBIDDEN", message: "Du darfst den Termin nicht in diese Kategorie verschieben." };
    }

    const intent = value(formData, "intent");
    const canPublish = canManage || canAccessCalendarCategory(authorization, parsed.data.categoryId, "canPublish");
    const status: CalendarEventStatus = intent === "publish" && canPublish ? "PUBLISHED" : intent === "draft" ? "DRAFT" : "PENDING_REVIEW";
    const media = mediaData(formData);
    const coverImageId = value(formData, "coverImageId") || null;
    const assetIds = Array.from(new Set([...media.ids, ...(coverImageId ? [coverImageId] : [])]));
    const assets = await prisma.mediaAsset.findMany({ where: { id: { in: assetIds }, visibility: "PUBLIC" }, select: { id: true, kind: true } });
    if (assets.length !== assetIds.length || (coverImageId && assets.find((asset) => asset.id === coverImageId)?.kind !== "IMAGE")) {
      return { ok: false, code: "VALIDATION", message: "Mindestens eine Mediendatei ist ungültig." };
    }

    const saved = await prisma.$transaction(async (tx) => {
      const event = existing
        ? await tx.calendarEvent.update({ where: { id: existing.id }, data: { categoryId: parsed.data.categoryId, archivedAt: null } })
        : await tx.calendarEvent.create({ data: { categoryId: parsed.data.categoryId, creatorId: user.id, slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}` } });
      if (status === "PUBLISHED") {
        await tx.calendarEventRevision.updateMany({ where: { eventId: event.id, status: "PUBLISHED" }, data: { status: "ARCHIVED" } });
      }
      const revision = await tx.calendarEventRevision.create({
        data: {
          eventId: event.id,
          status,
          title: parsed.data.title,
          summary: parsed.data.summary || null,
          content: content as Prisma.InputJsonValue,
          searchText: `${parsed.data.title} ${parsed.data.summary || ""} ${plainTextFromContent(content)}`.toLocaleLowerCase("de"),
          location: parsed.data.location || null,
          externalUrl: parsed.data.externalUrl || null,
          coverImageId,
          startsAt,
          endsAt,
          allDay: parsed.data.allDay,
          timeZone: "Europe/Berlin",
          recurrenceFrequency: parsed.data.recurrenceFrequency as RecurrenceFrequency,
          recurrenceInterval: parsed.data.recurrenceInterval,
          recurrenceUntil,
          editorId: user.id,
          reviewerId: status === "PUBLISHED" ? user.id : null,
          reviewedAt: status === "PUBLISHED" ? new Date() : null,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          media: { create: media.ids.map((mediaId, sortOrder) => ({ mediaId, sortOrder, caption: String(media.captions[mediaId] || "").trim().slice(0, 240) || null })) },
        },
      });
      await tx.auditLog.create({ data: { actorId: user.id, action: status === "PUBLISHED" ? "CALENDAR_EVENT_PUBLISHED" : status === "PENDING_REVIEW" ? "CALENDAR_EVENT_SUBMITTED" : "CALENDAR_EVENT_DRAFTED", entityType: "CalendarEvent", entityId: event.id, metadata: { revisionId: revision.id, categoryId: parsed.data.categoryId } } });
      return event;
    });
    revalidateCalendar(saved.slug);
    const message = status === "PUBLISHED" ? "Termin wurde veröffentlicht." : status === "PENDING_REVIEW" ? "Termin wurde zur Prüfung eingereicht." : "Entwurf wurde gespeichert.";
    return { ok: true, message, data: existing ? undefined : { navigateTo: "/staff/kalender" } };
  } catch {
    return { ok: false, code: "SERVER", message: "Der Termin konnte nicht gespeichert werden." };
  }
}

export async function reviewCalendarEventAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user, authorization } = await requirePermission("staff.access");
    const revision = await prisma.calendarEventRevision.findUnique({ where: { id: value(formData, "revisionId") }, include: { event: true } });
    if (!revision || revision.status !== "PENDING_REVIEW") return { ok: false, code: "CONFLICT", message: "Diese Version wartet nicht mehr auf eine Prüfung." };
    if (!canAccessCalendarCategory(authorization, revision.event.categoryId, "canPublish") && !canAccessCalendarCategory(authorization, revision.event.categoryId, "canManage")) {
      return { ok: false, code: "FORBIDDEN", message: "Du darfst diese Kategorie nicht freigeben." };
    }
    const approve = value(formData, "decision") === "approve";
    await prisma.$transaction(async (tx) => {
      if (approve) await tx.calendarEventRevision.updateMany({ where: { eventId: revision.eventId, status: "PUBLISHED" }, data: { status: "ARCHIVED" } });
      await tx.calendarEventRevision.update({ where: { id: revision.id }, data: { status: approve ? "PUBLISHED" : "ARCHIVED", reviewerId: user.id, reviewedAt: new Date(), publishedAt: approve ? new Date() : null } });
      await tx.auditLog.create({ data: { actorId: user.id, action: approve ? "CALENDAR_EVENT_APPROVED" : "CALENDAR_EVENT_REJECTED", entityType: "CalendarEvent", entityId: revision.eventId, metadata: { revisionId: revision.id, note: value(formData, "note").slice(0, 500) || null } } });
    });
    revalidateCalendar(revision.event.slug);
    return { ok: true, message: approve ? "Termin wurde freigegeben." : "Terminversion wurde abgelehnt und archiviert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Die Prüfung konnte nicht gespeichert werden." };
  }
}

export async function archiveCalendarEventAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user, authorization } = await requirePermission("staff.access");
    const event = await prisma.calendarEvent.findUnique({ where: { id: value(formData, "eventId") } });
    if (!event) return { ok: false, code: "VALIDATION", message: "Termin nicht gefunden." };
    if (!canAccessCalendarCategory(authorization, event.categoryId, "canManage")) return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung zum Archivieren." };
    const archived = formData.get("archived") === "true";
    await prisma.$transaction([
      prisma.calendarEvent.update({ where: { id: event.id }, data: { archivedAt: archived ? new Date() : null } }),
      prisma.auditLog.create({ data: { actorId: user.id, action: archived ? "CALENDAR_EVENT_ARCHIVED" : "CALENDAR_EVENT_RESTORED", entityType: "CalendarEvent", entityId: event.id } }),
    ]);
    revalidateCalendar(event.slug);
    return { ok: true, message: archived ? "Termin wurde archiviert." : "Termin wurde wiederhergestellt." };
  } catch {
    return { ok: false, code: "SERVER", message: "Der Terminstatus konnte nicht geändert werden." };
  }
}

const categorySchema = z.object({ id: z.string().optional(), title: z.string().min(2).max(100), description: z.string().max(400).optional(), color: z.string().regex(/^#[0-9a-f]{6}$/i), sortOrder: z.coerce.number().int().min(0).max(10000), visible: z.boolean(), imageId: z.string().optional() });

export async function saveCalendarCategoryAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("calendar.manage_categories");
    const parsed = categorySchema.safeParse({ id: value(formData, "id") || undefined, title: value(formData, "title"), description: value(formData, "description") || undefined, color: value(formData, "color") || "#d6aa4c", sortOrder: value(formData, "sortOrder") || "0", visible: formData.get("visible") === "on", imageId: value(formData, "imageId") || undefined });
    if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Bitte prüfe die Kategorieangaben und die Farbe." };
    if (parsed.data.imageId) {
      const image = await prisma.mediaAsset.findUnique({ where: { id: parsed.data.imageId } });
      if (image?.kind !== "IMAGE" || image.visibility !== "PUBLIC") return { ok: false, code: "VALIDATION", message: "Das Kategorienbild ist ungültig." };
    }
    const { id, description, imageId, ...data } = parsed.data;
    const category = id ? await prisma.calendarCategory.update({ where: { id }, data: { ...data, description: description || null, imageId: imageId || null } }) : await prisma.calendarCategory.create({ data: { ...data, description: description || null, imageId: imageId || null, slug: `${slugify(data.title)}-${Date.now().toString(36)}` } });
    await prisma.auditLog.create({ data: { actorId: user.id, action: id ? "CALENDAR_CATEGORY_UPDATED" : "CALENDAR_CATEGORY_CREATED", entityType: "CalendarCategory", entityId: category.id } });
    revalidateCalendar();
    return { ok: true, message: "Kalenderkategorie wurde gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Kalenderkategorie konnte nicht gespeichert werden." };
  }
}

export async function saveCalendarCategoryAccessAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("calendar.manage_categories");
    const roleId = value(formData, "roleId");
    const categoryId = value(formData, "categoryId");
    if (!roleId || !categoryId) return { ok: false, code: "VALIDATION", message: "Rolle oder Kategorie fehlt." };
    const data = { canCreate: formData.get("canCreate") === "on", canPublish: formData.get("canPublish") === "on", canEditOwn: formData.get("canEditOwn") === "on", canManage: formData.get("canManage") === "on" };
    await prisma.$transaction([
      prisma.roleCalendarCategoryAccess.upsert({ where: { roleId_categoryId: { roleId, categoryId } }, update: data, create: { roleId, categoryId, ...data } }),
      prisma.auditLog.create({ data: { actorId: user.id, action: "CALENDAR_CATEGORY_ACCESS_UPDATED", entityType: "CalendarCategory", entityId: categoryId, metadata: { roleId } } }),
    ]);
    revalidateCalendar();
    return { ok: true, message: "Kalenderzugriff wurde gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Kalenderzugriff konnte nicht gespeichert werden." };
  }
}
