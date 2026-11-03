# DRP – Funktionsübersicht für die nächste Umstrukturierung

Stand: 3. November 2026. Diese Liste beschreibt den tatsächlich vorhandenen Funktionsumfang, einschließlich der Fraktionsvorstellungen aus diesem Änderungsstand. Sie ist keine Liste geplanter neuer Funktionen.

Du kannst bei der nächsten Planung die Kennungen nennen, zum Beispiel: **F25 behalten, F33 neu aufbauen, F48 entfernen**. Eine Oberfläche kann in der Hostingvorschau mit Testdaten benutzbar sein, obwohl ihr echter Datenabgleich abgeschaltet ist.

**Portal** = innerhalb der Website, je nach Anmeldung und Berechtigung. **Extern** = echter Betrieb benötigt den jeweiligen Dienst und gültige Zugangsdaten; echte externe Aktionen sind in der geschützten Entscheidungsvorschau abgeschaltet. **Betrieb** = Einrichtung oder Wartung außerhalb der normalen Besucheroberfläche. **Vorschau** = ausschließlich für den Testbetrieb.

## Öffentliche Website

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F01 | Startseite und Einstieg | Discord-Beitritt, Serverzugang, Einstiegsschritte, hervorgehobene Regeln und aktuelle News. | Portal |
| F02 | Hauptfraktionen | Polizei Deutschland, Berufsfeuerwehr Deutschland, MoveBerlin, Bundeskriminalamt, Deutscher Roter Stern und Landesverwaltung; je Logo, Beschreibung, optionales Bild und Link. Fehlt ein Text, wird das offen angezeigt. | Portal |
| F03 | Weitere Rollenkarten | Zusätzliche, frei benannte Roleplay-Bereiche mit Bild, Text und Verlinkung. | Portal |
| F04 | Community-Einblicke | Lokale optimierte Spielbilder mit Bildunterschriften; Verweis auf den offiziellen TikTok-Kanal. Keine TikTok-Einbettung. | Portal |
| F05 | Serverinformationen | Hinweise zu Einstieg und Voraussetzungen; Roblox-/Discord-Beitrittslinks und ER:LC-Karte. | Portal; Beitritt extern |
| F06 | Öffentlicher ER:LC-Status | Verfügbarkeit, Spielerzahl und Zeitpunkt/Herkunft der Daten, einschließlich veralteter beziehungsweise nicht verfügbarer Stände. | Extern |
| F07 | Dienstestatus | Öffentliche Statusübersicht, automatische Prüfungen und manuell gepflegte Störungen/Wartung. | Portal / Extern |
| F08 | Regelwerk | Kategorien, Inhaltsnavigation, Volltextsuche, Fundstellen, Direktlinks und lesbare Regeln ohne JavaScript. | Portal |
| F09 | Neuigkeiten | Newsübersicht, einzelne Beiträge, Titelbilder, Richtext und Medien. | Portal |
| F10 | Öffentliches FAQ | Fragen und Antworten, Kategorien und Suche. | Portal |
| F11 | Öffentliche Teamseite | Sichtbare Teamprofile mit Namen, Funktion, Bereich, Kurzvorstellung und optionalem Bild. | Portal |
| F12 | Öffentlicher Kalender | Tag, Woche, Monat, Jahr und Agenda; Kategorienfilter, wiederkehrende Termine, eigene Detailseiten mit Zeit, Ort, Medien und Links. | Portal |
| F13 | Kontakt ohne Konto | Gastticket für Website-Anliegen mit privatem Zugangslink; Spiel-/Communitysupport führt zu Discord. | Portal |
| F14 | Community-Verweise | Discord, Roblox, Discord-Support, TikTok und aus internen Bereichen Melonly; zentral pflegbare Einstiegslinks. | Portal; Ziele extern |
| F15 | Datenschutz und Nutzungsregeln | Vorhandene Seiten; Betreiberangaben und Diensteinstellungen sind verwaltbar. Alte Impressumsadresse leitet zum Verantwortlichen-Abschnitt im Datenschutz. | Portal; tatsächliche Angaben für echten Betrieb erforderlich |

