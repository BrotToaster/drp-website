# DRP – Deutschland Roleplay

Communityportal für ER:LC mit Regeln, News, Kalender, Konten, Tickets und geschützten Team- und Verwaltungsbereichen. Die Oberfläche unterstützt helle und dunkle Darstellung, eine überspringbare Einführung und optionale Lichtspiele.

## Entscheidungsvorschau

Diese Version bereitet eine getrennte, passwortgeschützte Vorschau mit künstlichen Konten und Daten vor. Sie ist keine Freigabe für echten Communitybetrieb. Zielplattform: Vercel Hobby und eine neue Neon-PostgreSQL-Datenbank. Ein statischer Dateihoster beziehungsweise GitHub Pages reicht für die serverseitigen Funktionen nicht aus.

Die vollständige Anleitung steht in [HOSTING_PREVIEW.md](./HOSTING_PREVIEW.md). Sicherheitsbefunde, Prüfungen und Grenzen stehen in [SECURITY_REVIEW.md](./SECURITY_REVIEW.md). Verwendete Gestaltungskomponenten und lokale Hilfsprogramme sind unter [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) aufgeführt.

## Entwicklung und Prüfung

Voraussetzungen: Node.js 22 ab 22.13, npm und PostgreSQL 17. Zugangsdaten gehören in ignorierte Umgebungsdateien oder in die Secret-Verwaltung des Hosters. Die Datei [.env.example](./.env.example) enthält ausschließlich Vorlagen.

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run lint
npm run typecheck
npm test
npm run check:dependencies
npm run build
npm run check:secrets
```

Migrationen werden ausdrücklich ausgeführt, nicht bei jedem Build. Bei bereits vorhandenen Tabellen ohne passende Migrationshistorie bricht die Einrichtung ab. Ein Seed ist ein gesonderter Import von Beispieldaten und gehört nicht zum normalen Start einer bestehenden Installation.

## Windows lokal

Die vorhandenen Startdateien bleiben erhalten: `Start-DRP.bat` für die optimierte PC-Vorschau, `Start-DRP-Handy.bat` für das Heimnetz, `Start-DRP-Entwicklung.bat` für Bearbeitung und `Stop-DRP.bat` zum Beenden. Sie benötigen die bereits eingerichteten projektlokalen Laufzeiten und die lokale Konfiguration. Daten und Laufzeiten werden nicht mit dem Repository verteilt.

Die lokale Entscheidungsvorschau verwendet eine eigene Datenbank und standardmäßig Port 3108. Sie wird über `node scripts/preview-server.mjs runtime/preview.env` gestartet; siehe Hosting-Anleitung. Ein öffentlicher passwortloser Owner-Demozugang ist nicht vorgesehen.

`Backup-DRP.bat` beziehungsweise `npm run db:backup` sichert die lokale Bestandsdatenbank im Verzeichnis `backups`. Eine Sicherung wird zunächst in eine neue Datenbank wiederhergestellt:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local.ps1 -Action Restore -BackupFile backups/drp_DATUM.dump -RestoreName drp_restore_pruefung
```

Den tatsächlichen Dateinamen einsetzen. Der Wiederherstellungsbefehl überschreibt keine bestehende Datenbank und stellt die laufende Website nicht automatisch um. Sicherungen können personenbezogene Daten enthalten und gehören ausschließlich in eine private, geschützte Ablage.

## Betreiber und Datenschutz

Die frühere Impressumsadresse führt zum Verantwortlichen-Abschnitt der Datenschutzerklärung. Tatsächliche Betreiber- und Kontaktangaben bleiben erforderlich, soweit die einschlägigen Informationspflichten sie verlangen. Musterangaben sind als solche gekennzeichnet. Ein Betreiber in der Schweiz ist keine pauschale rechtliche Ausnahme für jedes Angebot.

## Frühere Hostingvarianten

`DEPLOY_RAILWAY.md` und `DEPLOY_NETLIFY.md` dokumentieren frühere Varianten. Für diese Entscheidungsvorschau gilt ausschließlich die neue Anleitung; eine Umstellung auf echten Betrieb braucht eine eigene Prüfung.
