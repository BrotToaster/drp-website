import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  sanctionSchema,
  ticketSchema,
} from "@/lib/validators";

describe("Formularvalidierung", () => {
  it("akzeptiert ein vollständiges Ticket", () => {
    expect(
      ticketSchema.safeParse({
        subject: "Ein gültiger Betreff",
        category: "SUPPORT",
        message: "Eine ausreichend lange und konkrete Beschreibung.",
      }).success,
    ).toBe(true);
  });

  it("weist zu kurze Bewerbungen zurück", () => {
    expect(
      applicationSchema.safeParse({
        motivation: "zu kurz",
        experience: "zu kurz",
        scenario: "zu kurz",
      }).success,
    ).toBe(false);
  });

  it("prüft Beweislinks bei Sanktionen", () => {
    expect(
      sanctionSchema.safeParse({
        robloxName: "TestPlayer",
        type: "WARNING",
        reason: "Ein nachvollziehbarer Sanktionsgrund.",
        evidenceUrl: "kein-link",
      }).success,
    ).toBe(false);
  });
});
