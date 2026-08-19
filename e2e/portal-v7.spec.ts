import { expect, test } from "@playwright/test";

test("öffentliche Seiten bleiben innerhalb des Viewports", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(overflow.page).toBeLessThanOrEqual(overflow.viewport + 1);
});

test("Newsbeiträge verwenden den responsiven Lesebereich", async ({ page }) => {
  await page.goto("/news");
  const firstArticleLink = page.locator('a[href^="/news/"]').first();
  if (await firstArticleLink.count()) {
    await firstArticleLink.click();
    await expect(page.locator(".content-surface").first()).toBeVisible();
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(overflow.page).toBeLessThanOrEqual(overflow.viewport + 1);
  }
});

test("Formularfelder verwenden ein dunkles Farbschema", async ({ page }) => {
  await page.goto("/login");
  const colorScheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(colorScheme).toContain("dark");
});
