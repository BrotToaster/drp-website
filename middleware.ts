import { NextResponse, type NextRequest } from "next/server";
import { httpsRedirect, securityHeaders } from "@/lib/security-policy";
import { indexingRequested, isLocalOrigin, siteOrigin } from "@/lib/site-origin";
import { hostedPreviewEnabled, previewGateAllowed, matchesSecretHash, previewOperatorReady, previewLocalRequest } from "@/lib/preview-mode";
import { gatewayErrorResponse } from "@/lib/error-response";

export async function middleware(request: NextRequest) {
  // The sharing proxy always replaces Host with its public origin. Direct local
  // bot/health requests keep working over loopback and retain their API auth.
  const localService = process.env.DRP_SHARED_PREVIEW === "true" &&
    ["localhost:3000", "127.0.0.1:3000"].includes(request.headers.get("host") || "") &&
    /^\/api\/(?:health$|bot(?:\/|$))/.test(request.nextUrl.pathname);
  const target = localService ? null : httpsRedirect(request.url, request.headers.get("x-forwarded-proto"));
  if (target) return NextResponse.redirect(target, 308);
  if (hostedPreviewEnabled()) {
    const localTest = previewLocalRequest(request.headers.get("host"));
    if (!localTest && (isLocalOrigin(siteOrigin()) || siteOrigin().protocol !== "https:" || !previewOperatorReady())) return gatewayErrorResponse(request, 503);
    const cron = request.nextUrl.pathname === "/api/preview/cleanup" && await matchesSecretHash(request.headers.get("authorization")?.replace(/^Bearer /, "") || "", process.env.CRON_SECRET_HASH);
    const privacy = request.nextUrl.pathname === "/datenschutz";
    if (!privacy && !cron && !(await previewGateAllowed(request.headers.get("authorization")))) {
      return gatewayErrorResponse(request, 401, { "WWW-Authenticate": 'Basic realm="DRP Entscheidungsvorschau", charset="UTF-8"' });
    }
    if (/^\/api\/(?:bot|media)(?:\/|$)/.test(request.nextUrl.pathname)) return NextResponse.json({ error: "Externe Schnittstelle in der Testvorschau abgeschaltet." }, { status: 403 });
  }
  const response = NextResponse.next();
  if (hostedPreviewEnabled()) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  for (const header of securityHeaders()) response.headers.set(header.key, header.value);
  const privatePath = /^\/(?:api|admin|staff|dashboard|login|registrieren)(?:\/|$)/.test(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith("/kontakt/");
  if (!indexingRequested() || privatePath) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (privatePath) response.headers.set("Cache-Control", "private, no-store");
  const origin = siteOrigin();
  if (process.env.NODE_ENV === "production" && origin.protocol === "https:" && !isLocalOrigin(origin)) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}

// Next's internal image optimizer fetches public source files without forwarding
// proxy headers. Keep those static assets out of page redirects; the outer
// preview gateway still enforces HTTPS and its password for every request.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon\\.ico$|(?:drp-logo|icon|apple-icon)\\.png$|(?:brand|maps|community)/.*\\.(?:png|webp)$).*)"] };
