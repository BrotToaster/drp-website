# DRP Discord-Bot auf einem Windows-PC

Dieser Bot verbindet Discord mit dem DRP-Portal auf Railway. Er synchronisiert Discord-Rollen und Mitglieder, aktualisiert Discord-Namen und Avatare auf der Website und verarbeitet Rollenauftraege fuer Strikes und Up-Rank-Sperren.

## Voraussetzungen

- Windows 10 oder Windows 11
- Python 3.11 oder 3.12 von https://www.python.org/downloads/windows/
- Der PC bleibt eingeschaltet und darf nicht automatisch in den Energiesparmodus wechseln.
- Der Bot ist auf dem Discord-Server und besitzt `Rollen verwalten`.
- Im Discord Developer Portal ist der `Server Members Intent` aktiviert.
- Die Bot-Rolle steht ueber Strike 1, Strike 2, Strike 3 und Up-Rank-Sperre.

Es sind keine Portfreigabe, keine feste IP-Adresse und keine eingehende Firewall-Regel erforderlich. Der Bot baut nur ausgehende HTTPS- und Discord-Gateway-Verbindungen auf.

## 1. Discord Developer Portal

1. https://discord.com/developers/applications oeffnen.
2. Die Anwendung der DRP-Website auswaehlen.
3. Unter `Bot` einen Bot hinzufuegen oder `Reset Token` verwenden.
4. Den neuen Bot-Token kopieren. Er gehoert nur in `config.json`.
5. Unter `Privileged Gateway Intents` den `Server Members Intent` einschalten.
6. Unter `Installation` bzw. dem OAuth2 URL Generator den Scope `bot` und die Berechtigung `Manage Roles` waehlen.
7. Den Bot auf den DRP-Discord einladen.
8. In den Discord-Servereinstellungen die Bot-Rolle ueber alle zu verwaltenden Rollen ziehen.

## 2. Discord-Server-ID kopieren

1. Discord-Benutzereinstellungen oeffnen.
2. `Erweitert` -> `Entwicklermodus` einschalten.
3. Rechtsklick auf den DRP-Server -> `Server-ID kopieren`.

## 3. BOT_INGEST_TOKEN pruefen

In Railway muss beim Website-Dienst `drp-website` die Variable `BOT_INGEST_TOKEN` existieren. Derselbe Wert wird in die lokale `config.json` eingetragen. Das ist nicht der Discord-Bot-Token.

Nach einer Aenderung an Railway-Variablen muss der Website-Dienst neu deployed werden.

## 4. Bot auf dem alten PC installieren

Den gesamten Ordner `discord-bot` auf den alten PC kopieren, zum Beispiel nach:

```text
C:\DRP\discord-bot
```

Danach `install.bat` doppelt anklicken. Das Skript erstellt eine isolierte Python-Umgebung und installiert die Abhaengigkeiten aus `requirements.txt`.

## 5. config.json ausfuellen

`config.json` mit Editor oder Notepad oeffnen:

```json
{
  "discord_token": "NEUER_DISCORD_BOT_TOKEN",
  "guild_id": 123456789012345678,
  "website_url": "https://drpg.up.railway.app",
  "bot_ingest_token": "GLEICHER_WERT_WIE_BOT_INGEST_TOKEN_BEI_RAILWAY",
  "sync": {
    "full_sync_hours": 6,
    "role_job_poll_seconds": 20,
    "member_batch_size": 500,
    "request_timeout_seconds": 30,
    "request_retries": 3
  },
  "logging": {
    "level": "INFO",
    "file": "logs/drp-bot.log",
    "max_bytes": 5242880,
    "backup_count": 5
  }
}
```

Die Server-ID wird als Zahl ohne Anfuehrungszeichen eingetragen. Tokens stehen in Anfuehrungszeichen. JSON erlaubt keine Kommentare und kein Komma nach dem letzten Feld.

`config.json` niemals in GitHub, Discord, Screenshots oder Supportnachrichten veroeffentlichen.

## 6. Erster Test

`start_bot.bat` doppelt anklicken. Beim ersten erfolgreichen Start erscheinen unter anderem:

```text
Bot ist als ... online
Starte vollstaendigen Discord-Abgleich
Discord-Rollen synchronisiert
Vollabgleich abgeschlossen
```

Das Fenster offen lassen. Logs werden zusaetzlich unter `logs\drp-bot.log` gespeichert.

Typische Fehler:

- `401`: Der lokale `bot_ingest_token` stimmt nicht mit Railway ueberein oder die Website wurde danach nicht neu deployed.
- `PrivilegedIntentsRequired`: Im Discord Developer Portal fehlt `Server Members Intent`.
- `Missing Permissions`: Die Bot-Rolle besitzt nicht `Rollen verwalten` oder steht zu weit unten.
- `Discord-Rolle wurde nicht gefunden`: Zuordnung im Admin-Panel aktualisieren und Rollen erneut synchronisieren lassen.
- `Bot ist online, aber nicht auf dem konfigurierten Server`: Guild-ID ist falsch oder der Bot wurde nicht eingeladen.

## 7. Automatisch mit Windows starten

Empfohlen wird die Windows-Aufgabenplanung:

1. `Win + R` druecken.
2. `taskschd.msc` eingeben.
3. Rechts `Aufgabe erstellen` waehlen.
4. Name: `DRP Discord Bot`.
5. `Unabhaengig von der Benutzeranmeldung ausfuehren` aktivieren.
6. Unter `Trigger` -> `Neu` -> `Beim Start`.
7. Unter `Aktionen` -> `Neu` -> `Programm starten`.
8. Programm/Skript: `C:\DRP\discord-bot\start_bot.bat`.
9. `Starten in`: `C:\DRP\discord-bot`.
10. Unter `Bedingungen` die Option entfernen, die den Start nur bei Netzbetrieb erlaubt, falls der alte PC ein Laptop ist.
11. Unter `Einstellungen` `Aufgabe so schnell wie moeglich nach einem verpassten Start ausfuehren` aktivieren.
12. Speichern und die Aufgabe einmal manuell mit `Ausfuehren` testen.

In den Windows-Energieoptionen den automatischen Ruhezustand deaktivieren. Der Bildschirm darf ausgeschaltet werden; der PC selbst muss wach bleiben.

## 8. Admin-Panel einrichten

Nach dem ersten Vollabgleich:

1. Auf der Website als Owner anmelden.
2. Admin -> Discord oeffnen.
3. Discord-Rollen den Website-Rollen zuordnen.
4. Admin -> Melonly & Team oeffnen.
5. Strike 1, Strike 2, Strike 3 und Up-Rank-Sperre den Discord-Rollen zuordnen und aktivieren.
6. Unter Rollenauftraege kontrollieren, ob Auftraege erfolgreich verarbeitet werden.

## Betrieb und Updates

- `start_bot.bat` startet den Prozess nach einem Absturz nach zehn Sekunden neu.
- discord.py verbindet eine unterbrochene Discord-Gateway-Verbindung normalerweise automatisch wieder.
- Alle sechs Stunden findet ein vollstaendiger Rollen- und Mitgliederabgleich statt.
- Rollen- und Namensaenderungen werden sofort uebertragen.
- Alle 20 Sekunden werden offene Rollenauftraege abgefragt.
- Alle fuenf Minuten schreibt der Bot einen Statusdatensatz an die Website.
- Die Website und PostgreSQL bleiben auf Railway. Auf dem alten PC liegt nur der Bot und seine lokale Konfiguration.
