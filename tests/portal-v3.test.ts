import { describe, expect, it } from "vitest";
import { createAccountLinkToken, verifyAccountLinkToken } from "@/lib/account-link";
import { legalDetailsComplete, legalSettingsSchema, retentionSettingsSchema } from "@/lib/legal-settings";
import { statusLabels } from "@/lib/service-status";

describe("Portal v3 safeguards", () => {
  it("signs provider and intent into account-change tokens", () => {
    const token = createAccountLinkToken("user-1", "roblox", "replace");
    expect(verifyAccountLinkToken(token)).toEqual({
      userId: "user-1",
      provider: "roblox",
      intent: "replace",
    });
    expect(verifyAccountLinkToken(token + "tampered")).toBeNull();
  });

  it("blocks privacy publication while operator details are incomplete", () => {
    const incomplete = legalSettingsSchema.parse({});
    expect(legalDetailsComplete(incomplete)).toBe(false);
    expect(legalDetailsComplete({
      ...incomplete,
      operatorName: "DRP Betreiber",
      addressLine: "Musterweg 1",
      postalCode: "8000",
      city: "Zürich",
      contactEmail: "kontakt@example.ch",
    })).toBe(true);
  });

  it("enforces bounded retention periods", () => {
    expect(retentionSettingsSchema.safeParse({
      closedTicketDays: 365,
      auditLogDays: 730,
      discordSnapshotDays: 30,
    }).success).toBe(true);
    expect(retentionSettingsSchema.safeParse({
      closedTicketDays: 1,
      auditLogDays: 10,
      discordSnapshotDays: 0,
    }).success).toBe(false);
  });

  it("provides public labels for every service state", () => {
    expect(statusLabels.OPERATIONAL).toBe("Betriebsbereit");
    expect(statusLabels.MAJOR_OUTAGE).toBe("Größere Störung");
    expect(statusLabels.UNKNOWN).toBe("Nicht verfügbar");
  });
});
