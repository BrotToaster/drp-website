import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("drp-intro-v1", "skipped"));
});

test("Regeln sind nach Bereichen lesbar und bestehende Direktlinks öffnen den Volltext", async ({ page, isMobile }) => {
  await page.goto("/regelwerk");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Regelwerk.");
  const total = await page.locator(".rule-entry").count();
  expect(total).toBeGreaterThan(0);
  await expect(page.locator(".rule-entry[open]")).toHaveCount(0);
  if (isMobile) await page.getByLabel("Bereich", { exact: true }).selectOption("Discord-Regelwerk");
  else await page.getByRole("navigation", { name: "Regelwerk nach Bereichen" }).getByRole("button", { name: /^Discord-Regelwerk/ }).click();
  await expect(page.locator(".rules-group-heading h3")).toHaveText("Discord-Regelwerk");
  expect(await page.locator(".rule-entry").count()).toBeLessThan(total);
  const first = page.locator(".rule-entry").first();
  const slug = await first.getAttribute("id");
  const title = await first.locator("h4").textContent();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator(".rich-content")).toBeVisible();
  await first.getByRole("link", { name: "Direktlink", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#${slug}$`));
  await page.reload();
  const linked = page.locator(`[id="${slug}"]`);
  await expect(linked).toHaveAttribute("open", "");
  await expect(linked.locator("h4")).toHaveText(title || "");
  await expect(linked.locator(".rich-content")).toBeVisible();
  await expect.poll(async () => linked.evaluate(node => node.getBoundingClientRect().top)).toBeGreaterThan(isMobile ? 190 : 140);
});

test("Suche zeigt Fundstellen, behandelt leere Ergebnisse und bleibt per Tastatur erreichbar", async ({ page }) => {
  await page.goto("/regelwerk");
  const total = await page.locator(".rule-entry").count();
  const search = page.getByRole("searchbox", { name: "Regelwerk durchsuchen" });
  await search.fill("OOC");
  await expect(page.locator(".rules-results-heading h2")).toHaveText("Suchergebnisse");
  await expect(page.locator(".rule-entry mark").first()).toBeVisible();
  await expect.poll(() => page.locator(".rule-entry").count()).toBeLessThan(total);
  await page.locator(".rule-entry").first().locator("summary").click();
  await expect(page.locator(".rule-entry .rich-content mark").first()).toBeVisible();
  await search.fill("unauffindbar-xyz-zzzz");
  await expect(page.getByRole("heading", { name: "Keine passende Regel gefunden." })).toBeVisible();
  await page.getByRole("button", { name: "Suche und Filter zurücksetzen" }).click();
  await expect(page.locator(".rule-entry")).toHaveCount(total);
  await expect(search).toBeFocused();
  await search.fill("Verkehr");
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(page.locator(".rule-entry")).toHaveCount(total);
  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
});

test("Mausrad und Tastatur scrollen verlässlich; Suche und Seitennavigation bleiben stehen", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/regelwerk");
  await expect(page.locator("html")).toHaveAttribute("data-scroll-mode", isMobile ? "native" : "smooth");
  await page.mouse.move(isMobile ? 300 : 1000, 600);
  await page.mouse.wheel(0, 750);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
  await expect.poll(() => page.locator(".public-header").evaluate(node => Math.abs(node.getBoundingClientRect().top))).toBeLessThan(2);
  await expect.poll(() => page.locator(".rules-toolbar").evaluate(node => node.getBoundingClientRect().top)).toBeLessThan(85);
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(700);
  await page.getByRole("button", { name: "Nach oben", exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  // Optional smoothing must not keep a requestAnimationFrame loop alive at rest.
  const idleFrames = await page.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const original = window.requestAnimationFrame;
    let calls = 0;
    window.requestAnimationFrame = callback => { calls++; return original.call(window, callback); };
    await new Promise(resolve => setTimeout(resolve, 350));
    window.requestAnimationFrame = original;
    return calls;
  });
  expect(idleFrames).toBeLessThan(8);
});

test("Alle Regeln bleiben auch ohne JavaScript lesbar", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/regelwerk`);
    const first = page.locator(".rule-entry").first();
    await first.locator("summary").click();
    await expect(first.locator(".rich-content")).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  } finally { await context.close(); }
});

test("Portalmenüs scrollen unabhängig und offene Dialoge halten die Seite im Hintergrund fest", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: isMobile ? 390 : 1280, height: 600 });
  await page.goto("/login");
  const demo = page.getByRole("button", { name: "Demo als Owner öffnen" });
  test.skip(!(await demo.isVisible()), "Lokaler Testzugang ist nicht eingeschaltet.");
  await demo.click();
  await page.waitForURL(/\/dashboard/);
  await page.goto("/admin");
  await expect(page.locator("html")).toHaveAttribute("data-scroll-mode", isMobile ? "native" : "smooth");
  if (isMobile) await page.getByRole("button", { name: "Portal-Navigation öffnen" }).click();
  const navigation = page.locator(isMobile ? ".portal-mobile-drawer .portal-navigation" : ".portal-sidebar .portal-navigation");
  const before = await page.evaluate(() => scrollY);
  await navigation.hover({ position: { x: 80, y: 130 } });
  await page.mouse.wheel(0, 350);
  await expect.poll(() => navigation.evaluate(node => node.scrollTop)).toBeGreaterThan(40);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  if (isMobile) await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "DRP durchsuchen" })).toBeVisible();
  await page.mouse.move(isMobile ? 385 : 1275, 590);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "DRP durchsuchen" })).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/drp-scroll-locked/);
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(80);
});
