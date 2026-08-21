import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { GuestTicketAccess } from "@prisma/client";

const secret = () => process.env.AUTH_SECRET || "drp-local-demo-secret-change-in-production";

export function createGuestTicketToken() {
  return randomBytes(32).toString("base64url");
}

export function hashGuestTicketToken(token: string) {
  return createHmac("sha256", secret()).update(`guest-ticket:${token}`).digest("hex");
}

export function guestTicketCookieName(ticketId: string) {
  return `drp_guest_${ticketId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48)}`;
}

export function createGuestTicketSession(access: Pick<GuestTicketAccess, "ticketId" | "tokenHash">) {
  return createHmac("sha256", secret()).update(`guest-session:${access.ticketId}:${access.tokenHash}`).digest("base64url");
}

export function verifyGuestTicketSession(access: Pick<GuestTicketAccess, "ticketId" | "tokenHash">, supplied?: string) {
  if (!supplied) return false;
  const expected = Buffer.from(createGuestTicketSession(access));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function guestFingerprint(ip: string) {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac("sha256", secret()).update(`guest-rate:${day}:${ip}`).digest("hex");
}
