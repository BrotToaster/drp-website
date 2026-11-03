import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hostedPreviewEnabled, previewOperatorReady } from "./preview-mode";

export const legalSettingsSchema = z.object({
  imprintEnabled: z.boolean().default(true),
  privacyPublished: z.boolean().default(false),
  operatorName: z.string().trim().max(200).default(""),
  addressLine: z.string().trim().max(200).default(""),
  postalCode: z.string().trim().max(20).default(""),
  city: z.string().trim().max(100).default(""),
  country: z.string().trim().min(2).max(100).default("Schweiz"),
  contactEmail: z.union([z.literal(""), z.string().trim().email().max(254)]).default(""),
  sampleDetails: z.boolean().default(false),
  representative: z.string().trim().max(200).default(""),
  registerCourt: z.string().trim().max(200).default(""),
  registerNumber: z.string().trim().max(100).default(""),
  vatId: z.string().trim().max(40).default(""),
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
  sampleDetails: false,
  representative: "",
  registerCourt: "",
  registerNumber: "",
  vatId: "",
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
    const stored = legalSettingsSchema.parse(setting?.value || legalDefaults);
    // Real responsible-party details are hosting configuration, not editable
    // sample content that a tester can overwrite while trying admin forms.
    if (hostedPreviewEnabled() && previewOperatorReady()) return { ...stored, operatorName: process.env.PREVIEW_OPERATOR_NAME!.trim(), contactEmail: process.env.PREVIEW_OPERATOR_EMAIL!.trim(), country: "Schweiz", addressLine: process.env.PREVIEW_OPERATOR_ADDRESS || "", city: process.env.PREVIEW_OPERATOR_CITY || "", postalCode: process.env.PREVIEW_OPERATOR_POSTAL_CODE || "", sampleDetails: false };
    return stored;
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
    settings.country.trim() &&
    z.string().email().safeParse(settings.contactEmail).success,
  );
}

export function hasSampleLegalDetails(settings: LegalSettings) {
  return settings.sampleDetails || /mustermann|musterfrau|musterstra[ßs]e|musterstadt|example\.(?:com|org|net|de)|\.invalid\b/i.test([settings.operatorName, settings.addressLine, settings.city, settings.contactEmail].join(" "));
}

export function legalPublicationReady(settings: LegalSettings) {
  return legalDetailsComplete(settings) && !hasSampleLegalDetails(settings) && settings.privacyPublished;
}
