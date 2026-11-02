import { expect, test } from "@playwright/test";

test("Datenschutz und Nutzungsregeln bleiben erreichbar; die alte Anbieteradresse leitet weiter", async ({ page }) => {
  for (const path of ["/datenschutz", "/nutzungsbedingungen"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Lokale Vorschau – Musterangaben")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("footer").getByRole("link", { name: "Datenschutz", exact: true })).toHaveAttribute("href", "/datenschutz");
  }
  await page.goto("/impressum");
  await expect(page).toHaveURL(/\/datenschutz#verantwortlicher$/);
  await expect(page.getByRole("heading", { name: "Verantwortliche Stelle", exact: true })).toBeVisible();
  await expect(page.locator("footer").getByRole("link", { name: "Impressum", exact: true })).toHaveCount(0);
});

test("lokale Vorschau bleibt aus Suchmaschinen und private APIs bleiben geschützt", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("<loc>");
  const bot = await request.get("/api/bot/data");
  expect(bot.status()).toBe(401);
  expect(bot.headers()["cache-control"]).toContain("no-store");
  const home = await request.get("/");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["x-robots-tag"]).toContain("noindex");
  expect(home.headers()["strict-transport-security"]).toBeUndefined();
});

test("Startseite hat einen klaren Einstieg und lädt keine Drittanbieter im Browser", async ({ page, baseURL }) => {
  const external = new Set<string>();
  const origin = new URL(baseURL || "http://127.0.0.1:3107").origin;
  page.on("request", request => { const url = new URL(request.url()); if (/^https?:$/.test(url.protocol) && url.origin !== origin) external.add(url.origin); });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Auf Discord beitreten" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect([...external]).toEqual([]);
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /favicon|icon/);
});
