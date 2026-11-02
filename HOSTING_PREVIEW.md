# DRP als geschützte Entscheidungsvorschau

## Was diese Variante bietet

- Passwortschutz vor Seiten, RSC und Daten-APIs; öffentliche statische Bilder und Programmdateien enthalten keine vertraulichen Daten.
- Zusätzliche Testpasswörter für Mitglied, Team und Administration. Das Vorschaupasswort allein meldet keinen Benutzer an.
- Eine eigene PostgreSQL-Datenbank mit künstlichen Nutzern, Tickets, Dokumenten und Terminen sowie den vorhandenen öffentlichen Regeltexten.
- Speichern und Ausprobieren der internen Funktionen; kontrolliertes Zurücksetzen nur in der passend markierten Testdatenbank.
- Keine echten OAuth-Verknüpfungen, Uploads, Google-Importe, Bot-Aufträge oder externen Synchronisationen.

## 1. Konten und Datenbank vorbereiten

Verwendet wird das öffentliche Repository `BrotToaster/drp-website`, Branch `codex/preview-readiness`. Der Draft-PR ist zunächst zur Prüfung gedacht; `main` wird nicht automatisch zusammengeführt.

Für die kostenlose private, nicht kommerzielle Entscheidungsvorschau sind Vercel Hobby und Neon Free vorgesehen. Deren aktuelle Bedingungen und Limits prüfen: https://vercel.com/docs/plans/hobby und https://neon.com/pricing. Es werden keine kostenpflichtigen Ressourcen automatisch gebucht. Kostenlose Dienste können pausieren oder Limits erreichen; daraus wird keine Verfügbarkeitszusage für einen dauerhaften Betrieb abgeleitet.

In Neon ein neues Projekt mit PostgreSQL 17 und einer europäischen Region, vorzugsweise Frankfurt, anlegen. Ausschließlich eine **neue leere Datenbank** dafür verwenden. Keine bestehende Communitydatenbank und keinen lokalen Dump importieren. In Vercel ist `fra1` als Laufzeitregion hinterlegt. Eine europäische Laufzeitregion allein ist keine Zusage, dass sämtliche Dienstleisterverarbeitungen in Europa bleiben.

## 2. Zufällige Zugangsdaten erzeugen

```sh
npm ci
mkdir runtime
npm run preview:credentials -- runtime/preview.env
```

Ein bereits bestehendes Verzeichnis kann weiterverwendet werden; vorhandene Zugangsdaten werden nicht überschrieben. Die erzeugte Datei ist von Git ausgeschlossen. Der Benutzername des vorgeschalteten Passwortdialogs ist `drp`. Die Datei enthält `PREVIEW_ACCESS` für diesen Dialog und je ein Passwort `PREVIEW_MEMBER_PASSWORD`, `PREVIEW_STAFF_PASSWORD`, `PREVIEW_ADMIN_PASSWORD`. Diese Werte persönlich an die jeweiligen Tester geben. Keine Passwörter in PRs, Issues, Dokumentation oder GitHub Actions veröffentlichen. Ausschließlich die erzeugten langen Zufallswerte verwenden.

Die Anwendung vergleicht SHA-256-Hashes dieser Zufallswerte. Auf dem Hoster sind dafür nur die entsprechenden `*_HASH`-Werte erforderlich. Die Klartext-Rollenpasswörter müssen dort nicht gespeichert werden. Für Vercels Cron-Aufruf werden dagegen sowohl `CRON_SECRET` als auch sein zugehöriger `CRON_SECRET_HASH` benötigt.

## 3. Datenbank einmalig einrichten

In der ignorierten Datei ergänzen:

- `DATABASE_URL`: gepoolte Neon-Verbindung für die Website.
- `PREVIEW_DATABASE_URL`: Verbindung ausdrücklich zu dieser neuen Vorschau-Datenbank.
- `DIRECT_URL`: ungepoolte Verbindung zu derselben Datenbank für Migrationen.
- `DRP_PREVIEW_DATABASE_ID`: erzeugte Kennung unverändert lassen.

```sh
node --env-file=runtime/preview.env scripts/preview.mjs init
```

Die Initialisierung prüft, dass die Datenbank neu und leer ist, und legt eine separate Datenbankkennung an. SQL-Migrationen werden transaktional mit Historie und Prüfsummen angewendet. Die Zeichen für Windows-/Unix-Zeilenenden werden dabei kompatibel behandelt. Anschließend werden die Testdaten angelegt. `DIRECT_URL` muss dieselbe Datenbankkennung erreichen; ein abweichendes Ziel wird abgewiesen. Eine vorhandene lokale Bestandsdatenbank aus `.env` ist als Ziel gesperrt.

Ein erneutes `init` auf der passend markierten Vorschau setzt auch die Testdaten zurück. Zum gezielten Zurücksetzen gibt es `node --env-file=runtime/preview.env scripts/preview.mjs reset`. Deshalb diese Befehle nicht als Build- oder Startkommando hinterlegen.

## 4. Vercel importieren

Das Repository importieren und den Branch `codex/preview-readiness` als Quelle der Entscheidungsvorschau wählen. Keine automatische Zusammenführung nach `main`. Framework Next.js, Node.js 22, Installation `npm ci`, Build `npm run build` und das normale Next.js-Ausgabeverzeichnis verwenden. Nicht als statischen Export bereitstellen.

Die Vercel-Konfiguration dieses Branches setzt den Vorschaumodus bereits als Standard. Für einen späteren echten Betrieb muss diese Vorgabe ausdrücklich geprüft und angepasst werden. In den Vercel-Umgebungsvariablen setzen:

