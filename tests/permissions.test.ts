import { describe, expect, it } from "vitest";
import {
  canTransitionTicket,
  hasMinimumRole,
  isStaff,
} from "@/lib/permissions";

describe("Rollen und Ticketstatus", () => {
  it("ordnet Staff-Rollen hierarchisch ein", () => {
    expect(hasMinimumRole("OWNER", "ADMIN")).toBe(true);
    expect(hasMinimumRole("MODERATOR", "SUPPORTER")).toBe(true);
    expect(hasMinimumRole("PLAYER", "SUPPORTER")).toBe(false);
    expect(isStaff("ADMIN")).toBe(true);
    expect(isStaff("PLAYER")).toBe(false);
  });

  it("erlaubt nur definierte Ticketübergänge", () => {
    expect(canTransitionTicket("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionTicket("OPEN", "RESOLVED")).toBe(false);
    expect(canTransitionTicket("CLOSED", "IN_PROGRESS")).toBe(false);
  });
});
