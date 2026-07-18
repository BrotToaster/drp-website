import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const legalSettingsSchema = z.object({
  imprintEnabled: z.boolean().default(true),
  privacyPublished: z.boolean().default(false),
  operatorName: z.string().default(""),
  addressLine: z.string().default(""),
  postalCode: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default("Schweiz"),
  contactEmail: z.string().default(""),
  donations: z.enum(["NONE", "VOLUNTARY"]).default("NONE"),
  lastReviewedAt: z.string().nullable().default(null),
  noAgeVerificationAcknowledged: z.boolean().default(true),
});

export const retentionSettingsSchema = z.object({
  closedTicketDays: z.number().int().min(30).max(3650).default(365),
  auditLogDays: z.number().int().min(90).max(3650).default(730),
  discordSnapshotDays: z.number().int().min(1).max(365).default(30),
});

export type LegalSettings = z.infer<typeof legalSettingsSchema>;
export type RetentionSettings = z.infer<typeof retentionSettingsSchema>;

const legalDefaults: LegalSettings = {
  imprintEnabled: true,
  privacyPublished: false,
  operatorName: "",
  addressLine: "",
  postalCode: "",
  city: "",
  country: "Schweiz",
  contactEmail: "",
  donations: "NONE",
  lastReviewedAt: null,
  noAgeVerificationAcknowledged: true,
};

const retentionDefaults: RetentionSettings = {
  closedTicketDays: 365,
  auditLogDays: 730,
  discordSnapshotDays: 30,
};

export async function getLegalSettings() {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "legal.settings" } });
    return legalSettingsSchema.parse(setting?.value || legalDefaults);
  } catch {
    return legalDefaults;
  }
}

export async function getRetentionSettings() {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "retention.settings" } });
    return retentionSettingsSchema.parse(setting?.value || retentionDefaults);
  } catch {
    return retentionDefaults;
  }
}

export function legalDetailsComplete(settings: LegalSettings) {
  return Boolean(
    settings.operatorName.trim() &&
    settings.addressLine.trim() &&
    settings.postalCode.trim() &&
    settings.city.trim() &&
    settings.contactEmail.trim(),
  );
}
