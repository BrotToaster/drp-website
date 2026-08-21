import { describe, expect, it } from "vitest";
import { createGuestTicketSession, createGuestTicketToken, guestFingerprint, guestTicketCookieName, hashGuestTicketToken, verifyGuestTicketSession } from "@/lib/guest-tickets";

describe("sicherer Gastticket-Zugriff", () => {
  it("erzeugt zufällige Tokens und speichert nur einen stabilen Hash", () => {
    const first = createGuestTicketToken();
    const second = createGuestTicketToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(40);
    expect(hashGuestTicketToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashGuestTicketToken(first)).not.toContain(first);
  });

  it("bindet die Sitzung an Ticket und Tokenhash", () => {
    const access = { ticketId: "ticket-123", tokenHash: hashGuestTicketToken("secret") };
    const session = createGuestTicketSession(access);
    expect(verifyGuestTicketSession(access, session)).toBe(true);
    expect(verifyGuestTicketSession({ ...access, ticketId: "ticket-456" }, session)).toBe(false);
    expect(verifyGuestTicketSession(access, "falsch")).toBe(false);
  });

  it("bereinigt Cookie-Namen und pseudonymisiert Rate-Limit-Merkmale", () => {
    expect(guestTicketCookieName("ticket/../../123")).toBe("drp_guest_ticket123");
    const fingerprint = guestFingerprint("203.0.113.4");
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain("203.0.113.4");
    expect(fingerprint).not.toBe(guestFingerprint("203.0.113.5"));
  });
});
