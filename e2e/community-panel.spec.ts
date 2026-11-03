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
    await expect(factions.locator("li > img")).toHaveCount(6);
    for (const image of await factions.locator("img").all()) await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await factions.screenshot({ path: `logs/factions-${appearance}-${testInfo.project.name}.png` });
    await expect(factions.getByRole("heading", { name: "Landesverwaltung", exact: true })).toBeVisible();
    const cta = page.locator(".home-account-support");
    const contrast = await cta.evaluate(panel => {
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const background = luminance(getComputedStyle(panel).backgroundColor);
      return [...panel.querySelectorAll("h2,h3,p,.button-secondary")].map(element => {
        const foreground = luminance(getComputedStyle(element).color);
        return (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
      });
    });
    expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
    await cta.screenshot({ path: `logs/account-support-${appearance}-${testInfo.project.name}.png` });
    const footer = page.locator(".site-footer");
    for (const name of ["Roleplay", "Community", "Hilfe & Kontakt", "Rechtliches"]) await expect(footer.getByRole("navigation", { name, exact: true })).toBeAttached();
    await footer.screenshot({ path: `logs/footer-organized-${appearance}-${testInfo.project.name}.png` });
    const gallery = page.locator(".community-scenes");
    await gallery.scrollIntoViewIfNeeded();
    for (const image of await gallery.locator("img").all()) await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: `logs/community-${appearance}-${testInfo.project.name}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("Fraktionsvorstellung lässt sich speichern, neu laden und ausblenden", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Schreibprüfung seriell nur einmal in der separaten Regression-Datenbank.");
  await page.goto("/login");
  const demo = page.getByRole("button", { name: "Demo als Owner öffnen" });
  test.skip(!(await demo.isVisible()), "Nur in der ausdrücklich lokalen Testumgebung.");
  await demo.click(); await page.waitForURL(/\/dashboard$/);
  const editor = page.locator('[data-faction-editor="LANDESVERWALTUNG"]');
  const open = async () => { await page.goto("/admin/website"); await editor.locator("summary").click(); };
  const save = async () => {
    await editor.getByRole("button", { name: "Vorstellung speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Fraktionsvorstellung wurde gespeichert." }).first()).toBeVisible();
  };
  const description = "Vorstellung aus dem automatischen Fraktionstest.\nEin zweiter Absatz bleibt erhalten.";
  try {
    await open();
    await expect(page.locator("[data-faction-editor]")).toHaveCount(6);
    await editor.getByRole("textbox", { name: "Beschreibung", exact: true }).fill(description);
    await save();
    await open();
    await expect(editor.getByRole("textbox", { name: "Beschreibung", exact: true })).toHaveValue(description);
    await page.goto("/");
    await expect(page.locator('[data-faction="LANDESVERWALTUNG"]')).toContainText("Ein zweiter Absatz bleibt erhalten.");
    await open(); await editor.getByLabel("Öffentlich sichtbar").uncheck(); await save();
    await page.goto("/"); await expect(page.locator('[data-faction="LANDESVERWALTUNG"]')).toHaveCount(0);
  } finally {
    await open(); await editor.getByRole("textbox", { name: "Beschreibung", exact: true }).fill(""); await editor.getByLabel("Öffentlich sichtbar").check(); await save();
  }
});
