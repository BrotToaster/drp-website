import { describe, expect, it } from "vitest";
import { contentNodeSchema } from "@/lib/content";
import { guestTicketSchema, ticketSchema } from "@/lib/validators";

describe("Formularvalidierung", () => {
  it("akzeptiert die drei freigegebenen Ticketkategorien für angemeldete Nutzer", () => {
    for (const category of ["CONTACT", "TECHNICAL", "OWNERSHIP"]) {
      expect(
        ticketSchema.safeParse({
          subject: "Ein gültiger Betreff",
          category,
          message: "Eine ausreichend lange und konkrete Beschreibung.",
        }).success,
      ).toBe(true);
    }
  });

  it("beschränkt Gasttickets auf Kontakt und Technik", () => {
    const base = { displayName: "Gast", discordContact: "@gast", subject: "Ein gültiger Betreff", message: "Eine ausreichend lange und konkrete Beschreibung.", website: "" };
    expect(guestTicketSchema.safeParse({ ...base, category: "CONTACT" }).success).toBe(true);
    expect(guestTicketSchema.safeParse({ ...base, category: "TECHNICAL" }).success).toBe(true);
    expect(guestTicketSchema.safeParse({ ...base, category: "OWNERSHIP" }).success).toBe(false);
    expect(guestTicketSchema.safeParse({ ...base, category: "CONTACT", website: "bot" }).success).toBe(false);
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
