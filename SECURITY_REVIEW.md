# Technische Prüfung der Entscheidungsvorschau

Prüfstand: 2. November 2026. Diese Prüfung dokumentiert konkrete Änderungen und reproduzierbare Tests. Sie ist weder eine rechtliche Freigabe noch ein vollständiger Infrastruktur-Penetrationstest.

## Ergebnis und Grenzen

Die Website ist für die Prüfung als getrennte, passwortgeschützte Entscheidungsvorschau vorbereitet. Ein normaler Communitybetrieb ist damit nicht freigegeben. Die Vercel-Konfiguration dieses Branches setzt den Vorschaumodus ausdrücklich als Standard. Ohne bestätigte tatsächliche Verantwortlichenangaben und eine passende HTTPS-Adresse bleibt eine externe Vorschau gesperrt. Der Betreiber kann diese Angaben direkt beim Hoster eintragen, ohne sie im Chat oder im Repository offenzulegen.

Der bestehende lokale Datenbestand wurde vor Änderungen gesichert. Schemaeinrichtung, reguläre Browserregression, Hostingvorschau und Wiederherstellung wurden in getrennten Testdatenbanken durchgeführt. Es wurde kein vorhandener Community-Dump in die Vorschau kopiert.

## Behobene und begrenzte Befunde

| Bereich | Änderung und Nachweis |
| --- | --- |
| Abhängigkeiten | Next.js 15.5.28, Tiptap 3.32.2, sharp 0.35.5, Zod 4.6.7 und Vitest 5.1.0; zugehörige Pakete und Lockdatei aktualisiert. Die erste Prüfung meldete 65 betroffene Abhängigkeiten, darunter 3 kritisch und 10 hoch. Der erneute Audit meldet 0 kritisch, 0 hoch und 21 mittel. |
| Testprivilegien | Reservierte lokale und Hosting-Testidentitäten erhalten außerhalb ihrer vorgesehenen Modi keinen privilegierten Zugang. Echte OAuth-Provider fehlen vollständig im Hosting-Vorschaumodus. |
| Datenbanktrennung | Vorschauinitialisierung nur in einer leeren neuen Datenbank; eigene Kennung in separatem Schema. Migrationen, Anmeldung, Modellzugriffe, Raw-SQL, Bereinigung und Rücksetzung prüfen diese Trennung. Der Negativtest mit absichtlich falsch eingestellter Regression-Datenbank weist Modell- und Raw-Zugriffe ab. |
| Objektberechtigungen | Mitglieds-, Team- und Verwaltungskonten separat geprüft. Mitglieder erhalten weder fremde Tickets noch interne Ticketnotizen, Teamdokumente oder Verwaltungszugriff. Die Suche übernimmt die Berechtigungsgrenzen. |
| Externe Aktionen | OAuth, Bot-APIs, Uploads, Google-Importe und externe Synchronisation sind in der Entscheidungsvorschau gesperrt. Diese Schranken gelten zusätzlich auf dem Server und nicht nur an sichtbaren Buttons. |
| Upload-Angaben | HTTPS, Anbieter und Cloudinary-Pfad werden geprüft. Metadaten einschließlich Dateigröße, Version, Sichtbarkeit, URL und tatsächlichem Format werden serverseitig beim Anbieter verifiziert, statt den Browserangaben allein zu vertrauen. Liveprüfung mangels eingerichteter Zugangsdaten nicht durchgeführt. |
| Importsicherheit | Erlaubte HTTPS-Hosts auch bei Weiterleitungen; keine privaten/IP-Ziele. Antworten werden während des Lesens begrenzt. DOCX-/XLSX-Archive werden vor Verarbeitung auf Einträge, Metadaten und tatsächliche entpackte Größe geprüft. |
| Editorinhalte | Größen-, Knoten- und Tiefenbegrenzung vor rekursiver Verarbeitung. Gepatchte Editorbibliotheken, React-Ausgabe statt beliebigem HTML und sichere Linkprotokolle. Interne Dokument- und Abschnittslinks funktionieren wieder ohne erzwungenen neuen Tab. |
| Zugang und Caches | Separater Passwortschutz für Seiten, RSC und Daten-APIs. Sichere Sitzungscookies, private/no-store-Antworten und noindex. Öffentliche statische Ressourcen enthalten keine privaten Daten. Eine falsch konfigurierte localhost-Adresse ist auf Vercel keine Ausnahme von der Freischaltung. |
| Missbrauchsgrenzen | Fehlanmeldungen werden datenbankgestützt begrenzt; keine flüchtigen Instanzzähler als alleinige Schranke. Gastticket-Limits bleiben erhalten. Vorschau- und Rollenpasswörter sind getrennte generierte Zufallswerte. |
| Veröffentlichung | Gitleaks 8.30.1 gegen bisherigen Git-Verlauf und Veröffentlichungskandidaten; keine erkannten Geheimnisse. Zusätzlicher Scan auf konfigurierte geheime Werte im Browser-Build. Private Konfiguration, Sicherungen, Laufzeiten, Testartefakte und interne Entwicklungsberichte werden ausgeschlossen. |

