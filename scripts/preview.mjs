import fs from "node:fs";
import { parseEnv } from "node:util";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { applyMigrations } from "./db-deploy.mjs";

const command = process.argv[2];
if (command === "credentials") {
  const destination = process.argv[3];
  if (!destination || !/^(?:runtime[\\/]|\.env\.)/.test(destination) || fs.existsSync(destination)) throw new Error("Neue Datei unter runtime/ oder .env.* angeben; bestehende Dateien werden nicht überschrieben.");
  const values = { DRP_HOSTED_PREVIEW: "true", AUTH_DEMO_MODE: "false", DRP_LOCAL_PREVIEW: "false", PUBLIC_SITE_INDEXING: "false", AUTH_SECRET: randomBytes(32).toString("base64url"), DRP_PREVIEW_DATABASE_ID: randomBytes(24).toString("hex"), SITE_URL: "https://REPLACE.vercel.app", AUTH_URL: "https://REPLACE.vercel.app", DATABASE_URL: "REPLACE", PREVIEW_DATABASE_URL: "REPLACE", TRUST_PROXY_HTTPS: "true", TRUST_PROXY_CLIENT_IP: "false", PREVIEW_OPERATOR_NAME: "", PREVIEW_OPERATOR_EMAIL: "", HOSTING_PROVIDER: "Vercel / Neon", HOSTING_LOCATION: "Deutschland / EU", SERVER_LOG_RETENTION_DAYS: "1" };
  for (const name of ["ACCESS", "MEMBER_PASSWORD", "STAFF_PASSWORD", "ADMIN_PASSWORD", "CRON_SECRET"]) {
    const password = randomBytes(24).toString("base64url");
    values[name === "CRON_SECRET" ? name : `PREVIEW_${name}`] = password;
    values[name === "CRON_SECRET" ? "CRON_SECRET_HASH" : `PREVIEW_${name}_HASH`] = createHash("sha256").update(password).digest("hex");
  }
  fs.writeFileSync(destination, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
  console.log("Zufällige Zugangsdaten in der angegebenen ignorierten Datei gespeichert. Nicht hochladen.");
} else {
  try { process.loadEnvFile(); } catch { /* Environment may be provided by hosting. */ }
  const connectionString = process.env.PREVIEW_DATABASE_URL;
  const id = process.env.DRP_PREVIEW_DATABASE_ID;
  if (process.env.DRP_HOSTED_PREVIEW !== "true" || !id || id.length < 24 || !/^postgres(?:ql)?:\/\//.test(connectionString || "")) throw new Error("Explizite Vorschaukonfiguration und PREVIEW_DATABASE_URL erforderlich.");
  if (fs.existsSync(".env")) {
    const original = parseEnv(fs.readFileSync(".env", "utf8")).DATABASE_URL;
    const identity = value => { const url = new URL(value); return `${url.hostname}:${url.port || 5432}${url.pathname}`; };
    if (original && identity(original) === identity(connectionString)) throw new Error("Die lokale Bestandsdatenbank ist kein Vorschauziel.");
  }
  process.env.DATABASE_URL = connectionString;
  delete process.env.NETLIFY_DB_URL;
  const db = new pg.Client({ connectionString });
  await db.connect();
  try {
    const exists = await db.query("SELECT to_regclass('drp_preview_guard.installation') AS marker");
    if (command === "init" && !exists.rows[0].marker) {
      const tables = await db.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_%'");
      if (tables.rows[0].count) throw new Error("Vorschauinitialisierung ausschließlich in einer neuen, leeren Datenbank.");
      await db.query("BEGIN");
      await db.query("CREATE SCHEMA drp_preview_guard; CREATE TABLE drp_preview_guard.installation(id text PRIMARY KEY)");
      await db.query("INSERT INTO drp_preview_guard.installation(id) VALUES ($1)", [id]);
      await db.query("COMMIT");
    }
    const marker = await db.query("SELECT id FROM drp_preview_guard.installation");
    if (marker.rows.length !== 1 || marker.rows[0].id !== id) throw new Error("Unpassende Vorschau-Datenbankkennung.");
  } finally { await db.end(); }
  if (command === "init") {
    const directUrl = process.env.DIRECT_URL || connectionString;
    const direct = new pg.Client({ connectionString: directUrl });
    await direct.connect();
    try {
      const checked = await direct.query("SELECT id FROM drp_preview_guard.installation");
      if (checked.rows.length !== 1 || checked.rows[0].id !== id) throw new Error("DIRECT_URL verweist nicht auf die markierte Vorschau-Datenbank.");
    } finally { await direct.end(); }
    await applyMigrations(directUrl);
  }
  if (!["init", "reset"].includes(command)) throw new Error("Befehl: credentials, init oder reset.");
  const { PrismaClient } = await import("@prisma/client");
  const { resetPreviewDatabase } = await import("../prisma/preview-seed.mjs");
  const prisma = new PrismaClient({ datasourceUrl: connectionString });
  try { await resetPreviewDatabase(prisma, id); console.log("Isolierte Vorschau mit künstlichen Testdaten befüllt."); }
  finally { await prisma.$disconnect(); }
}
