import { NextResponse } from "next/server";
import { createGuestTicketSession, guestTicketCookieName, hashGuestTicketToken } from "@/lib/guest-tickets";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const access = token.length >= 32 ? await prisma.guestTicketAccess.findUnique({ where: { tokenHash: hashGuestTicketToken(token) } }) : null;
  if (!access) return NextResponse.redirect(new URL("/kontakt?error=access", url));
  await prisma.guestTicketAccess.update({ where: { id: access.id }, data: { lastAccessedAt: new Date() } });
  const response = NextResponse.redirect(new URL(`/kontakt/ticket/${access.ticketId}`, url));
  response.cookies.set(guestTicketCookieName(access.ticketId), createGuestTicketSession(access), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: `/kontakt/ticket/${access.ticketId}`, maxAge: 60 * 60 * 24 * 30 });
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
