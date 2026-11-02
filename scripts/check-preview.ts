import { prisma } from "../lib/prisma";
import { assertPreviewDatabase } from "../prisma/preview-guard.mjs";
import { hostedPreviewEnabled, previewOperatorReady } from "../lib/preview-mode";
import { isLocalOrigin, siteOrigin } from "../lib/site-origin";

async function main() {
  const origin = siteOrigin();
  let isolated = false;
  try { await assertPreviewDatabase(prisma, process.env.DRP_PREVIEW_DATABASE_ID); isolated = true; } catch { /* Fail closed. */ }
  const checks = [
    ["Vorschau ausdrücklich aktiviert", hostedPreviewEnabled()],
    ["Isolierte Datenbankkennung stimmt", isolated],
    ["Vorschaupasswort und drei Rollenpasswörter gehasht", ["PREVIEW_ACCESS_HASH", "PREVIEW_MEMBER_PASSWORD_HASH", "PREVIEW_STAFF_PASSWORD_HASH", "PREVIEW_ADMIN_PASSWORD_HASH", "CRON_SECRET_HASH"].every(key => /^[a-f0-9]{64}$/.test(process.env[key] || ""))],
    ["Eigener langer Auth-Schlüssel", (process.env.AUTH_SECRET?.length || 0) >= 32],
    ["Lokaler Owner-Demozugang aus", process.env.AUTH_DEMO_MODE === "false" && process.env.DRP_LOCAL_PREVIEW !== "true"],
    ["Kanonische Adressen stimmen überein", process.env.AUTH_URL === origin.origin],
    ["Indexierung deaktiviert", process.env.PUBLIC_SITE_INDEXING === "false"],
    ["Hosting per HTTPS oder ausschließlich lokaler Test", origin.protocol === "https:" || isLocalOrigin(origin)],
    ["Verantwortliche Stelle für externes Hosting bestätigt", isLocalOrigin(origin) || previewOperatorReady()],
    ["Hostingprotokollfrist benannt", /^\d+$/.test(process.env.SERVER_LOG_RETENTION_DAYS || "")],
  ] as const;
  for (const [label, okay] of checks) console.log(`${okay ? "OK" : "OFFEN"}: ${label}`);
  if (checks.some(([, okay]) => !okay)) process.exitCode = 1;
}
main().catch(() => { console.error("Vorschauprüfung fehlgeschlagen."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
