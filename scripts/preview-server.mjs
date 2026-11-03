import fs from "node:fs";
import { parseEnv } from "node:util";
import { createRequire } from "node:module";

const config = parseEnv(fs.readFileSync(process.argv[2] || "runtime/preview.env", "utf8"));
const origin = new URL(config.SITE_URL);
if (config.DRP_HOSTED_PREVIEW !== "true" || !["localhost", "127.0.0.1"].includes(origin.hostname) || !origin.port) throw new Error("Dieser Starthelfer dient ausschließlich der lokalen, getrennten Entscheidungsvorschau.");
Object.assign(process.env, config, { NODE_ENV: "production", AUTH_DEMO_MODE: "false", DRP_LOCAL_PREVIEW: "false", DRP_LAN_PREVIEW: "false", DRP_SHARED_PREVIEW: "false" });
for (const key of ["AUTH_DISCORD_ID", "AUTH_DISCORD_SECRET", "AUTH_ROBLOX_ID", "AUTH_ROBLOX_SECRET", "OWNER_DISCORD_ID", "ERLC_SERVER_KEY", "BOT_INGEST_TOKEN", "MELONLY_API_TOKEN", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) process.env[key] = "";
process.argv = [process.execPath, "next", "start", "--hostname", "127.0.0.1", "--port", origin.port];
createRequire(import.meta.url)("next/dist/bin/next");