- `DRP_HOSTED_PREVIEW=true`, `AUTH_DEMO_MODE=false`, `DRP_LOCAL_PREVIEW=false`, `PUBLIC_SITE_INDEXING=false`.
- `SITE_URL` und `AUTH_URL` auf dieselbe stabile HTTPS-Adresse dieses Projekts setzen; keine fremden Host-Header als Konfigurationsquelle verwenden.
- `AUTH_TRUST_HOST=true`, den erzeugten `AUTH_SECRET` und die Datenbankverbindungen samt `DRP_PREVIEW_DATABASE_ID`.
- `PREVIEW_ACCESS_HASH`, die drei `PREVIEW_*_PASSWORD_HASH`-Werte sowie `CRON_SECRET` und `CRON_SECRET_HASH`.
- `TRUST_PROXY_HTTPS=true`, `TRUST_PROXY_CLIENT_IP=false` lassen. Client-IP-Vertrauen erst nach Prüfung des vorgeschalteten Proxys aktivieren.
- `PREVIEW_OPERATOR_NAME`, `PREVIEW_OPERATOR_EMAIL` und `PREVIEW_OPERATOR_CONFIRMED=true` erst nach Ergänzung der tatsächlichen verantwortlichen Stelle. Diese Angaben können direkt beim Hoster eingetragen werden; sie müssen weder in Git stehen noch im Chat offengelegt werden.
- `HOSTING_PROVIDER`, `HOSTING_LOCATION`, `SERVER_LOG_RETENTION_DAYS` passend zu den tatsächlichen Diensteinstellungen setzen. Vor einer gehosteten Freischaltung die Datenschutzhinweise und Dienstleisterverarbeitung abgleichen.

Keine echten Discord-, Roblox-, Cloudinary-, Melonly- oder Bot-Zugangsdaten in dieses Vorschauprojekt kopieren. Ohne bestätigten echten Namen und Kontakt bleibt die externe Vorschau mit HTTP 503 gesperrt. Das ist eine technische Freischaltschranke, keine juristische Prüfung. Die Datenschutzerklärung bleibt als Vorlage kenntlich, solange die gespeicherten Angaben nicht abschließend gepflegt sind.

Die Verantwortlichenangaben der gehosteten Vorschau werden aus der bestätigten Hostingkonfiguration gelesen. Testadministratoren können sie nicht durch Änderungen an Beispieldaten überschreiben.

Nach dem Einrichten `npm run check:preview` mit den jeweiligen Umgebungswerten ausführen. Für einen lokalen Test müssen beide Ursprünge beispielsweise auf `http://localhost:3108` gesetzt werden. Dort dürfen deutlich gekennzeichnete Musterangaben verwendet werden. Der lokale Starthelfer bindet nur an Loopback und deaktiviert zusätzlich alle echten Integrationsschlüssel.

## Ausprobieren, Rücksetzen und Jobs

Die Vorschauverwaltung unter `/admin/vorschau` ist ausschließlich für das Testkonto Administration bestimmt. Zur vollständigen Rücksetzung ist die Bestätigung `TESTDATEN` nötig. Mitglieder können fremde Tickets und interne Notizen nicht sehen. Die Testrollen haben voneinander getrennte Passwörter. Nach zehn Fehlversuchen pro Testrolle gilt eine zehnminütige Sperre; diese wird in der Datenbank und nicht nur im Speicher einer Serverinstanz geführt.

Vercel ruft täglich `/api/preview/cleanup` mit dem Cron-Schlüssel auf. Die Route akzeptiert ausschließlich den passenden Bearer-Schlüssel und ausschließlich den Vorschaumodus. Sie entfernt abgelaufene Limits sowie geschlossene, selbst angelegte Testtickets und Audit-Einträge nach sieben Tagen. Die Bereinigung ist auch über die Vorschauverwaltung auslösbar. Ursprüngliche Beispieltickets bleiben bestehen. Ein Fünf-Minuten-Takt wird im Gratis-Tarif nicht behauptet: https://vercel.com/docs/cron-jobs/usage-and-pricing.

Die bisherigen Hintergrundjobs bleiben für einen späteren getrennten Betrieb als `npm run jobs:tick` erhalten. Für einen echten Fünf-Minuten-Takt und einen dauerhaft laufenden Discord-Bot ist eine eigene geeignete Laufzeit beziehungsweise ein Scheduler nötig.

## Abschalten und späterer echter Betrieb

Zum Abschalten das Vercel-Projekt pausieren beziehungsweise entfernen und die Neon-Vorschau-Datenbank nach Bedarf löschen. Vorher gegebenenfalls ausschließlich ihre Testdaten sichern. Die lokale Bestandsinstallation wird dadurch nicht verändert.

Ein echter Betrieb verwendet eine eigene Produktionsdatenbank, echte geprüfte Betreiberangaben, konfigurierte Dienstleister und OAuth-Rückleitungen. `DRP_HOSTED_PREVIEW` und sämtliche lokalen Demoflags müssen dafür ausgeschaltet sein. `npm run check:release` verweigert eine Freigabe mit aktiven Testmodi. Die Testnutzer mit `preview-`-IDs und der lokale `demo-owner` erhalten außerhalb ihrer vorgesehenen Umgebungen keine Sonderberechtigung. Die Entscheidungsvorschau wird nicht einfach mit echten Nutzerdaten weiterverwendet.
