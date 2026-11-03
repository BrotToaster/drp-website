export const commonErrors = {
  "400": { title: "Die Anfrage ist unvollständig.", message: "Prüfe deine Eingaben und versuche es erneut.", action: "Zur Startseite", href: "/" },
  "401": { title: "Bitte melde dich an.", message: "Für diesen Bereich brauchst du ein angemeldetes Konto. Deine Sitzung ist möglicherweise abgelaufen.", action: "Zur Anmeldung", href: "/login" },
  "403": { title: "Dieser Bereich ist geschützt.", message: "Dein Konto hat für diese Funktion keine Berechtigung. Wenn du hier Zugriff erwartest, wende dich an das Team.", action: "Mein DRP öffnen", href: "/dashboard" },
  "404": { title: "Diese Straße endet hier.", message: "Die angeforderte Seite wurde nicht gefunden. Vielleicht wurde sie verschoben oder der Link ist nicht mehr aktuell.", action: "Zur Startseite", href: "/" },
  "405": { title: "Diese Anfrage passt hier nicht.", message: "Öffne die gewünschte Funktion über die Website und versuche es dort erneut.", action: "Zur Startseite", href: "/" },
  "408": { title: "Die Anfrage hat zu lange gedauert.", message: "Die Verbindung wurde unterbrochen. Prüfe vor erneutem Absenden, ob dein Vorgang bereits gespeichert wurde.", action: "Mein DRP öffnen", href: "/dashboard" },
  "409": { title: "Hier hat sich etwas geändert.", message: "Der Eintrag wurde inzwischen bearbeitet. Lade den aktuellen Stand, bevor du deine Änderungen erneut speicherst.", action: "Mein DRP öffnen", href: "/dashboard" },
  "410": { title: "Dieser Link ist nicht mehr gültig.", message: "Der Inhalt wurde entfernt oder der Zugriff ist abgelaufen. Private Ticketlinks erhältst du direkt vom Team.", action: "Kontakt öffnen", href: "/kontakt" },
  "413": { title: "Die Datei ist zu groß.", message: "Verkleinere die Datei oder wähle eine andere. Die zulässige Größe steht im jeweiligen Uploadfeld.", action: "Mein DRP öffnen", href: "/dashboard" },
  "415": { title: "Dieses Dateiformat passt nicht.", message: "Wähle eines der im Uploadfeld genannten Formate. Eine andere Dateiendung allein ändert das Format nicht.", action: "Mein DRP öffnen", href: "/dashboard" },
  "422": { title: "Bitte prüfe deine Eingaben.", message: "Einige Angaben können so nicht verarbeitet werden. Die betroffenen Felder zeigen dir, was fehlt.", action: "Mein DRP öffnen", href: "/dashboard" },
  "429": { title: "Bitte warte einen Moment.", message: "Es sind zu viele Anfragen in kurzer Zeit eingegangen. Versuche es später erneut, statt den Vorgang mehrfach abzusenden.", action: "Hilfe öffnen", href: "/kontakt" },
  "500": { title: "Hier ist etwas schiefgegangen.", message: "Diese Ansicht konnte nicht geladen werden. Versuche es erneut. Prüfe nach einem Speichervorgang zuerst, ob deine Änderung schon angekommen ist.", action: "Zur Startseite", href: "/" },
  "502": { title: "Ein Dienst antwortet nicht richtig.", message: "Eine benötigte Verbindung ist gerade gestört. Bitte versuche es später noch einmal.", action: "Status ansehen", href: "/status" },
  "503": { title: "Gerade nicht verfügbar.", message: "Dieser Bereich ist vorübergehend nicht erreichbar oder noch nicht freigeschaltet. Bitte versuche es später erneut.", action: "Status ansehen", href: "/status" },
  "504": { title: "Die Antwort lässt auf sich warten.", message: "Ein benötigter Dienst hat nicht rechtzeitig geantwortet. Prüfe vor erneutem Absenden den aktuellen Stand deines Vorgangs.", action: "Status ansehen", href: "/status" },
  offline: { title: "Die Verbindung fehlt gerade.", message: "Prüfe WLAN oder mobile Daten. Noch nicht abgesendete Eingaben sind nicht automatisch gespeichert. Lass die ursprüngliche Seite möglichst geöffnet.", action: "Zur Startseite", href: "/" },
} as const;
export type CommonErrorCode = keyof typeof commonErrors;
export function isCommonErrorCode(code: string): code is CommonErrorCode {
  return Object.prototype.hasOwnProperty.call(commonErrors, code);
}
