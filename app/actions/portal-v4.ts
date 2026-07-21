"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/authz";
import { refreshErlcTelemetry } from "@/lib/erlc-telemetry";
import { prisma } from "@/lib/prisma";

const value = (formData: FormData, key: string) => String(formData.get(key) || "").trim();
const optionalUrl = z.union([z.literal(""), z.string().url().refine((url) => url.startsWith("https://"), "Nur HTTPS ist erlaubt.")]);

const staffFaqSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  question: z.string().min(5).max(240),
  answer: z.string().min(10).max(6000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  visible: z.boolean(),
});

export async function saveStaffFaqAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("staff_faq.manage");
    const parsed = staffFaqSchema.safeParse({
      id: value(formData, "id") || undefined,
      categoryId: value(formData, "categoryId"),
      question: value(formData, "question"),
      answer: value(formData, "answer"),
      sortOrder: value(formData, "sortOrder"),
      visible: formData.get("visible") === "on",
    });
    if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Bitte prüfe Frage, Antwort und Kategorie." };
    const { id, ...data } = parsed.data;
    await prisma.$transaction(async (tx) => {
      const item = id
        ? await tx.staffFaqItem.update({ where: { id }, data: { ...data, searchText: `${data.question} ${data.answer}`.toLocaleLowerCase("de"), editorId: user.id } })
        : await tx.staffFaqItem.create({ data: { ...data, searchText: `${data.question} ${data.answer}`.toLocaleLowerCase("de"), editorId: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, action: id ? "STAFF_FAQ_UPDATED" : "STAFF_FAQ_CREATED", entityType: "StaffFaqItem", entityId: item.id } });
    });
    revalidatePath("/staff/handbuch");
    revalidatePath("/admin/staff-faq");
    return { ok: true, message: "Staff-FAQ wurde gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Staff-FAQ konnte nicht gespeichert werden." };
  }
}

export async function deleteStaffFaqAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("staff_faq.manage");
    const id = value(formData, "id");
    if (!id) return { ok: false, code: "VALIDATION", message: "Eintrag fehlt." };
    await prisma.$transaction([
      prisma.staffFaqItem.delete({ where: { id } }),
      prisma.auditLog.create({ data: { actorId: user.id, action: "STAFF_FAQ_DELETED", entityType: "StaffFaqItem", entityId: id } }),
    ]);
    revalidatePath("/staff/handbuch");
    revalidatePath("/admin/staff-faq");
    return { ok: true, message: "Eintrag wurde gelöscht." };
  } catch {
    return { ok: false, code: "SERVER", message: "Eintrag konnte nicht gelöscht werden." };
  }
}

const roleCardSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2).max(24),
  title: z.string().min(2).max(100),
  description: z.string().min(10).max(800),
  imageId: z.string().optional(),
  targetUrl: optionalUrl,
  linkLabel: z.string().max(50).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  visible: z.boolean(),
});

export async function saveHomepageRoleCardAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("site.manage");
    const parsed = roleCardSchema.safeParse({
      id: value(formData, "id") || undefined,
      code: value(formData, "code"),
      title: value(formData, "title"),
      description: value(formData, "description"),
      imageId: value(formData, "imageId") || undefined,
      targetUrl: value(formData, "targetUrl"),
      linkLabel: value(formData, "linkLabel") || undefined,
      sortOrder: value(formData, "sortOrder"),
      visible: formData.get("visible") === "on",
    });
    if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Bitte prüfe alle Kartenfelder. Links müssen HTTPS verwenden." };
    if (parsed.data.imageId) {
      const image = await prisma.mediaAsset.findUnique({ where: { id: parsed.data.imageId }, select: { kind: true } });
      if (image?.kind !== "IMAGE") return { ok: false, code: "VALIDATION", message: "Als Kartenmedium ist nur ein Bild erlaubt." };
    }
    const { id, targetUrl, imageId, linkLabel, ...data } = parsed.data;
    await prisma.$transaction(async (tx) => {
      const card = id
        ? await tx.homepageRoleCard.update({ where: { id }, data: { ...data, targetUrl: targetUrl || null, imageId: imageId || null, linkLabel: linkLabel || null, editorId: user.id } })
        : await tx.homepageRoleCard.create({ data: { ...data, targetUrl: targetUrl || null, imageId: imageId || null, linkLabel: linkLabel || null, editorId: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, action: id ? "HOMEPAGE_ROLE_CARD_UPDATED" : "HOMEPAGE_ROLE_CARD_CREATED", entityType: "HomepageRoleCard", entityId: card.id } });
    });
    revalidatePath("/");
    revalidatePath("/admin/website");
    return { ok: true, message: "Rollenkarte wurde gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Rollenkarte konnte nicht gespeichert werden." };
  }
}

export async function deleteHomepageRoleCardAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("site.manage");
    const id = value(formData, "id");
    await prisma.$transaction([
      prisma.homepageRoleCard.delete({ where: { id } }),
      prisma.auditLog.create({ data: { actorId: user.id, action: "HOMEPAGE_ROLE_CARD_DELETED", entityType: "HomepageRoleCard", entityId: id } }),
    ]);
    revalidatePath("/");
    revalidatePath("/admin/website");
    return { ok: true, message: "Rollenkarte wurde gelöscht." };
  } catch {
    return { ok: false, code: "SERVER", message: "Rollenkarte konnte nicht gelöscht werden." };
  }
}

export async function checkErlcAction(_previous: ActionResult, _formData: FormData): Promise<ActionResult> {
  void _previous;
  void _formData;
  try {
    const { user } = await requirePermission("erlc.check");
    const result = await refreshErlcTelemetry();
    if (result.busy) return { ok: false, code: "CONFLICT", message: "Eine ER:LC-Prüfung läuft bereits. Bitte warte kurz." };
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "ERLC_MANUAL_CHECK", entityType: "ErlcServerState", entityId: "primary", metadata: { ok: result.ok, players: result.state?.currentPlayers } },
    });
    revalidatePath("/staff");
    revalidatePath("/");
    revalidatePath("/status");
    return result.ok
      ? { ok: true, message: `ER:LC wurde geprüft: ${result.state?.currentPlayers ?? 0} Spieler online.` }
      : { ok: false, code: "SERVER", message: result.error || "ER:LC konnte nicht geprüft werden." };
  } catch {
    return { ok: false, code: "SERVER", message: "Die ER:LC-Prüfung ist fehlgeschlagen." };
  }
}

export async function savePublicLinksAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("site.manage");
    const parsed = z.object({
      discordUrl: z.string().url().refine((url) => url.startsWith("https://")),
      robloxUrl: z.string().url().refine((url) => url.startsWith("https://")),
    }).safeParse({ discordUrl: value(formData, "discordUrl"), robloxUrl: value(formData, "robloxUrl") });
    if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Bitte gib zwei gültige HTTPS-Links ein." };
    await prisma.$transaction([
      prisma.siteSetting.upsert({ where: { key: "public.links" }, update: { value: parsed.data }, create: { key: "public.links", value: parsed.data } }),
      prisma.auditLog.create({ data: { actorId: user.id, action: "PUBLIC_LINKS_UPDATED", entityType: "SiteSetting", entityId: "public.links" } }),
    ]);
    revalidatePath("/");
    revalidatePath("/admin/website");
    return { ok: true, message: "Öffentliche Links wurden gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Links konnten nicht gespeichert werden." };
  }
}
