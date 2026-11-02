import fs from "node:fs";
import { parseEnv } from "node:util";

// Execute against an intentionally unmarked regression/CI database, never a
// remotely supplied or arbitrary user database. No private result is printed.
const target = process.env.DATABASE_URL;
const url = new URL(target);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/drp_(?:ci|regression_readiness_\d+)$/.test(url.pathname)) throw new Error("Explizite lokale Regression-/CI-Testdatenbank erforderlich.");
Object.assign(process.env, parseEnv(fs.readFileSync("runtime/preview.env", "utf8")), { DATABASE_URL: target, NODE_ENV: "production", DRP_HOSTED_PREVIEW: "true" });
const { prisma } = await import("../lib/prisma.ts");
const result = { modelQueryBlocked: false, rawQueryBlocked: false };
try {
  for (const [key, query] of [["modelQueryBlocked", () => prisma.user.count()], ["rawQueryBlocked", () => prisma.$queryRawUnsafe('SELECT id FROM "User" LIMIT 1')]]) {
    try { await query(); throw new Error("Vorschau-Isolation wurde umgangen."); }
    catch (error) {
      if (!/drp_preview_guard|Vorschau-Datenbankkennung/.test(String(error))) throw error;
      result[key] = true;
    }
  }
  fs.mkdirSync("logs", { recursive: true });
  fs.writeFileSync("logs/preview-isolation.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await prisma.$disconnect(); }
