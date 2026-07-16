import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () =>
  process.env.AUTH_SECRET || "drp-local-demo-secret-change-in-production";

export function createAccountLinkToken(userId: string) {
  const signature = createHmac("sha256", secret()).update(userId).digest("base64url");
  return userId + "." + signature;
}

export function verifyAccountLinkToken(token?: string) {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const userId = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  const expected = createHmac("sha256", secret()).update(userId).digest("base64url");
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }
  return userId;
}
