# Technische Prüfung der Entscheidungsvorschau

Prüfstand: 3. November 2026. Diese Prüfung dokumentiert konkrete Änderungen und reproduzierbare Tests. Sie ist weder eine rechtliche Freigabe noch ein vollständiger Infrastruktur-Penetrationstest.

## Ergänzende Prüfung vom 3. November

Vor den Änderungen wurden eine neue Projektkopie einschließlich Git-Verlauf und Konfiguration sowie eine PostgreSQL-Sicherung unter den ignorierten `backups/` angelegt. Es gibt keine Schemaänderung, Bestandsdatenübernahme oder Rücksetzung der gehosteten Datenbank durch diesen Prüfauftrag.

Der Quelltextdurchgang umfasst öffentliche Seiten, Anmeldung und Kontoverknüpfung, Mitglieder-, Team- und Verwaltungsaktionen sowie alle 17 API-Routen. Geprüft wurden Berechtigungsprüfungen vor Datenzugriffen, private Objektverweise, Server-/Browser-Grenzen, Eingabegrößen, Inhaltsausgabe, externe Abrufe und Fehlerbehandlung. Browserprüfungen verwenden synthetische Daten. Verdeckte Infrastruktur, echte Drittanbieter-Konten und unbekannte Angriffsketten sind damit nicht vollständig geprüft.

| Schweregrad vor Behebung | Befund und Nachweis | Behebung |
| --- | --- | --- |
| Mittel | Mehrere öffentliche Bildfelder prüften nur den Medientyp. Regel-/News-Medien konnten ohne gemeinsame Prüfung der Sichtbarkeit übergeben werden. | Öffentliche Auswahl verlangt `PUBLIC`, Cloudinary-Auslieferung `upload` und für Titelbilder zusätzlich `IMAGE`. Gemeinsame Prüfung in Regeln, News, Kalender, Team und Homepage; öffentliche Ausgabe verwirft ungültige Altverweise. Tests weisen interne, authentifizierte und fehlende Medien zurück. In der Hostingvorschau sind Uploads zusätzlich abgeschaltet. |
| Mittel | Die automatische physische Medienlöschung beim Entfernen von News/Regeln berücksichtigte nicht alle anderen Verwendungen. Ein weiterhin genutztes Bild konnte verschwinden. | Inhaltslöschung entfernt keine Anbieterdateien mehr. Zwei Regressionstests rufen die echten Löschaktionen mit gemeinsam verwendeten Medien auf. Unbenutzte Dateien können dadurch bestehen bleiben; eine vollständige referenzsichere Medienbereinigung ist ein eigener späterer Lebenszyklus. |
| Mittel | Bot- und Medien-JSON wurde vor Schemavalidierung ohne eigene Lesegrenze eingelesen; ungültiges JSON konnte einen Serverfehler verursachen. | Streaming-Limit anhand tatsächlicher UTF-8-Bytes: 64 KiB für Medien, 2 MiB für Bot-Stapel. Ungültiges JSON ergibt 400, zu große Anfragen 413, falscher Inhaltstyp 415. Authentifizierung bleibt vorgeschaltet. Tests decken auch eine gelogene Inhaltslänge ab. |
| Mittel | Gast- und Mitgliedstickets ermittelten die nächste Nummer getrennt über `MAX + 1`; gleichzeitige Erstellung konnte am Unique-Index scheitern. | Gemeinsame transaktionsgebundene PostgreSQL-Advisory-Sperre bis zum abgeschlossenen Insert. Zwölf konkurrierende Gast-/Mitglieds-Schreibvorgänge werden in der isolierten Regression-/CI-Datenbank geprüft und ausschließlich ihre eigenen Testtickets wieder entfernt. |
| Niedrig | Die Regel-Speicheraktion übergab das erforderliche Sortierfeld nicht an die Validierung. | `order` wird validiert und gespeichert. |
| Niedrig | Alte tägliche Terminserien verschwanden nach den ersten 400 Wiederholungen; wiederholte Zeitzonenformatierer verursachten vermeidbare Arbeit. | Berechnung startet nahe dem angefragten Zeitfenster; begrenzter Formatierer-Cache. Regressionstest für eine 2020 gestartete tägliche Serie im November 2026, zusätzlich bestehende Sommerzeit-/Serientests. |
| Niedrig | Datenbankfehler konnten außerhalb der lokalen Demo als erfundene Regeln, News, Teamprofile, FAQ oder Kalenderkategorien erscheinen. Die Kalender-API gab bei Ausfall leere Termine zurück. | Fehler werden sichtbar weitergegeben; die API antwortet mit 503, `Retry-After` und `no-store`. Im Kalender gibt es eine sichtbare Fehlermeldung mit gezieltem Wiederholen. Ausschließlich die ausdrücklich lokale Demo behält ihre bisherigen Regel-/News-/Team-Beispiele. |

### Fehleransichten und Bedienung

Gemeinsame eigene Ansichten für 404 sowie lokale und globale React-Fehlergrenzen; die Passwortschranke hat eigene 401-/503-Antworten ohne Datenbank- oder JavaScript-Abhängigkeit. APIs behalten JSON und passende HTTP-Statuscodes. Interne Fehlermeldungen, Stacktraces und Anfrage-URLs werden nicht angezeigt. Eine optionale Supportkennung wird auf ein kurzes sicheres Zeichenformat begrenzt.

