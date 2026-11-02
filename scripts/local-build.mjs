import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stampFile = path.join(root, "runtime/website-build.json");
const buildIdFile = path.join(root, ".next/BUILD_ID");
const logFile = path.join(root, "logs/local-build.log");
const roots = ["app", "components", "lib", "prisma", "public", "data"];
const files = ["auth.ts", "middleware.ts", "next.config.ts", "prisma.config.ts", "package.json", "package-lock.json", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", ".env", ".env.local", ".env.production", ".env.production.local", "scripts/local-build.mjs"];

function fingerprint() {
  const hash = crypto.createHash("sha256").update(process.version);
  function add(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) { hash.update(relative + "\0missing\0"); return; }
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) add(path.join(relative, name));
    } else {
      hash.update(relative.replaceAll("\\", "/") + "\0");
      hash.update(fs.readFileSync(absolute));
      hash.update("\0");
    }
  }
  for (const input of [...roots, ...files]) add(input);
  return hash.digest("hex");
}

function fresh() {
  try {
    const stamp = JSON.parse(fs.readFileSync(stampFile, "utf8"));
    return stamp.fingerprint === fingerprint() && stamp.buildId === fs.readFileSync(buildIdFile, "utf8").trim();
  } catch { return false; }
}

if (process.argv.includes("--check")) process.exit(fresh() ? 0 : 1);
if (!process.argv.includes("--force") && fresh()) {
  console.log("Vorbereiteter Website-Build ist aktuell.");
  process.exit(0);
}
fs.mkdirSync(path.dirname(stampFile), { recursive: true });
fs.mkdirSync(path.dirname(logFile), { recursive: true });
fs.rmSync(stampFile, { force: true });
console.log("Website wird einmalig vorbereitet. Nach Quellcode- oder Konfigurationsänderungen ist ein neuer Build nötig.");
console.log("Build-Protokoll: logs/local-build.log");
const log = fs.openSync(logFile, "w");
const inputFingerprint = fingerprint();
let result;
try {
  result = spawnSync(process.execPath, [path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"), "run", "build"], {
    cwd: root, env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", log, log], windowsHide: true,
  });
} finally { fs.closeSync(log); }
if (result.error || result.status !== 0) {
  console.error("Website-Build fehlgeschlagen. Details stehen in logs/local-build.log.");
  process.exit(1);
}
if (inputFingerprint !== fingerprint()) {
  console.error("Quellcode oder Konfiguration wurden während des Builds geändert. Bitte Start-DRP.bat erneut ausführen.");
  process.exit(1);
}
fs.writeFileSync(stampFile, JSON.stringify({ fingerprint: inputFingerprint, buildId: fs.readFileSync(buildIdFile, "utf8").trim(), builtAt: new Date().toISOString() }, null, 2));
console.log("Website-Build vorbereitet. Weitere Starts verwenden ihn direkt.");
