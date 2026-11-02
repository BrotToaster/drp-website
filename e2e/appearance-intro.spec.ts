import { expect, test, type Page } from "@playwright/test";

const tour = (page: Page) => page.getByRole("complementary", { name: "Einführung", exact: true });
async function station(page: Page, id: string, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(tour(page)).toHaveAttribute("data-tour-step", id);
  const ring = page.locator("[data-intro-ring]");
  await expect(ring).toHaveAttribute("height", /^(?:[1-9]\d*)(?:\.\d+)?$/);
  const card = await tour(page).boundingBox();
  const target = await ring.boundingBox();
  expect(card).not.toBeNull(); expect(target).not.toBeNull();
  if (card && target) {
    expect(card.x).toBeGreaterThanOrEqual(0);
    const viewport = page.viewportSize()!;
    expect(card.x + card.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(card.y + card.height).toBeLessThanOrEqual(viewport.height + 1);
    const overlap = Math.max(0, Math.min(card.x + card.width, target.x + target.width) - Math.max(card.x, target.x)) * Math.max(0, Math.min(card.y + card.height, target.y + target.height) - Math.max(card.y, target.y));
    expect(overlap).toBe(0);
  }
}

test("Darstellung folgt dem System und merkt sich die ausdrückliche Wahl im Portal", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  const theme = page.getByRole("button", { name: "Dunkles Design", exact: true });
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await theme.focus();
  await theme.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "light");
  const demo = page.getByRole("button", { name: "Demo als Owner öffnen" });
  test.skip(!(await demo.isVisible()), "Der lokale Demo-Zugang ist nicht eingeschaltet.");
  await demo.click();
  await page.waitForURL(/\/dashboard/);
  await page.getByRole("button", { name: "Dunkles Design", exact: true }).click();
  await page.goto("/dashboard/profil");
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  await expect(page.getByRole("region", { name: "Deine Rollen" })).toBeVisible();
});

test("Einführung bleibt freiwillig, respektiert Überspringen und lässt sich neu starten", async ({ page }) => {
  await page.goto("/");
  await expect(tour(page)).toBeVisible();
  await tour(page).getByRole("button", { name: "Überspringen" }).click();
  await expect(tour(page)).toHaveCount(0);
  await page.reload();
  await expect(tour(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Einführung ansehen" }).click();
  await station(page, "server", "/server");
  await page.keyboard.press("Escape");
  await expect(tour(page)).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("drp-intro-session-v1"))).toBeNull();
});

test("Tour führt durch echte Bedienelemente, lässt Ausprobieren zu und endet bei der Registrierung", async ({ page }) => {
  await page.goto("/");
  await tour(page).getByRole("button", { name: "Einführung starten" }).click();
  await station(page, "server", "/server");
  await expect(page.locator('[data-intro="server"]').getByRole("link", { name: "Discord öffnen" })).toHaveAttribute("target", "_blank");
  await tour(page).getByRole("button", { name: "Weiter: Regelwerk" }).click();
  await station(page, "rules", "/regelwerk");
  await tour(page).getByRole("button", { name: "Suche ausprobieren" }).click();
  const search = page.getByRole("searchbox", { name: "Regelwerk durchsuchen" });
  await expect(search).toBeFocused();
  await search.fill("OOC");
  await expect(page.locator(".rule-entry mark").first()).toBeVisible();
  await page.locator(".rule-entry summary").first().click();
  await expect(page.locator(".rule-entry[open]").first()).toBeVisible();
  await tour(page).getByRole("button", { name: "Weiter: News" }).click();
  await station(page, "news", "/news");
  await page.locator('[data-intro="news"] > a').first().click();
  await expect(tour(page).getByRole("button", { name: "Zurück zur Tour" })).toBeVisible();
  await tour(page).getByRole("button", { name: "Zurück zur Tour" }).click();
  await station(page, "news", "/news");
  await tour(page).getByRole("button", { name: "Weiter: Kalender" }).click();
  await station(page, "calendar", "/kalender");
  const category = page.locator(".calendar-filters button").first();
  await expect(category).toBeVisible();
  await category.click();
  await expect(category).toHaveAttribute("aria-pressed", "false");
  await tour(page).getByRole("button", { name: "Weiter: Hilfe" }).click();
  await station(page, "support", "/kontakt");
  await tour(page).getByRole("button", { name: "Weiter: Dein Konto" }).click();
  await station(page, "account", "/registrieren");
  await tour(page).getByRole("button", { name: "Jetzt Konto erstellen" }).click();
  await expect(tour(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrierung mit Discord starten" })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("drp-intro-v1"))).toBe("completed");
  await page.goto("/");
  await expect(tour(page)).toHaveCount(0);
});

test("Neuladen und Zurück erhalten die Station; reduzierte Bewegung und dunkle Darstellung funktionieren", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await tour(page).getByRole("button", { name: "Einführung starten" }).click();
  await station(page, "server", "/server");
  await tour(page).getByRole("button", { name: "Weiter: Regelwerk" }).click();
  await station(page, "rules", "/regelwerk");
  await page.reload();
  await station(page, "rules", "/regelwerk");
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-scroll-mode", "native");
  await tour(page).getByRole("button", { name: "Zurück", exact: true }).click();
  await station(page, "server", "/server");
  await tour(page).getByRole("button", { name: "Überspringen" }).click();
  await page.reload();
  await expect(tour(page)).toHaveCount(0);
});

test("Tour bleibt bei gesperrtem Speicher bedienbar und hält private Seiten frei", async ({ page, context }) => {
  await context.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) Object.defineProperty(Storage.prototype, method, { value: () => { throw new Error("Storage denied"); } });
  });
  await page.goto("/");
  await tour(page).getByRole("button", { name: "Einführung starten" }).click();
  await station(page, "server", "/server");
  await tour(page).getByRole("button", { name: "Weiter: Regelwerk" }).click();
  await station(page, "rules", "/regelwerk");
  await tour(page).getByRole("button", { name: "Überspringen" }).click();
  await expect(tour(page)).toHaveCount(0);
  await page.goto("/datenschutz");
  await expect(tour(page)).toHaveCount(0);
});