Unter `/fehler` stehen Erklärungen für 400, 401, 403, 404, 405, 408, 409, 410, 413, 415, 422, 429, 500, 502, 503, 504 und Verbindungsverlust. Die Hilfeseiten sind ausdrücklich Erklärungen mit HTTP 200, keine künstlich ausgelösten Fehler. Tatsächliche nicht vorhandene Seiten liefern 404. Vorgeschaltete Fehlerseiten von Vercel, Browser-Netzwerkfehler vor dem ersten Seitenladen und Ausfälle des gesamten Hostings kann Anwendungscode nicht ersetzen.

Bei Verbindungsverlust bleibt das geöffnete Formular stehen; es wird weder neu geladen noch automatisch abgesendet. Die Verbindungshilfe öffnet einen neuen Tab. Die Flaggen von Deutschland, Schweiz und Österreich illustrieren den deutschsprachigen Raum; der Begleittext schließt andere Nationalitäten ausdrücklich ein. Es werden keine neuen Länder- oder Standortdaten erfasst.

### TikTok als öffentliche Quelle

Das öffentliche Profil [@deutschland.rp.erlc](https://www.tiktok.com/@deutschland.rp.erlc) wurde am 3. November geöffnet. Profilname und Kanalzuordnung waren lesbar; Videoansicht und Videoliste wurden durch eine TikTok-Sicherheitsprüfung blockiert. Diese wurde nicht umgangen. Deshalb werden weder Videoanalysen noch übernommene Clipinhalte behauptet. Eingebaut wurde der offizielle Profilverweis bei den Community-Bildern und im Footer. Keine TikTok-Embeds, Tracker, kopierten Clips oder schnell veraltenden Follower-/Like-Zahlen.

### Verbleibende Voraussetzungen

Der erneute Abhängigkeits-Audit meldet weiterhin **0 kritisch, 0 hoch, 21 mittel**. Die unten beschriebene Bewertung bleibt bestehen. Es wurde kein vollständiger externer Penetrationstest durchgeführt. Für einen späteren echten Betrieb bleiben insbesondere Drittanbieter-Logins und Upload-Verifikation mit echten Konten, Betreiber-/Datenschutzkonfiguration, Providerlimits und die Missbrauchsgrenzen angemeldeter Schreibaktionen separat im tatsächlichen Hosting zu prüfen. Der Fünf-Minuten-Job läuft in der Hostingvorschau weiterhin nicht automatisch.

### Abnahme des aktuellen Stands

- ESLint, TypeScript, Produktionsbuild und alle **125 Unit-Tests** erfolgreich.
- **80 reguläre Desktop-/Mobil-Browsertests**, dazu **8 getrennte Vorschaurollen-/Zugangstests** und **1 serieller Rücksetztest** erfolgreich. Der reguläre Lauf überspringt absichtlich die zehn separat gestarteten Vorschaufälle.
- Eigene Fehleransichten, DACH-Hinweis und TikTok-Verweise in heller/dunkler Darstellung; keine TikTok-Netzwerkanfrage beim Besuch der Startseite. Formulareingaben über Offline-/Online-Wechsel erhalten; Kalender nach simuliertem 503 gezielt erneut geladen.
- Absichtlich falsch zugeordnete lokale Vorschau-Datenbank: tatsächliche Fehlergrenze mit HTTP 500, Kalender-JSON mit 503 und vorgeschaltete Sperre mit 503; interne Details bleiben verborgen. Modell- und Raw-Abfragen werden vom Datenbankwächter abgewiesen.
- Zwölf gleichzeitige Ticket-Anlagen ergeben zwölf eindeutige Nummern. Die erzeugten Testtickets werden anschließend entfernt.
- Automatisches Vorladen der Links im privaten Seitenmenü abgeschaltet. Der gemessene Aufruf von `/admin/website` lädt noch vier übergeordnete Headerziele vor, aber keine weiteren Verwaltungsunterseiten. Dies ist ein Nachweis vermiedener Abrufe, keine pauschale Ladezeit- oder Lighthouse-Zusage.
- Browser-Build gegen die konfigurierten lokalen und Hosting-Geheimnisse geprüft; keine der 13 beziehungsweise 26 geheimen Zeichenfolgen gefunden. Gitleaks findet im bisherigen Verlauf keine erkannten Geheimnisse. Konfigurationen und Prüfarbelege bleiben außerhalb von Git.

Lokale Belege des aktuellen Laufs: `reliability-*-browser.log`, `reliability-faults.json`, `ticket-concurrency.json`, `portal-prefetch-after.json`, `reliability-*-secrets.log` sowie Bildschirmaufnahmen unter den ignorierten `logs/`. Diese Belege enthalten keine zu veröffentlichenden Community-Dumps.

Die folgenden Abschnitte dokumentieren zusätzlich die bereits am 2. November abgeschlossene Vorschau-Abnahme; deren damalige Testzahlen sind ein historischer Stand.

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
