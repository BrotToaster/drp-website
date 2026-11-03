import { expect, test } from "@playwright/test";
import { commonErrors } from "../lib/common-errors";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("drp-intro-v1", "skipped"));
});

test("deutschsprachige Community und offizielles TikTok-Profil ohne Tracking-Embed", async ({ page }, testInfo) => {
  const tiktokRequests: string[] = [];
  page.on("request", request => { if (/tiktok\.com|tiktokcdn\.com/.test(request.url())) tiktokRequests.push(request.url()); });
  for (const mode of ["light", "dark"]) {
    await page.addInitScript(value => localStorage.setItem("drp-appearance", value), mode);
    await page.goto("/");
    const region = page.locator(".german-speaking-community");
    await expect(region.getByRole("img", { name: "Deutschland", exact: true })).toBeVisible();
    await expect(region.getByRole("img", { name: "Schweiz", exact: true })).toBeVisible();
    await expect(region.getByRole("img", { name: "Österreich", exact: true })).toBeVisible();
    await expect(region).toContainText("Deine Nationalität ist egal");
    await expect(page.locator(".community-tiktok-link")).toHaveAttribute("href", "https://www.tiktok.com/@deutschland.rp.erlc");
    await expect(page.locator('iframe[src*="tiktok"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await region.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `logs/reliability-community-${mode}-${testInfo.project.name}.png` });
  }
  expect(tiktokRequests).toEqual([]);
});

test("echte 404 und verständliche Hilfe für übliche Fehler in beiden Designs", async ({ page, request }, testInfo) => {
  for (const [code, content] of Object.entries(commonErrors)) {
    const help = await request.get(`/fehler/${code}`);
    expect(help.status()).toBe(200);
    expect(await help.text()).toContain(content.title);
  }
  expect((await request.get("/fehler/unknown" )).status()).toBe(404);
  for (const mode of ["light", "dark"]) {
    await page.addInitScript(value => localStorage.setItem("drp-appearance", value), mode);
    const response = await page.goto("/diese-seite-gibt-es-nicht");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: commonErrors["404"].title })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kontakt zum Team", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `logs/reliability-error-${mode}-${testInfo.project.name}.png` });
  }
});

test("bei Verbindungsverlust bleiben ungesendete Formulareingaben erhalten", async ({ page, context }) => {
  await page.goto("/kontakt");
  const message = page.getByRole("textbox", { name: "Nachricht", exact: true });
  await message.fill("Diese Nachricht ist noch nicht abgesendet und muss erhalten bleiben.");
  await context.setOffline(true);
  await expect(page.getByRole("status").filter({ hasText: "Keine Internetverbindung" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Verbindungshilfe (neuer Tab)" })).toHaveAttribute("target", "_blank");
  await expect(message).toHaveValue("Diese Nachricht ist noch nicht abgesendet und muss erhalten bleiben.");
  await context.setOffline(false);
  await expect(page.getByRole("status").filter({ hasText: "Keine Internetverbindung" })).toHaveCount(0);
  await expect(message).toHaveValue("Diese Nachricht ist noch nicht abgesendet und muss erhalten bleiben.");
});

test("Kalenderfehler ist sichtbar und lässt sich gezielt erneut laden", async ({ page }) => {
  let available = false;
  await page.route("**/api/calendar?*", route => route.fulfill({ status: available ? 200 : 503, contentType: "application/json", body: JSON.stringify(available ? { occurrences: [] } : { error: "Kalender nicht verfügbar" }) }));
  await page.goto("/kalender");
  const alert = page.getByRole("alert").filter({ hasText: "Der Kalender ist gerade nicht verfügbar" });
  await expect(alert).toBeVisible();
  available = true;
  await alert.getByRole("button", { name: "Termine erneut laden" }).click();
  await expect(alert).toHaveCount(0);
});
