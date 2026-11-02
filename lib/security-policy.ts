import { isLocalOrigin, siteOrigin } from "./site-origin";
import { lanPreviewEnabled } from "./local-mode";

export function securityHeaders(env: Record<string, string | undefined> = process.env) {
  const production = env.NODE_ENV === "production";
  const publicHttps = production && !isLocalOrigin(siteOrigin(env)) && siteOrigin(env).protocol === "https:";
  const csp = [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "frame-src 'none'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'", "font-src 'self' data:", "img-src 'self' data: blob:",
    "media-src 'self' https://res.cloudinary.com blob:",
    `connect-src 'self' https://api.cloudinary.com${production ? "" : " ws://localhost:* ws://127.0.0.1:*"}`,
    "form-action 'self' https://discord.com https://apis.roblox.com",
    ...(publicHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ];
}

export function httpsRedirect(requestUrl: string, forwardedProto: string | null, env: Record<string, string | undefined> = process.env) {
  const origin = siteOrigin(env);
  if (env.NODE_ENV !== "production" || isLocalOrigin(origin) || lanPreviewEnabled(env)) return null;
  const request = new URL(requestUrl);
  const secure = request.protocol === "https:" || (env.TRUST_PROXY_HTTPS === "true" && forwardedProto === "https");
  if (secure) return null;
  origin.protocol = "https:";
  return new URL(request.pathname + request.search, origin);
}
