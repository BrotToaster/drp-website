import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("drp-intro-v1", "skipped"));
});

test("Panelwechsel bewahrt Menüposition und Leseposition, auch auf Mobil", async ({ page, isMobile }, testInfo) => {
  const openMobileNavigation = async () => {
    const trigger = page.getByRole("button", { name: "Portal-Navigation öffnen" });
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    if (!box) throw new Error("Mobiler Menüknopf ist nicht erreichbar.");
    // A real touch must not perform the locator's preliminary scrollIntoView
    // on this already visible sticky control and change the position under test.
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  };
  await page.goto("/login");
  const demo = page.getByRole("button", { name: "Demo als Owner öffnen" });
  test.skip(!(await demo.isVisible()), "Nur in der ausdrücklich aktivierten lokalen Testumgebung.");
  await demo.click();
  await page.waitForURL(/\/dashboard$/);
  await page.goto("/admin/website");
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
  const readingPosition = await page.evaluate(() => scrollY);
  if (isMobile) await openMobileNavigation();
  const navigation = page.getByRole("navigation", { name: "Administration Navigation" }).filter({ visible: true });
  await navigation.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect.poll(() => navigation.evaluate(node => node.scrollTop)).toBeGreaterThan(50);
  const menuPosition = await navigation.evaluate(node => node.scrollTop);
  await navigation.getByRole("link", { name: "Datenschutz", exact: true }).click();
  await page.waitForURL(/\/admin\/rechtliches$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(readingPosition - 30);
  if (isMobile) await openMobileNavigation();
  const restored = page.getByRole("navigation", { name: "Administration Navigation" }).filter({ visible: true });
  await expect.poll(() => restored.evaluate(node => node.scrollTop)).toBeGreaterThan(menuPosition - 3);
  await page.reload();
  if (isMobile) await openMobileNavigation();
  await expect.poll(() => page.getByRole("navigation", { name: "Administration Navigation" }).filter({ visible: true }).evaluate(node => node.scrollTop)).toBeGreaterThan(menuPosition - 3);
  await page.screenshot({ path: `logs/panel-light-${testInfo.project.name}.png` });
  await page.evaluate(() => { localStorage.setItem("drp-appearance", "dark"); document.documentElement.dataset.appearance = "dark"; });
  await expect(page.locator(".portal-nav-link:not(.active)").filter({ visible: true }).first()).toHaveCSS("color", "rgb(195, 185, 171)");
  await page.screenshot({ path: `logs/panel-dark-${testInfo.project.name}.png` });
});

test("Originale Fraktionslogos und Communitybilder laden in beiden Designs", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const appearance of ["light", "dark"]) {
    await page.addInitScript(mode => localStorage.setItem("drp-appearance", mode), appearance);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-appearance", appearance);
    const factions = page.getByRole("list", { name: "Hauptfraktionen im Roleplay" });
    await factions.scrollIntoViewIfNeeded();
    await expect(factions.locator("img")).toHaveCount(5);
    for (const image of await factions.locator("img").all()) await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await factions.screenshot({ path: `logs/factions-${appearance}-${testInfo.project.name}.png` });
    const gallery = page.locator(".community-scenes");
    await gallery.scrollIntoViewIfNeeded();
    for (const image of await gallery.locator("img").all()) await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: `logs/community-${appearance}-${testInfo.project.name}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(errors).toEqual([]);
});
