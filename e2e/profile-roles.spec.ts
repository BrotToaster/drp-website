import { expect, test } from "@playwright/test";

test("Profilrollen bleiben ohne Anmeldung geschützt", async ({ page }) => {
  await page.goto("/dashboard/profil");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Deine Rollen" })).toHaveCount(0);
});

test("Profil trennt Discord-, Website- und Melonly-Rollen auch im Demokonto", async ({ page }) => {
  await page.goto("/login");
  const demo = page.getByRole("button", { name: "Demo als Owner öffnen" });
  test.skip(!(await demo.isVisible()), "Der lokale Demo-Zugang ist nicht eingeschaltet.");
  await demo.click();
  await page.waitForURL(/\/dashboard/);
  await page.goto("/dashboard/profil");
  const roles = page.getByRole("region", { name: "Deine Rollen" });
  await expect(roles).toBeVisible();
  await expect(roles.locator("dt")).toHaveText(["Discord", "Website", "Melonly"]);
  const groups = roles.locator("dd");
  await expect(groups.nth(1).getByRole("listitem").filter({ hasText: /^Owner$/ })).toBeVisible();
  // A demo website Owner must never be presented as a Discord or Melonly Owner.
  await expect(groups.nth(0).getByRole("listitem")).toHaveCount(0);
  await expect(groups.nth(2).getByRole("listitem")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Kontoverknüpfungen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mit Discord verbinden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Systemstatus öffnen" })).toBeVisible();
  const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
});
