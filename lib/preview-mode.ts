// Shared with Edge middleware: no database, Node-only crypto or client secrets.
export const previewRoles = ["member", "staff", "admin"] as const;
export type PreviewRole = typeof previewRoles[number];
export const previewUserId = (role: PreviewRole) => `preview-${role}`;

export function hostedPreviewEnabled(env: Record<string, string | undefined> = process.env) {
  return env.DRP_HOSTED_PREVIEW === "true";
}

export function previewOperatorReady(env: Record<string, string | undefined> = process.env) {
  const name = env.PREVIEW_OPERATOR_NAME?.trim() || "";
  return name.length >= 2 && !/mustermann|musterfrau|example|platzhalter/i.test(name) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.PREVIEW_OPERATOR_EMAIL || "") && env.PREVIEW_OPERATOR_CONFIRMED === "true";
}

export function previewLocalRequest(host: string | null, env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL === "1" || !host) return false;
  try {
    const site = new URL(env.SITE_URL || "");
    const request = new URL("http://" + host);
    return !request.username && !request.password && ["localhost", "127.0.0.1", "[::1]"].includes(request.hostname) && site.origin === request.origin && env.AUTH_URL === site.origin;
  } catch { return false; }
}

export async function matchesSecretHash(value: string, expected: string | undefined) {
  if (!expected || !/^[a-f0-9]{64}$/.test(expected) || value.length < 20 || value.length > 256) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  let different = 0;
  for (let index = 0; index < actual.length; index++) different |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return different === 0;
}

export async function previewGateAllowed(header: string | null, env: Record<string, string | undefined> = process.env) {
  if (!hostedPreviewEnabled(env)) return true;
  if (!header || !/^Basic /i.test(header)) return false;
  try {
    const decoded = atob(header.slice(6));
    if (!decoded.startsWith("drp:")) return false;
    return matchesSecretHash(decoded.slice(4), env.PREVIEW_ACCESS_HASH);
  } catch { return false; }
}

export function assertExternalServicesAllowed() {
  if (hostedPreviewEnabled()) throw new Error("Externe Dienste sind in der Entscheidungsvorschau abgeschaltet.");
}
