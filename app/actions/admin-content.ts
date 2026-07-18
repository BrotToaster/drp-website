"use server";

import type { Prisma, ServiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { legalDetailsComplete, legalSettingsSchema, retentionSettingsSchema } from "@/lib/legal-settings";
import { prisma } from "@/lib/prisma";

const text = (formData: FormData, key: string) => String(formData.get(key) || "").trim();

export async function saveLegalSettingsAction(formData: FormData) {
  const { user } = await requirePermission("legal.manage");
  const legal = legalSettingsSchema.safeParse({
    imprintEnabled: formData.get("imprintEnabled") === "on",
    privacyPublished: formData.get("privacyPublished") === "on",
    operatorName: text(formData, "operatorName"),
    addressLine: text(formData, "addressLine"),
    postalCode: text(formData, "postalCode"),
    city: text(formData, "city"),
    country: text(formData, "country") || "Schweiz",
    contactEmail: text(formData, "contactEmail"),
    donations: text(formData, "donations") || "NONE",
    lastReviewedAt: new Date().toISOString(),
    noAgeVerificationAcknowledged: formData.get("noAgeVerificationAcknowledged") === "on",
  });
  const retention = retentionSettingsSchema.safeParse({
    closedTicketDays: Number(text(formData, "closedTicketDays")),
    auditLogDays: Number(text(formData, "auditLogDays")),
    discordSnapshotDays: Number(text(formData, "discordSnapshotDays")),
  });
  if (!legal.success || !retention.success) redirect("/admin/rechtliches?error=invalid");
  if (legal.data.privacyPublished && !legalDetailsComplete(legal.data)) {
    redirect("/admin/rechtliches?error=incomplete");
  }

  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: "legal.settings" },
      update: { value: legal.data as Prisma.InputJsonValue },
      create: { key: "legal.settings", value: legal.data as Prisma.InputJsonValue },
    }),
    prisma.siteSetting.upsert({
      where: { key: "retention.settings" },
      update: { value: retention.data as Prisma.InputJsonValue },
      create: { key: "retention.settings", value: retention.data as Prisma.InputJsonValue },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "LEGAL_SETTINGS_UPDATED",
        entityType: "SiteSetting",
        entityId: "legal.settings",
        metadata: {
          imprintEnabled: legal.data.imprintEnabled,
          privacyPublished: legal.data.privacyPublished,
          retention: retention.data,
        },
      },
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/impressum");
  revalidatePath("/datenschutz");
  revalidatePath("/admin/rechtliches");
  redirect("/admin/rechtliches?saved=1");
}

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  enabled: z.boolean(),
});

export async function saveStatusServiceAction(formData: FormData) {
  const { user } = await requirePermission("status.manage");
  const parsed = serviceSchema.safeParse({
    id: text(formData, "id") || undefined,
    name: text(formData, "name"),
    description: text(formData, "description") || undefined,
    sortOrder: text(formData, "sortOrder"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) redirect("/admin/status?error=invalid");
  const existing = parsed.data.id ? await prisma.statusService.findUnique({ where: { id: parsed.data.id } }) : null;
  const service = existing
    ? await prisma.statusService.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description || null,
          sortOrder: parsed.data.sortOrder,
          enabled: parsed.data.enabled,
        },
      })
    : await prisma.statusService.create({
        data: {
          key: "manual-" + Date.now().toString(36),
          source: "MANUAL",
          name: parsed.data.name,
          description: parsed.data.description || null,
          sortOrder: parsed.data.sortOrder,
          enabled: parsed.data.enabled,
          manualStatus: "OPERATIONAL",
          lastStatus: "OPERATIONAL",
          lastCheckedAt: new Date(),
        },
      });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: existing ? "STATUS_SERVICE_UPDATED" : "STATUS_SERVICE_CREATED",
      entityType: "StatusService",
      entityId: service.id,
    },
  });
  revalidatePath("/status");
  revalidatePath("/api/status");
  revalidatePath("/admin/status");
  redirect("/admin/status?saved=service");
}

const statusUpdateSchema = z.object({
  serviceId: z.string().min(1),
  status: z.enum(["OPERATIONAL", "DEGRADED", "PARTIAL_OUTAGE", "MAJOR_OUTAGE", "MAINTENANCE", "UNKNOWN"]),
  message: z.string().max(1000).optional(),
});

export async function updateManualStatusAction(formData: FormData) {
  const { user } = await requirePermission("status.manage");
  const parsed = statusUpdateSchema.safeParse({
    serviceId: text(formData, "serviceId"),
    status: text(formData, "status"),
    message: text(formData, "message") || undefined,
  });
  if (!parsed.success) redirect("/admin/status?error=invalid");
  if (parsed.data.status !== "OPERATIONAL" && (parsed.data.message?.length || 0) < 5) {
    redirect("/admin/status?error=message");
  }
  const service = await prisma.statusService.findUnique({ where: { id: parsed.data.serviceId } });
  if (!service || service.source !== "MANUAL") redirect("/admin/status?error=service");

  await prisma.$transaction([
    prisma.statusService.update({
      where: { id: service.id },
      data: {
        manualStatus: parsed.data.status as ServiceStatus,
        lastStatus: parsed.data.status as ServiceStatus,
        lastMessage: parsed.data.message || null,
        lastCheckedAt: new Date(),
      },
    }),
    prisma.statusUpdate.create({
      data: {
        serviceId: service.id,
        status: parsed.data.status as ServiceStatus,
        message: parsed.data.message || null,
        authorId: user.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "STATUS_CHANGED",
        entityType: "StatusService",
        entityId: service.id,
        metadata: { from: service.manualStatus, to: parsed.data.status, message: parsed.data.message },
      },
    }),
  ]);
  revalidatePath("/status");
  revalidatePath("/api/status");
  revalidatePath("/admin/status");
  redirect("/admin/status?saved=status");
}

export async function deleteStatusServiceAction(formData: FormData) {
  const { user } = await requirePermission("status.manage");
  const id = text(formData, "id");
  const service = await prisma.statusService.findUnique({ where: { id } });
  if (!service || service.source !== "MANUAL") redirect("/admin/status?error=fixed");
  await prisma.$transaction([
    prisma.auditLog.create({ data: { actorId: user.id, action: "STATUS_SERVICE_DELETED", entityType: "StatusService", entityId: id, metadata: { name: service.name } } }),
    prisma.statusService.delete({ where: { id } }),
  ]);
  revalidatePath("/status");
  revalidatePath("/api/status");
  revalidatePath("/admin/status");
}
