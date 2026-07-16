import { timingSafeEqual } from "node:crypto";

export function isBotAuthorized(request: Request) {
  const configured = process.env.BOT_INGEST_TOKEN;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!configured || !supplied) return false;
  const left = Buffer.from(configured);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}
