import fs from "node:fs";
import { parseEnv } from "node:util";
import { expect, test } from "@playwright/test";

test.describe("isolierte Hostingvorschau", () => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW_TESTS !== "true", "Nur mit separater Vorschau-Datenbank und ihren ignorierten Zugangsdaten ausführen.");
  const config = process.env.PLAYWRIGHT_PREVIEW_TESTS === "true" ? parseEnv(fs.readFileSync("runtime/preview.env", "utf8")) : {};
  const credential = (key: string) => { const value = config[key]; if (!value) throw new Error(`Testkonfiguration fehlt: ${key}`); return value; };
  const basic = "Basic " + Buffer.from(`drp:${config.PREVIEW_ACCESS}`).toString("base64");
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders({ Authorization: basic });
    await context.addInitScript(() => localStorage.setItem("drp-intro-v1", "skipped"));
  });
  test("Passwortschutz umfasst HTML, RSC und APIs; Datenschutz bleibt erreichbar", async ({ playwright, request }) => {
    const anonymous = await playwright.request.newContext({ baseURL: config.SITE_URL });
    try {
      for (const path of ["/", "/dashboard", "/api/auth/providers", "/api/search?q=Beispiel", "/?_rsc=probe"]) expect((await anonymous.get(path)).status()).toBe(401);
      expect((await anonymous.get("/datenschutz")).status()).toBe(200);
    } finally { await anonymous.dispose(); }
    const response = await request.get("/", { headers: { Authorization: basic } });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const providers = await request.get("/api/auth/providers", { headers: { Authorization: basic } });
    expect(Object.keys(await providers.json())).toEqual(["preview"]);
    for (const path of ["/api/bot/data", "/api/media/sign"]) expect((await request.post(path, { headers: { Authorization: basic } })).status()).toBe(403);
    expect((await request.get("/api/preview/cleanup", { headers: { Authorization: basic } })).status()).toBe(401);
  });
  for (const role of ["member", "staff", "admin"] as const) {
    test(`${role}: Testkonto und zugehörige Bereiche funktionieren`, async ({ page, context }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/login");
      await page.getByRole("combobox", { name: "Testrolle", exact: true }).selectOption(role);
      await page.getByLabel("Passwort für diese Testrolle", { exact: true }).fill(credential(`PREVIEW_${role.toUpperCase()}_PASSWORD`));
      await page.getByRole("button", { name: "Testkonto öffnen", exact: true }).click();
      await page.waitForURL(/\/dashboard$/);
      await expect(page.getByRole("complementary", { name: "Entscheidungsvorschau", exact: true })).toBeVisible();
      const paths = role === "member" ? ["/dashboard", "/dashboard/profil", "/dashboard/tickets"] : role === "staff" ? ["/staff", "/staff/tickets", "/staff/dokumente/vorschau-handbuch", "/staff/kalender"] : ["/admin", "/admin/rollen", "/admin/rechtliches", "/admin/vorschau"];
      for (const path of paths) {
        const response = await page.goto(path, { waitUntil: "networkidle" });
        expect(response?.status()).toBe(200);
        expect(new URL(page.url()).pathname).toBe(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
      if (role === "member") {
        const other = await context.request.get("/dashboard/tickets/preview-ticket-other");
        expect([403, 404]).toContain(other.status());
        expect(await other.text()).not.toContain("Interne Testnotiz");
        const own = await context.request.get("/dashboard/tickets/preview-ticket-member");
        expect(own.status()).toBe(200);
        expect(await own.text()).not.toContain("Interne Testnotiz");
        const search = await context.request.get("/api/search?q=Beispielticket");
        const found = await search.json();
        expect(JSON.stringify(found)).not.toContain("preview-ticket-other");
        await page.goto("/admin");
        expect(new URL(page.url()).pathname).toBe("/dashboard");
        const doc = await context.request.get("/staff/dokumente/vorschau-handbuch");
        expect(await doc.text()).not.toContain("Es enthält keine echten Teamunterlagen");
      }
      await page.emulateMedia({ colorScheme: "dark" });
      await page.evaluate(() => { localStorage.setItem("drp-appearance", "dark"); document.documentElement.dataset.appearance = "dark"; window.dispatchEvent(new Event("drp:appearance")); });
      await expect(page.locator(".portal-nav-link:not(.active)").first()).toHaveCSS("color", "rgb(177, 177, 186)");
      await page.screenshot({ path: `logs/preview-${role}-${testInfo.project.name}.png` });
      expect(errors).toEqual([]);
    });
  }
  test("administrative Rücksetzung funktioniert auch im Produktionsbundle", async ({ page }, testInfo) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW_RESET_TESTS !== "true" || testInfo.project.name !== "desktop", "Separater serieller Lauf nach den Rollenprüfungen.");
    await page.goto("/login");
    await page.getByRole("combobox", { name: "Testrolle", exact: true }).selectOption("admin");
    await page.getByLabel("Passwort für diese Testrolle", { exact: true }).fill(credential("PREVIEW_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Testkonto öffnen", exact: true }).click();
    await page.waitForURL(/\/dashboard$/);
    await page.goto("/admin/vorschau");
    await page.getByLabel("Zur Bestätigung TESTDATEN eingeben").fill("TESTDATEN");
    await page.getByRole("button", { name: "Testdaten zurücksetzen", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "ursprünglichen Testdaten" })).toBeVisible({ timeout: 60000 });
  });
});
