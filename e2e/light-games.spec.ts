import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("drp-appearance", "dark");
    localStorage.setItem("drp-intro-v1", "skipped");
  });
  await page.goto("/login");
});

test("zufällige Lichtspiele enden nach drei Runden, auch bei falscher Sonne", async ({ page }, testInfo) => {
  const toggle = page.getByRole("button", { name: "Dunkles Design", exact: true });
  const panel = page.getByRole("region", { name: "Kleine Lichtspiele" });
  const orders = [];
  for (const seed of [0.1, 0.9]) {
    await page.evaluate(value => { Math.random = () => value; }, seed);
    await toggle.click();
    const order = [];
    for (let round = 0; round < 3; round++) {
      await expect(panel).toBeVisible();
      await expect(panel.getByText(`Runde ${round + 1} von 3`, { exact: true })).toBeVisible();
      if (seed === 0.1 && round === 0) await page.screenshot({ path: `logs/light-games-${testInfo.project.name}.png` });
      const kind = await panel.locator("[data-game]").getAttribute("data-game");
      order.push(kind);
      const box = await panel.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      if (kind === "dimmer") {
        await panel.getByRole("slider", { name: "Lichtstärke" }).focus();
        await panel.getByRole("slider", { name: "Lichtstärke" }).press("End");
      } else if (kind === "sun") {
        await panel.getByRole("button", { name: /Mond/ }).first().click();
      } else {
        await panel.getByRole("button", { name: "Licht an", exact: true }).click();
        if (await panel.getByText(`Runde ${round + 1} von 3`, { exact: true }).isVisible()) {
          await panel.getByRole("button", { name: "Licht an", exact: true }).click();
        }
      }
    }
    expect(new Set(order).size).toBe(3);
    orders.push(order.join(","));
    await expect(panel).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-appearance", "light");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  }
  expect(orders[0]).not.toBe(orders[1]);
});

test("Überspringen schaltet sofort hell und speichert die Wahl", async ({ page }) => {
  await page.getByRole("button", { name: "Dunkles Design", exact: true }).click();
  await page.getByRole("button", { name: "Direkt hell schalten" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "light");
  expect(await page.evaluate(() => localStorage.getItem("drp-appearance"))).toBe("light");
});

test("Escape bricht ab und Tastatur wechselt ohne Spiele", async ({ page }) => {
  const toggle = page.getByRole("button", { name: "Dunkles Design", exact: true });
  await toggle.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Kleine Lichtspiele" })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  await expect(toggle).toBeFocused();
  await toggle.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "light");
});

test("reduzierte Bewegung überspringt alle Spiele", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Dunkles Design", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "light");
  await expect(page.getByRole("region", { name: "Kleine Lichtspiele" })).toHaveCount(0);
});
