import { spawnSync } from "node:child_process";

const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--json"], { encoding: "utf8", shell: process.platform === "win32", windowsHide: true });
try {
  const audit = JSON.parse(result.stdout);
  const counts = audit.metadata?.vulnerabilities;
  if (!counts) throw new Error("No audit metadata");
  console.log(JSON.stringify(counts));
  if (counts.high || counts.critical) process.exitCode = 1;
  const other = Object.entries(audit.vulnerabilities || {}).filter(([, value]) => ["low", "moderate"].includes(value.severity)).map(([name, value]) => ({ name, severity: value.severity }));
  if (other.length) console.log("Weitere zu bewertende Abhängigkeiten:", JSON.stringify(other));
} catch { console.error("Abhängigkeitsprüfung nicht verfügbar oder unvollständig. Keine Freigabe."); process.exitCode = 1; }
