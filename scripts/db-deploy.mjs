import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function applyMigrations(connectionString) {
  if (!/^postgres(?:ql)?:\/\//.test(connectionString || "")) throw new Error("PostgreSQL-URL erforderlich.");
  const db = new pg.Client({ connectionString });
  await db.connect();
  try {
    await db.query("SELECT pg_advisory_lock(184734981)");
    await db.query("CREATE SCHEMA IF NOT EXISTS local_admin; CREATE TABLE IF NOT EXISTS local_admin._drp_local_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
    const folder = path.join(root, "netlify/database/migrations");
    for (const name of (await fs.readdir(folder)).filter(name => name.endsWith(".sql")).sort()) {
      const sql = await fs.readFile(path.join(folder, name), "utf8");
      const normalized = sql.replace(/\r\n/g, "\n");
      const digest = value => createHash("sha256").update(value).digest("hex");
      const checksum = digest(normalized);
      const compatibleChecksums = [checksum, digest(sql), digest(normalized.replace(/\n/g, "\r\n"))];
      const saved = await db.query("SELECT checksum FROM local_admin._drp_local_migrations WHERE name=$1", [name]);
      if (saved.rows.length) {
        if (!compatibleChecksums.includes(saved.rows[0].checksum)) throw new Error(`Migration verändert: ${name}`);
        continue;
      }
      if (name.includes("initial_schema") && (await db.query("SELECT to_regclass('public.\"User\"') AS existing")).rows[0].existing) throw new Error("Vorhandener Datenbestand ohne passende Migrationshistorie. Kein automatischer Import.");
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query("INSERT INTO local_admin._drp_local_migrations(name,checksum) VALUES ($1,$2)", [name, checksum]);
        await db.query("COMMIT");
        console.log(`Migration: ${name}`);
      } catch (error) { await db.query("ROLLBACK"); throw error; }
    }
  } finally { await db.end(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.loadEnvFile(); } catch { /* Hosting supplies environment variables. */ }
  try { await applyMigrations(process.env.DIRECT_URL || process.env.DATABASE_URL); }
  catch { console.error("Datenbankmigration abgebrochen. Verbindung und Migrationshistorie prüfen; Zugangsdaten werden nicht ausgegeben."); process.exitCode = 1; }
}