## Darstellung, Navigation und Hilfe

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F16 | Geführte Einführung | Mehrere Stationen an echten Bedienelementen; Ausprobieren, Überspringen, Fortschritt und erneutes Starten; Abschluss am Kontoeinstieg. | Portal |
| F17 | Helle/dunkle Darstellung | Systempräferenz, gespeicherte Auswahl und optional begrenzte Lichtspiele mit sofortigem Überspringen; Rücksicht auf reduzierte Bewegung. | Portal |
| F18 | Mobile Bedienung und Scrollen | Mobile Menüs, Tastaturfokus, angepasste Formulare; Leseposition und Position des Seitenmenüs bleiben bei Panelwechseln erhalten. | Portal |
| F19 | Globale Suche und Schnellnavigation | Öffentliche Inhalte sowie berechtigte eigene/interne Inhalte; Command-Palette und rollenabhängige Navigation. | Portal; interne Treffer nur mit Rechten |
| F20 | Fehler- und Verbindungshilfe | Eigene 404-, Seiten-/Layoutfehler- und Vorschau-Sperransichten; Hilfen zu 17 Fehlerfällen, Offline-Hinweis ohne Verlust offener Eingaben und erneut ladbarer Kalender. | Portal |
| F21 | Vorschau beim Teilen und Suchmaschinen | Seitentitel/-beschreibungen, Social-Preview-Bild, Favicons, Sitemap und robots.txt. Geschützte Vorschau wird nicht indexiert. | Portal / Betrieb |

## Konto und Mein DRP

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F22 | Anmeldung/Registrierung über Discord | OAuth-Anmeldung und Rückkehr ins Portal. Keine gewöhnliche öffentliche E-Mail-/Passwortregistrierung. | Extern |
| F23 | Roblox und Kontoverknüpfung | Discord-/Roblox-Konto verbinden, Daten aktualisieren und verbundenes Konto wechseln; gemeinsamer Kontoeinstieg. | Extern |
| F24 | Kontostand prüfen | Verknüpfungsstand und erforderliche Schritte im Konto anzeigen; getrennte Demo-/Vorschauidentitäten. | Portal / Extern |
| F25 | Profil und Rollen | Profil-/Kontodaten sowie getrennte Anzeige von Website-Rollen, Discord-Rollen und Melonly-Zuordnung mit verfügbarem Abgleichstand. | Portal; echte Fremddaten extern |
| F26 | Regeln bestätigen | Aktuelle Regelwerksversion im Konto bestätigen und Bestätigungsstand anzeigen. | Portal |
| F27 | Persönliches Dashboard | Übersicht und direkte Einstiege zu Profil und Website-Tickets; zusätzliche Betriebshinweise für berechtigte Teammitglieder. | Portal |

## Website-Tickets

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F28 | Mitgliedsticket erstellen | Kategorie, Betreff und Beschreibung; eigene Ticketübersicht und eindeutige Ticketnummer. | Portal; Anmeldung |
| F29 | Unterhaltung im eigenen Ticket | Nachrichten lesen und beantworten, Status verfolgen; interne Teamnotizen bleiben Mitgliedern verborgen. | Portal; Objektberechtigung |
| F30 | Eigene Tickets aufräumen | Geschlossene Tickets archivieren, wiederherstellen und archivierte Einträge aus der eigenen Ansicht ausblenden. | Portal |
| F31 | Privater Gastzugang | Zugangslink gegen eine geschützte Ticket-Sitzung austauschen und als Gast antworten; technische Zugriffslimits. | Portal; privater Link |
| F32 | Tickets im Team bearbeiten | Übersicht, Filter, Details, Antworten, interne Notizen, Statuswechsel mit Bearbeiterzuordnung und Löschen geschlossener Tickets. Kategorien schränken den Zugriff ein. | Portal; Teamrechte |

## Teamwerkzeuge und Redaktion

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F33 | Live Operations | ER:LC-Betriebsübersicht und manuelle Prüfung; sensible Server-/Spielerinformationen nur mit passenden Rechten. | Portal / Extern |
| F34 | Nutzerverzeichnis | Mitglieder suchen, Kontoverknüpfungen und Rollenstände ansehen; Einstieg zur berechtigten Rollenverwaltung. | Portal; Teamrechte |
| F35 | Internes Staff-FAQ | Eigenes durchsuchbares/kategorisiertes Wissen für das Team; Inhalte verwalten, sortieren und ein-/ausblenden. | Portal; Wissensrechte |
| F36 | Regeln verwalten | Anlegen, bearbeiten, sortieren, Richtext/Medien, Entwürfe und Revisionen, veröffentlichen, zurückziehen und löschen. | Portal; getrennte Redaktions-/Publikationsrechte |
| F37 | News verwalten | Beiträge mit Auszug, Titelbild, Inhalt und Medien; Entwürfe/Revisionen, Veröffentlichung, Rückzug und Löschung. | Portal; getrennte Redaktions-/Publikationsrechte |
| F38 | Öffentliches FAQ pflegen | Fragen/Antworten anlegen, ändern, kategorisieren, sortieren, sichtbar schalten und löschen. | Portal; FAQ-Rechte |

