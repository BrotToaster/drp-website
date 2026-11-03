import fs from "node:fs";
import path from "node:path";
try { process.loadEnvFile(); } catch { /* CI may supply variables directly. */ }
try { process.loadEnvFile(".env.local"); } catch { /* Private local document references are optional. */ }
const root = path.resolve(".next/static");
if (!fs.existsSync(root)) throw new Error("Vor dem Secret-Check muss ein Produktionsbuild erstellt werden.");
const secrets = Object.entries(process.env).filter(([key, value]) => /SECRET|TOKEN|PASSWORD|DATABASE_URL|DIRECT_URL|PREVIEW_ACCESS|ERLC_SERVER_KEY|DRP_DOCUMENT_.*_ID/.test(key) && value && value.length >= 8);
for (const [key, value] of [...secrets]) {
  if (!key.endsWith("DATABASE_URL")) continue;
  try { const password = decodeURIComponent(new URL(value).password); if (password.length >= 8) secrets.push([`${key} (Passwort)`, password]); } catch { /* Not a URL-based database credential. */ }
}
const findings = new Set();
function inspect(content) {
  for (const [key, value] of secrets) if ([value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1)].some(candidate => content.includes(candidate))) findings.add(key);
}
function scan(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) scan(file);
    else if (/\.(?:js|map|json)$/.test(file)) {
      const content = fs.readFileSync(file, "utf8");
      inspect(content);
    }
  }
}
scan(root);
const urlFlag = process.argv.indexOf("--url");
if (urlFlag >= 0) {
  const origin = new URL(process.argv[urlFlag + 1]);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) || !/^https?:$/.test(origin.protocol) || origin.username || origin.password) throw new Error("Laufzeitprüfung nur gegen die lokale Website erlaubt.");
  for (const route of ["/", "/datenschutz", "/nutzungsbedingungen", "/login"]) {
    const response = await fetch(new URL(route, origin), { redirect: "manual", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Lokale Seite für Geheimnisprüfung nicht erreichbar: ${route}`);
    inspect(await response.text());
  }
}
if (findings.size) { console.error("Geheimnisse im Browser-Build gefunden (nur Variablennamen):", [...findings].join(", ")); process.exit(1); }
console.log(`Browser-Build${urlFlag >= 0 ? " und lokale HTML-Antworten" : ""} geprüft: keine der ${secrets.length} konfigurierten geheimen Zeichenfolgen gefunden.`);
