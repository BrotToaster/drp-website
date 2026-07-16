import { describe, expect, it } from "vitest";
import { contentNodeSchema } from "@/lib/content";
import { ticketSchema } from "@/lib/validators";

describe("Formularvalidierung", () => {
  it("akzeptiert die beiden freigegebenen Ticketkategorien", () => {
    for (const category of ["CONTACT", "TECHNICAL"]) {
      expect(
        ticketSchema.safeParse({
          subject: "Ein gültiger Betreff",
          category,
          message: "Eine ausreichend lange und konkrete Beschreibung.",
        }).success,
      ).toBe(true);
    }
  });

  it("weist alte Ticketkategorien zurück", () => {
    expect(
      ticketSchema.safeParse({
        subject: "Ein gültiger Betreff",
        category: "SUPPORT",
        message: "Eine ausreichend lange und konkrete Beschreibung.",
      }).success,
    ).toBe(false);
  });

  it("validiert strukturierten Rich-Text", () => {
    expect(
      contentNodeSchema.safeParse({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hallo" }] }],
      }).success,
    ).toBe(true);
  });
});