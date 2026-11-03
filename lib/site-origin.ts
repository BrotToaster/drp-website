export function siteOrigin(env: Record<string, string | undefined> = process.env) {
  try {
    const url = new URL(env.SITE_URL || env.AUTH_URL || "http://localhost:3000");
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Invalid site origin");
    return new URL(url.origin);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function isLocalOrigin(url: URL) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.hostname.endsWith(".localhost");
}

export function indexingRequested(env: Record<string, string | undefined> = process.env) {
  if (env.DRP_HOSTED_PREVIEW === "true") return false;
  const origin = siteOrigin(env);
  return env.NODE_ENV === "production" && env.PUBLIC_SITE_INDEXING === "true" && origin.protocol === "https:" && !isLocalOrigin(origin);
}
