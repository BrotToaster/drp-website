import { expect, test } from "@playwright/test";

test("Startseitenbewegung erhält Scrollen und räumt beim Seitenwechsel auf", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("[data-drp-home]")).toHaveAttribute("data-motion", "ready");
  await expect(page.locator("html")).toHaveClass(isMobile ? /^(?!.*\blenis\b)/ : /\blenis\b/);
  await page.mouse.wheel(0, 650);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await page.locator(".hero-secondary-link").click();
  await expect(page).toHaveURL(/\/server$/);
  await expect(page.locator("html")).toHaveAttribute("data-scroll-mode", isMobile ? "native" : "smooth");
  await expect(page.getByRole("heading", { name: "Ein Server mit Haltung." })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Reduzierte Bewegung schaltet laufende Scroll-Effekte ab", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("[data-drp-home]")).toHaveAttribute("data-motion", "ready");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-drp-home]")).toHaveAttribute("data-motion", "native");
  await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  await expect(page.getByRole("link", { name: "Auf Discord beitreten" })).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
});

test("Datensparmodus und fehlendes JavaScript erhalten die Inhalte", async ({ browser, baseURL, isMobile }) => {
  const viewport = isMobile ? { width: 390, height: 844 } : { width: 1365, height: 900 };
  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport });
  try {
    const page = await staticContext.newPage();
    await page.goto(`${baseURL}/`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dein Einsatz.");
    await expect(page.getByRole("link", { name: "Auf Discord beitreten" })).toBeVisible();
    await page.locator("#einstieg").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "In drei Schritten ins Roleplay." })).toBeVisible();
  } finally { await staticContext.close(); }
  const savingContext = await browser.newContext({ viewport, reducedMotion: "no-preference" });
  try {
    await savingContext.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
    const page = await savingContext.newPage();
    await page.goto(`${baseURL}/`);
    await expect(page.locator("[data-drp-home]")).toHaveAttribute("data-motion", "native");
    await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
    await expect(page.getByRole("link", { name: "Auf Discord beitreten" })).toBeVisible();
  } finally { await savingContext.close(); }
});