## Interne Dokumente und Kalenderverwaltung

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F39 | Interne Dokumente erstellen | Richtext, Bilder/Anhänge und interne Dateien; geschützte Anzeige und Downloads. | Portal; Upload extern |
| F40 | Dokumente finden | Übersicht, Kategorien, Suche und eigene Dokument-Detailseiten. | Portal; Dokumentrechte |
| F41 | Dokumenthistorie | Revisionen ansehen, ältere Stände wiederherstellen und Dokumente archivieren. | Portal; Schreibrechte |
| F42 | Dokumentzugriffe steuern | Kategoriebezogene Rechte sowie zusätzliche Rollenfreigaben für eingeschränkte Dokumente. | Portal; Verwaltungsrechte |
| F43 | Dokumente importieren | Vordefinierte Google-Dokumentquellen sowie hochgeladene DOCX-/XLSX-Quelldateien mit begrenzter, geprüfter Verarbeitung. | Extern; in Hostingvorschau deaktiviert |
| F44 | Termine redaktionell pflegen | Termine, Wiederholungen, Zeiten, Ort, Beschreibung, Titelbild/Medien und externe Links; Entwurf, Prüfung, Veröffentlichung und Archivierung. | Portal; Kalenderrechte |
| F45 | Kalenderkategorien und Freigaben | Kategorien, Farben, Reihenfolge, Sichtbarkeit und rollenbezogene Rechte für eigene/fremde Termine und Veröffentlichung. | Portal; Verwaltungsrechte |

## Teamaktivität und Weekly Insider

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F46 | Aktivitätsübersicht | Eigene beziehungsweise berechtigt alle Wochenzeiten, Schichten, genehmigte LoAs, Strikes und Rangblockierungen ansehen; Aktualität kenntlich machen. Schichten/LoAs werden in Melonly gepflegt. | Portal / Extern |
| F47 | Wochenauswertung | Letzte abgeschlossene Woche anhand Discord-Rang, Wochenziel und Melonly-Aktivität auswerten; Empfehlungen bewusst prüfen und entscheiden. | Portal / Extern; Review-Rechte |
| F48 | Weekly-Insider-Bericht | Einträge, Abschnitte und Unterschriften pflegen; Erwähnungsmodus wählen, Berichtstext erzeugen und kopieren. Kein automatischer Versand durch das reine Kopieren. | Portal; Review-Rechte |

## Administration

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F49 | Website-Rollen und Rechte | Rollen anlegen/ändern/löschen, Prioritäten und Einzelrechte pflegen, Standardrolle festlegen. | Portal; Rollenverwaltung |
| F50 | Manuelle Rollenvergabe | Zusätzliche Website-Rollen für Nutzer vergeben und entziehen; geschützte Owner-Zuordnung. | Portal; Rollenvergaberecht |
| F51 | Discord-/Website-Rollen zuordnen | Synchronisierte Discord-Rollen mit Website-Zugangsrollen verknüpfen und den Synchronisierungsstand anzeigen. | Portal / Extern |
| F52 | Discord-Rangfolge konfigurieren | Teamränge, Sektionen, Reihenfolge, Wochenziele und nächsten Rang beziehungsweise abweichende Empfehlung definieren. | Portal; Teamkonfiguration |
| F53 | Melonly-Zuordnung | Melonly-Daten abgleichen, Mitglieder mit Website-/Discord-Identitäten verbinden und Herkunft der Rollen anzeigen. Discord bleibt die Rangquelle. | Extern |
| F54 | Discord-Rollenautomatik | Rollen für Strikes und Rangblockierungen konfigurieren; Aufträge und Status verfolgen. Menschliche Entscheidungen bleiben Teil des Ablaufs. | Portal / Extern; Bot erforderlich |
| F55 | Ticketkategorien und Zugriffe | Kategorien und rollenbezogene Rechte für Ansicht, Antworten, Status und Löschung verwalten. | Portal; Ticketverwaltung |
| F56 | Startseite/Fraktionen pflegen | Alle sechs Hauptfraktionen bearbeiten: Name, Beschreibung bis 800 Zeichen, optionales Zusatzbild und HTTPS-Link, Reihenfolge und Sichtbarkeit. Zusätzliche Rollenkarten und öffentliche Einstiegslinks separat verwalten. | Portal; Website-Verwaltung |
| F57 | Teamseite pflegen | Profile, Verknüpfung zum Konto, Name, Funktion, Bereich, Vorstellung, Bild, Reihenfolge und Sichtbarkeit verwalten. | Portal; Teamverwaltung |
| F58 | Statusseite konfigurieren | Dienste, automatische Prüfungen, manuelle Zustände und Wartungs-/Fehlertexte verwalten. | Portal; Statusverwaltung |
| F59 | Datenschutzangaben pflegen | Betreiber-/Kontaktangaben und Angaben zu eingesetzten Diensten im vorhandenen Verwaltungsbereich pflegen. | Portal; Rechtsinhalte-Rechte |
| F60 | Integrationsstatus | Konfiguration, letzte erfolgreiche Abgleiche, veraltete Stände und Jobfehler für Discord, ER:LC, Cloudinary, Melonly und Hintergrundaufgaben ansehen. Schlüssel werden dabei nicht ausgegeben. | Portal; Integrationsrechte |
| F61 | Audit-Log | Protokollierte Inhalts-, Rollen-, Ticket-, Verwaltungs- und Integrationsaktionen prüfen. | Portal; Audit-Rechte |
| F62 | Systemübersicht | Administrative Einstiege und vorhandene System-/Datenstände überblicken. | Portal; Adminzugang |

