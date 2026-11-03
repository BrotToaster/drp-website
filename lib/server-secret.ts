export function authSigningSecret() {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32 || /replace|change.me|example/i.test(secret))) {
    throw new Error("Für signierte Zugriffe im Produktionsbetrieb ist ein eigener langer AUTH_SECRET erforderlich.");
  }
  return secret || "drp-local-demo-secret-change-in-production";
}
