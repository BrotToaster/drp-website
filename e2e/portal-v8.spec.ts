import { expect, test, type Page } from "@playwright/test";

async function loginDemo(page: Page) {
  await page.goto("/login");
  const demo = page.getByRole("button", { name: "Demo als Owner öffnen" });
  if (!(await demo.isVisible().catch(() => false))) return false;
  await demo.click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 }).catch(() => undefined);
  return page.locator(".portal-app").isVisible().catch(() => false);
}

test("öffentliche Navigation bleibt bei allen Zielbreiten bedienbar", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
    if (width <= 768) {
      await page.getByRole("button", { name: "Navigation öffnen" }).click();
      const mobileNavigation = page.getByRole("navigation", { name: "Mobile Navigation" });
      await expect(mobileNavigation).toBeVisible();
      await expect(mobileNavigation.getByRole("link", { name: /Kalender/ })).toBeVisible();
      await mobileNavigation.getByRole("link", { name: /Kalender/ }).click();
      await expect(page).toHaveURL(/\/kalender$/);
      await expect(mobileNavigation).toBeHidden();
    } else {
      await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
      await page.getByRole("button", { name: "Entdecken" }).click();
      const serverLink = page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: /Server/ });
      await expect(serverLink).toBeVisible();
      await serverLink.click();
      await expect(page).toHaveURL(/\/server$/);
      await expect(serverLink).toBeHidden();
    }
  }
});

test("Regelwerksuche öffnet weich und bleibt per Tastatur bedienbar", async ({ page }) => {
  await page.goto("/regelwerk");
  const search = page.getByRole("textbox", { name: "Regelwerk durchsuchen" });
  await expect(search).toBeHidden();
  await page.getByRole("button", { name: "Regelwerk durchsuchen" }).click();
  await expect(search).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill("Verkehr");
  await search.press("Escape");
  await expect(search).toBeHidden();
});

test("Kontaktseite trennt Gast-, Discord- und Ownership-Ablauf", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByLabel("Dein Name")).toBeVisible();
  await expect(page.getByLabel("Kategorie")).toHaveValue("CONTACT");
  await expect(page.getByRole("link", { name: "Discord-Support öffnen ↗" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Anmelden & erstellen" })).toHaveAttribute("href", "/dashboard/tickets?category=OWNERSHIP");
});

test("vollständiger Gastticket-Ablauf tauscht Token gegen saubere Ticket-URL", async ({ page }) => {
  const databaseProbe = await page.request.get("/api/search?q=status");
  test.skip(databaseProbe.status() === 503, "Lokale Testdatenbank ist nicht verfügbar.");
  await page.goto("/kontakt");
  const marker = Date.now();
  await page.getByLabel("Dein Name").fill("Playwright Gast");
  await page.getByLabel("Discord-Name (optional)").fill("@playwright-test");
  await page.getByLabel("Betreff").fill(`Technischer E2E-Test ${marker}`);
  await page.getByLabel("Nachricht").fill("Dies ist eine ausreichend lange automatisierte Testnachricht für den geschützten Gastticket-Ablauf.");
  await page.getByRole("button", { name: "Sicheres Ticket erstellen" }).click();
  await expect(page.getByText("Dein sicherer Zugangslink")).toBeVisible();
  await page.getByRole("link", { name: "Ticket jetzt öffnen" }).click();
  await expect(page).toHaveURL(/\/kontakt\/ticket\/[^?]+$/);
  await page.getByLabel("Antwort").fill("Geschützte Rückfrage aus dem Gastzugang.");
  await page.getByRole("button", { name: "Antwort senden" }).click();
  await expect(page.getByText("Geschützte Rückfrage aus dem Gastzugang.")).toBeVisible();
});

test("Portal filtert Navigation, öffnet Command Palette und zeigt Live-Betrieb", async ({ page }) => {
  const ready = await loginDemo(page);
  test.skip(!ready, "Lokale Testdatenbank oder Demo-Login ist nicht verfügbar.");
  await expect(page.locator(".public-header")).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "DRP durchsuchen" })).toBeVisible();
  await page.getByLabel("Suchbegriff").fill("Ownership");
  await expect(page.getByText("Website-Tickets").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/dashboard/tickets?category=OWNERSHIP");
  await expect(page.getByLabel("Kategorie")).toHaveValue("OWNERSHIP");
  await page.goto("/staff");
  await page.getByRole("tab", { name: "Live-Karte" }).click();
  await expect(page.getByText(/Live-Positionen|Live-Karte offline|Letzter verfügbarer Stand/)).toBeVisible();
});

test("entfernte Übergabeseiten liefern 404 und fehlen im Portal", async ({ page }) => {
  for (const path of ["/dashboard/bewerbung", "/staff/bewerbungen", "/staff/sanktionen"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
});

test("Admin-Formular beendet den Speichern-Status zuverlässig", async ({ page }) => {
  const ready = await loginDemo(page);
  test.skip(!ready, "Lokale Testdatenbank oder Demo-Login ist nicht verfügbar.");
  await page.goto("/admin/website");
  const save = page.getByRole("button", { name: "Links speichern" });
  await save.click();
  await expect(page.getByText("Öffentliche Links wurden gespeichert.")).toBeVisible();
  await expect(save).toBeEnabled();
  await expect(save).toHaveText("Links speichern");
});

test("Ticketstatus bleibt nach erfolgreicher Änderung nicht im Pending-Zustand", async ({ page }) => {
  const ready = await loginDemo(page);
  test.skip(!ready, "Lokale Testdatenbank oder Demo-Login ist nicht verfügbar.");
  await page.goto("/staff/tickets");
  const setButton = page.getByRole("button", { name: "Setzen" }).first();
  test.skip(!(await setButton.isVisible().catch(() => false)), "Kein änderbares lokales Testticket vorhanden.");
  await setButton.click();
  await expect(page.getByText("Status wurde aktualisiert.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Setzen" }).first()).toBeEnabled();
});

test("öffentliche Suche liefert keine geschützten Ergebnistypen", async ({ request }) => {
  const response = await request.get("/api/search?q=admin");
  expect([200, 503]).toContain(response.status());
  const body = await response.json() as { results: Array<{ kind: string }> };
  expect(body.results.some((result) => ["Nutzer", "Dokument", "Staff-Ticket"].includes(result.kind))).toBe(false);
});
