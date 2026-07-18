import { createHmac, timingSafeEqual } from "node:crypto";

export type AccountLinkProvider = "discord" | "roblox";
export type AccountLinkIntent = "link" | "refresh" | "replace";

export type AccountLinkRequest = {
  userId: string;
  provider: AccountLinkProvider;
  intent: AccountLinkIntent;
};

const secret = () => process.env.AUTH_SECRET || "drp-local-demo-secret-change-in-production";

export function createAccountLinkToken(
  userId: string,
  provider: AccountLinkProvider,
  intent: AccountLinkIntent = "link",
) {
  const payload = Buffer.from(JSON.stringify({ userId, provider, intent })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function verifyAccountLinkToken(token?: string): AccountLinkRequest | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AccountLinkRequest>;
    if (
      typeof parsed.userId !== "string" ||
      !["discord", "roblox"].includes(parsed.provider || "") ||
      !["link", "refresh", "replace"].includes(parsed.intent || "")
    ) return null;
    return parsed as AccountLinkRequest;
  } catch {
    return null;
  }
}
