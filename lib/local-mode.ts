import { isLocalOrigin } from "./site-origin";

type Environment = Record<string, string | undefined>;

function localUrl(value: string | undefined) {
  try {
    const url = new URL(value || "");
    return /^https?:$/.test(url.protocol) && !url.username && !url.password && isLocalOrigin(url);
  } catch { return false; }
}

// Only scripts/local.ps1 enables this flag, while binding the server to 127.0.0.1.
// Never infer preview mode from a missing or invalid public URL.
export function localPreviewEnabled(env: Environment = process.env) {
  return env.DRP_LOCAL_PREVIEW === "true" && localUrl(env.SITE_URL) && localUrl(env.AUTH_URL);
}

// An explicit LAN preview is separate from the loopback-only owner demo.
export function lanPreviewEnabled(env: Environment = process.env) {
  if (env.DRP_LAN_PREVIEW !== "true") return false;
  try {
    const site = new URL(env.SITE_URL || "");
    const auth = new URL(env.AUTH_URL || "");
    const parts = site.hostname.split(".").map(Number);
    const privateIPv4 = parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255) &&
      (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
    return privateIPv4 && site.protocol === "http:" && site.port === "3000" && site.origin === auth.origin &&
      !site.username && !site.password && !auth.username && !auth.password;
  } catch { return false; }
}

export function demoAccessEnabled(env: Environment = process.env) {
  if (env.DRP_LAN_PREVIEW === "true" || env.DRP_SHARED_PREVIEW === "true" || env.DRP_HOSTED_PREVIEW === "true") return false;
  return env.NODE_ENV !== "production"
    ? env.AUTH_DEMO_MODE !== "false"
    : localPreviewEnabled(env) && env.AUTH_DEMO_MODE === "true";
}

export function demoRequestAllowed(request: Request, env: Environment = process.env) {
  if (!demoAccessEnabled(env)) return false;
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  return localUrl(request.url) && (!host || localUrl(`http://${host}`)) && (!origin || localUrl(origin));
}

export function secureApplicationCookies(env: Environment = process.env) {
  return env.NODE_ENV === "production" && !localPreviewEnabled(env) && !lanPreviewEnabled(env);
}
