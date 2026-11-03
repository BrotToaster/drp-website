// CI helper: an explicitly separate, new database on the ephemeral CI service.
import fs from "node:fs";
import { parseEnv } from "node:util";
import pg from "pg";

const original = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(original.hostname) || original.pathname !== "/drp_ci") throw new Error("Nur für die flüchtige CI-Datenbank vorgesehen.");
const db = new pg.Client({ connectionString: original.href });
await db.connect();
try { await db.query("CREATE DATABASE drp_ci_preview"); } finally { await db.end(); }
original.pathname = "/drp_ci_preview";
const config = parseEnv(fs.readFileSync("runtime/preview.env", "utf8"));
Object.assign(config, { DATABASE_URL: original.href, PREVIEW_DATABASE_URL: original.href, DIRECT_URL: original.href, SITE_URL: "http://localhost:3108", AUTH_URL: "http://localhost:3108", AUTH_TRUST_HOST: "true", TRUST_PROXY_HTTPS: "false" });
fs.writeFileSync("runtime/preview.env", Object.entries(config).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n");
