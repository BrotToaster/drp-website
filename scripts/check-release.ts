import { prisma } from "../lib/prisma";
import { getLegalSettings, legalPublicationReady } from "../lib/legal-settings";
import { isLocalOrigin, siteOrigin } from "../lib/site-origin";

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  const legal = await getLegalSettings();
  const origin = siteOrigin();
  const checks = [
    ["Echte Betreiberangaben und geprüfte Datenschutzhinweise", legalPublicationReady(legal)],
    ["Öffentliche HTTPS-Adresse in SITE_URL", Boolean(process.env.SITE_URL) && origin.protocol === "https:" && !isLocalOrigin(origin)],
    ["AUTH_URL entspricht SITE_URL", process.env.AUTH_URL === origin.origin],
    ["Lokaler Demozugang abgeschaltet", process.env.AUTH_DEMO_MODE === "false"],
    ["Sämtliche Testvorschauen abgeschaltet", [process.env.DRP_LOCAL_PREVIEW, process.env.DRP_LAN_PREVIEW, process.env.DRP_SHARED_PREVIEW, process.env.DRP_HOSTED_PREVIEW].every(value => value !== "true")],
    ["Reverse-Proxy bereinigt und setzt Client-IP und HTTPS-Protokoll", process.env.TRUST_PROXY_CLIENT_IP === "true" && process.env.TRUST_PROXY_HTTPS === "true"],
    ["Hostinganbieter und Standort dokumentiert", Boolean(process.env.HOSTING_PROVIDER && process.env.HOSTING_LOCATION)],
    ["Frist für Serverprotokolle festgelegt", /^\d+$/.test(process.env.SERVER_LOG_RETENTION_DAYS || "")],
    ["Betrieb, Dienstleisterverträge und Rechtstexte abschließend geprüft", process.env.PUBLIC_LEGAL_REVIEW_CONFIRMED === "true"],
    ["Langer Auth-Schlüssel ohne Platzhalter", (process.env.AUTH_SECRET?.length || 0) >= 32 && !/replace|change.me|example/i.test(process.env.AUTH_SECRET || "")],
    ["Langer Bot-Zugriffsschlüssel ohne Platzhalter", (process.env.BOT_INGEST_TOKEN?.length || 0) >= 32 && !/replace|change.me|example/i.test(process.env.BOT_INGEST_TOKEN || "")],
  ] as const;
  for (const [label, okay] of checks) console.log(`${okay ? "OK" : "OFFEN"}: ${label}`);
  if (checks.some(([, okay]) => !okay)) process.exitCode = 1;
  console.log("Diese technische Prüfung ist keine rechtliche Freigabe. robots.txt und noindex sind keine Zugriffskontrolle.");
}
main().catch(() => { console.error("Freigabeprüfung fehlgeschlagen; Datenbank und Konfiguration prüfen."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