Relevante Primärhinweise zu den aktualisierten Paketen: https://github.com/advisories/GHSA-p293-qw3h-jr36, https://github.com/advisories/GHSA-2464-fhr4-w9xw, https://github.com/advisories/GHSA-cp6q-959q-f8rh und https://github.com/advisories/GHSA-wq5f-xc86-pv6w.

### Verbleibende mittel eingestufte Abhängigkeiten

Die 21 Meldungen hängen an älteren minimatch-/glob-Abhängigkeiten, unter anderem in der Lint-Toolchain und dem ExcelJS-Archivierungszweig. Es wurde keine Website-Schnittstelle gefunden, die vom Benutzer frei wählbare Glob-Muster an diese Funktionen übergibt. Externe Dateiimporte sind in der gehosteten Testvorschau zudem abgeschaltet. Die neuen Importgrenzen ersetzen keine Bibliotheksaktualisierung.

Diese Meldungen werden ausdrücklich nicht als vollständig behoben ausgegeben. Ein erzwungenes Major-Override von minimatch würde APIs abhängiger Werkzeuge verändern. Die CI meldet die verbliebenen Befunde weiterhin und blockiert bei hohen oder kritischen Meldungen. Vor echtem Betrieb ist diese Bewertung erneut gegen den dann aktuellen Funktionsumfang und Audit abzugleichen.

### Private Dokumentverweise

Bisher im Quelltext enthaltene interne Dokumentkennungen wurden in private lokale Konfiguration ausgelagert. Bestehende lokale Dokumentdaten bleiben erhalten. Der Git-Verlauf wurde nicht umgeschrieben; frühere Commits können alte Verweise weiterhin enthalten. Der Betreiber muss deshalb die Freigaben der betreffenden Google-Dokumente separat prüfen. Ein Dokumentverweis allein belegt weder eine öffentliche Freigabe noch einen bereits erfolgten Datenzugriff.

## Bedienung und Gestaltung

Der vorhandene helle/dunkle Stil, Einführung, Regelwerksuche, Scrollverhalten und begrenzte Lichtspiele bleiben erhalten. Die Hostingvorschau hat eine dauerhafte Kennzeichnung und getrennte Testrollen. Echte Kontoverknüpfungen werden dort als abgeschaltet ausgewiesen. Mobile Formularfelder verwenden mindestens 16 Pixel. Fehlende Integration wird nicht als erfolgreicher Live-Abgleich dargestellt.

Der vorherige Anbieterpfad leitet dauerhaft zum Verantwortlichen-Abschnitt im Datenschutz weiter. Sichtbare Impressumslinks und der Sitemap-Eintrag wurden entfernt; alte Datenbankfelder bleiben für Kompatibilität erhalten. Die Datenschutzerklärung berücksichtigt die geplante Schweizer verantwortliche Stelle und gegebenenfalls zusätzlich anwendbare Anforderungen. Sie bleibt ein abzugleichender Entwurf, solange die tatsächlichen Betriebsangaben nicht abschließend gepflegt sind.

## Abnahme

- ESLint, TypeScript, Produktionsbuild und Browser-Secret-Scan.
- 110 Unit-Tests einschließlich Zugangsgrenzen, Import-Weiterleitungen, Archivgrößen, Editor-Komplexität und interner Links.
- 68 reguläre Desktop-/Mobil-Browsertests in einer eigenen Regression-Datenbank. Hostingfälle sind in diesem Lauf absichtlich deaktiviert.
- Acht zusätzliche Hosting-Browsertests für Passwortschutz und die drei Rollen auf Desktop/Mobil; die Rücksetzung läuft danach als eigener serieller Produktionsbundle-Test.
- Gastticket per Browser angelegt, mit Secure/HttpOnly-Cookie geöffnet, nach Website-Neustart weiter verfügbar und danach durch die isolierte Verwaltungsfunktion zurückgesetzt.
- Sicherung in neuer Testdatenbank wiederhergestellt; Anzahl und vollständige Zeilenprüfsummen aller 65 gesicherten Tabellen stimmen überein.
- Alle 123 veröffentlichten Regeln einschließlich veröffentlichter Revisionen und Medien der lokalen Bestandsdatenbank unverändert.

Die mobilen Prüfungen verwenden Chromium mit Android-Viewport und synthetischen Eingaben. Sie ersetzen keine Prüfung auf jedem physischen Endgerät. Reale Discord-/Roblox-Logins, Cloudinary-Verifikation und Melonly-/Bot-Abgleiche wurden mangels vollständiger echter Konfiguration nicht live verifiziert. Sie sind in der Entscheidungsvorschau bewusst nicht aktiv.

Lokale Nachweise liegen unter `logs/`, insbesondere `preview-lifecycle.json`, `preview-backup-restore.json`, `preview-isolation.json`, `rules-data-preserved.json` und den Browserprotokollen. Diese Dateien und Browsertraces werden nicht ins öffentliche Repository übernommen.
