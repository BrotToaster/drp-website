import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const label = process.argv[2] || "current";
if (!/^[a-z0-9-]+$/.test(label)) throw new Error("Messname darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.");
const browser = await chromium.launch();
const report = { measuredAt: new Date().toISOString(), label, pages: [], errors: [] };
try {
  for (const route of ["/", "/server", "/regelwerk", "/news", "/login", "/datenschutz"]) {
    // Each page gets an empty browser cache. Server compilation may already be warm.
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      page.on("pageerror", error => report.errors.push({ route, message: error.message }));
      const response = await page.goto("http://localhost:3000" + route, { waitUntil: "load", timeout: 60_000 });
      await page.locator("h1").first().waitFor();
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        const resources = performance.getEntriesByType("resource");
        return {
          ttfbMs: Math.round(navigation.responseStart),
          domReadyMs: Math.round(navigation.domContentLoadedEventEnd),
          loadMs: Math.round(navigation.loadEventEnd),
          transferredBytes: resources.reduce((sum, item) => sum + item.transferSize, navigation.transferSize),
          jsBytes: resources.filter(item => item.name.includes(".js")).reduce((sum, item) => sum + item.transferSize, 0),
        };
      });
      const entry = { route, status: response.status(), ...metrics };
      report.pages.push(entry);
      console.log(JSON.stringify(entry));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
fs.mkdirSync("logs", { recursive: true });
const destination = path.resolve("logs", `load-${label}.json`);
fs.writeFileSync(destination, JSON.stringify(report, null, 2));
console.log(`Messung gespeichert: ${destination}`);
if (report.errors.length || report.pages.some(page => page.status !== 200)) process.exitCode = 1;