## Medien, Schnittstellen und Betrieb

| ID | Funktion | Vorhandener Umfang | Voraussetzung |
| --- | --- | --- | --- |
| F63 | Medien-Uploads | Bilder, Audio, Video und interne Dokumente über Cloudinary; signierte Uploads, Fortschritt, Abbruch, Wiederholen, Medienreihenfolge und Beschriftung. Private Dokumente werden geschützt ausgeliefert. | Extern; Hostingvorschau sperrt echte Uploads |
| F64 | Bot-Datenschnittstelle | Authentifizierte Ereignis-/Datensynchronisation zwischen vorhandenem Discord-Bot und Website. | Extern / Betrieb |
| F65 | Discord-Synchronisierung | Rollen und Mitglieder übernehmen; Rollenaufträge abholen, reservieren und bestätigen. | Extern / Betrieb |
| F66 | Hintergrundaufgaben | Separate Aufgaben für Server-/Integrationsabgleiche und Bereinigung; lokaler periodischer Job. In der Gratis-Hostingvorschau tägliche Bereinigung und manuelle Testläufe, kein zugesicherter Fünf-Minuten-Takt. | Betrieb / Vorschau |
| F67 | Geschützte Entscheidungsvorschau | Separates Vorschaupasswort, Mitglied-/Team-/Admin-Testzugänge, synthetische Daten, sichtbare Kennzeichnung und administrative Rücksetzung ausschließlich der Vorschau-Datenbank. | Vorschau |
| F68 | Lokale Installation und Hosting | Node-/PostgreSQL-Laufzeit, Start/Stopp, GitHub-/Vercel-Vorbereitung, Migrationen, getrennte Befüllung, Datenbanksicherung und Wiederherstellung. Discord-Bot startet separat. | Betrieb |
| F69 | Technische Zugriffsschranken | Rollen-/Objektberechtigungen, Datenbanktrennung, serverseitige Eingabegrenzen, sichere Cookies, HTTPS-Konfiguration, Cache-Trennung, geschützte Uploads und Limits für Anmeldung/Gasttickets. Kein Ersatz für fortlaufende Sicherheitsprüfung. | Betrieb / Portal |
| F70 | Qualitätssicherung und Ressourcen | Unit-/Browserprüfungen, Lint, TypeScript, Produktionsbuild, Abhängigkeits- und Secret-Scans; optimierte lokale Bilder und respektierte Bewegungs-/Datenspareinstellungen. | Betrieb / Portal |

## Abgrenzungen für die nächste Planung

- Shop, Zahlungen, Spenden, Newsletter, Besuchertracking/Analytics und ein allgemeiner Community-Chat sind nicht als eigene Websitefunktionen vorhanden.
- Bewerbungen, operative Moderationsmaßnahmen sowie die eigentliche Schicht-/LoA-Pflege sind derzeit externe Discord-/Melonly-Abläufe. Ein Link dorthin ist kein vollständig eingebauter Websiteprozess.
- Fraktionsvorstellungen sind öffentliche Präsentationen. Eigene Fraktions-Intranets, Dienstpläne, Akten- oder Wirtschaftssysteme sind damit nicht automatisch enthalten.
- Im Ticketbereich existiert eine Bearbeiterzuordnung im Statusablauf. Eine frei konfigurierbare manuelle Zuweisungsoberfläche an beliebige Bearbeiter ist nicht als eigener Workflow umgesetzt.
- Die TikTok-Verbindung ist ein Profilverweis. Automatische Clip-Synchronisation, Videowiedergabe oder eine belastbare Analyse der gesperrten Videos sind nicht enthalten.
- Die Vorschau verwendet künstliche Daten. Eine ausgefüllte Testansicht beweist keine aktive Verbindung zu Discord, Roblox, Melonly, ER:LC oder Cloudinary.

## Vorlage für deine Entscheidungen

| Funktion/ID | Behalten | Ändern | Entfernen | Wunsch / neuer Ablauf |
| --- | --- | --- | --- | --- |
| F… | | | | |
| F… | | | | |
| Neues Feature | | | | |
