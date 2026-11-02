export const introStorageKey = "drp-intro-v1";
export const introStartEvent = "drp:intro:start";
export const introVisibilityEvent = "drp:intro:visibility";
export const introSessionKey = "drp-intro-session-v1";
export const introSteps = [
  { id: "server", label: "Serverzugang", path: "/server", target: '[data-intro="server"]', title: "So kommst du ins Spiel.", text: "Auf Discord findest du die Community und die Hinweise zum Serverzugang. Über Roblox öffnest du ER:LC. Beide Links öffnen einen neuen Tab; die Tour bleibt hier.", hint: "Auf dieser Seite stehen auch der Serverstatus und die Voraussetzungen für deinen Einstieg." },
  { id: "rules", label: "Regelwerk", path: "/regelwerk", target: '[data-intro="rules"]', title: "Finde die Regel, die du brauchst.", text: "Lies das Regelwerk vor deinem ersten Einsatz. Mit der Suche und den Bereichen findest du später einzelne Regeln wieder; ein Klick auf eine Regel öffnet den Volltext.", hint: "Probier es aus: Suche nach „OOC“ und öffne einen Treffer. Du kannst auch direkt weitergehen." },
  { id: "news", label: "News", path: "/news", target: '[data-intro="news"] > a:first-child, [data-intro="news"]', title: "Hier liest du, was sich ändert.", text: "In den News veröffentlicht das Team Updates und Ankündigungen. Öffne einen Beitrag, um den vollständigen Text und seine Anhänge zu lesen.", hint: "Du kannst dich umsehen. Über „Weiter“ setzt du die Tour fort." },
  { id: "calendar", label: "Kalender", path: "/kalender", target: '.calendar-filters, [data-intro="calendar"]', title: "Behalte die Termine im Blick.", text: "Im Kalender stehen veröffentlichte Events und Termine. Über diese Schalter blendest du Kategorien ein und aus. Mit den Pfeilen wechselst du den Zeitraum.", hint: "Ein Klick auf einen Termin öffnet seine Details. Eine leere Ansicht bedeutet: Für diesen Zeitraum wird gerade kein passender Termin angezeigt." },
  { id: "support", label: "Hilfe", path: "/kontakt", target: '[data-intro="support"]', title: "Wähle die richtige Anlaufstelle.", text: "Für Spielsupport, Reports und Appeals nutzt du Discord beziehungsweise Melonly. Bei technischen Fragen zur Website kannst du das Kontaktformular auch ohne Konto verwenden.", hint: "Bei einem Gastticket erhältst du einen privaten Zugangslink. Bewahre ihn auf und teile ihn nicht." },
  { id: "account", label: "Dein Konto", path: "/registrieren", target: '[data-intro="account"]', title: "Jetzt bist du bei deinem Konto.", text: "Starte die Registrierung mit Discord oder Roblox. Danach verknüpfst du das zweite Konto. Du meldest dich beim jeweiligen Anbieter an; dein Passwort erhält DRP nicht.", hint: "Anschließend findest du unter „Mein DRP“ dein Profil mit deinen Rollen, die Regelbestätigung und deine Website-Tickets." },
] as const;

export function introSessionStep(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) return null;
  const step = Number(value);
  return Number.isInteger(step) && step >= 0 && step < introSteps.length ? step : null;
}

export function introWasSeen(value: string | null) {
  return value === "completed" || value === "skipped";
}

export function introRouteAllowed(path: string) {
  return /^\/(?:$|server(?:\/|$)|regelwerk(?:\/|$)|news(?:\/|$)|kalender(?:\/|$)|team(?:\/|$)|faq(?:\/|$)|status(?:\/|$))/.test(path);
}
