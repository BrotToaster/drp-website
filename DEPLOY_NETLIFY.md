# DRP auf Netlify veröffentlichen

Diese Anleitung setzt ein kostenloses GitHub-Konto und ein Netlify-Konto voraus. Die Datei `.env` wird niemals hochgeladen; sie ist bereits durch `.gitignore` ausgeschlossen.

## 1. Leeres GitHub-Repository erstellen

1. Auf GitHub **New repository** auswählen.
2. Einen Namen wie `drp-website` verwenden.
3. Das Repository privat oder öffentlich anlegen.
4. **Keine** README, `.gitignore` oder Lizenz von GitHub erzeugen lassen, weil diese Dateien bereits im Projekt vorhanden sind.

Danach im Projektordner in PowerShell ausführen:

```powershell
git init
git add .
git commit -m "DRP-Serverportal für Netlify vorbereiten"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/drp-website.git
git push -u origin main
```

`DEIN-NAME` und gegebenenfalls `drp-website` durch die tatsächlichen GitHub-Werte ersetzen. Falls Git nach einer Anmeldung fragt, die Anmeldung im Browser abschließen.

## 2. Repository mit Netlify verbinden

1. [Netlify](https://app.netlify.com/) öffnen und anmelden.
2. **Add new project** → **Import an existing project** auswählen.
3. GitHub verbinden und das Repository `drp-website` auswählen.
4. Als Produktionsbranch `main` verwenden.
5. Die Build-Einstellungen nicht manuell verändern. Netlify liest sie aus `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Deployment starten.

Das Paket `@netlify/database` veranlasst Netlify, eine PostgreSQL-Datenbank bereitzustellen. Die Migrationen aus `netlify/database/migrations` werden unmittelbar vor der Veröffentlichung automatisch angewendet. Wenn Netlify keine Datenbank automatisch erzeugt, im Projektmenü **Database** → **Create database** auswählen und anschließend **Retry deploy** verwenden.

## 3. Umgebungsvariablen eintragen

Im Netlify-Projekt **Project configuration** → **Environment variables** öffnen und folgende Variablen anlegen:

| Variable | Wert |
|---|---|
| `AUTH_URL` | `https://DEIN-PROJEKT.netlify.app` |
| `AUTH_SECRET` | Langer zufälliger geheimer Wert |
| `AUTH_DISCORD_ID` | Discord Application ID |
| `AUTH_DISCORD_SECRET` | Discord Client Secret |
| `AUTH_ROBLOX_ID` | Roblox OAuth Client ID |
| `AUTH_ROBLOX_SECRET` | Roblox OAuth Client Secret |
| `AUTH_DEMO_MODE` | `false` |
| `OWNER_DISCORD_ID` | Deine numerische Discord-Benutzer-ID |
| `BOT_INGEST_TOKEN` | Langer zufälliger geheimer Bot-Token |
| `ERLC_SERVER_KEY` | Optionaler ER:LC-Server-Key |
| `NEXT_PUBLIC_DISCORD_INVITE` | `https://discord.gg/drpg` |
| `NEXT_PUBLIC_ROBLOX_JOIN_URL` | Dein Roblox-Beitrittslink |

`NETLIFY_DB_URL` nicht selbst eintragen. Netlify erzeugt diese Variable automatisch für die richtige Produktions- oder Preview-Datenbank.

Sichere Werte können in PowerShell erzeugt werden:

```powershell
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Den Befehl zweimal ausführen: einmal für `AUTH_SECRET` und einmal für `BOT_INGEST_TOKEN`. Geheimnisse niemals in GitHub, Discord oder Screenshots veröffentlichen.

Nach Änderungen an den Environment Variables unter **Deploys** einen neuen Deploy starten.

## 4. OAuth-Callbacks umstellen

`DEIN-PROJEKT` durch den tatsächlichen Netlify-Projektnamen oder später durch die eigene Domain ersetzen.

Discord Developer Portal → OAuth2 → Redirects:

```text
https://DEIN-PROJEKT.netlify.app/api/auth/callback/discord
```

Roblox Creator Dashboard → OAuth App → Redirect URLs:

```text
https://DEIN-PROJEKT.netlify.app/api/auth/callback/roblox
```

Für Roblox müssen die Scopes `openid` und `profile` aktiviert sein. Die bisherigen Localhost-Callbacks können für lokale Tests zusätzlich bestehen bleiben.

## 5. Deployment prüfen

Nach einem erfolgreichen Deploy folgende Bereiche testen:

1. Startseite, News, Regelwerk und Team öffnen.
2. Mit dem in `OWNER_DISCORD_ID` hinterlegten Discord-Konto anmelden.
3. Roblox-Konto verbinden, Registrierung abschließen und Regeln bestätigen.
4. Je ein Ticket der Kategorien „Technischer Support“ und „Kontaktaufnahme“ erstellen.
5. Im Staff-Panel Ticketstatus, Regel- und News-Redaktion sowie Audit-Log testen.
6. Im Admin-Panel Rollen, Discord-Zuordnungen, Ticketzugriffe und Website-Texte prüfen.
7. Unter **Database** kontrollieren, ob Tabellen und Datensätze vorhanden sind.

## 6. Selbst gehosteten Discord-Bot verbinden

Der Bot schreibt über HTTPS in die Website. Dadurch benötigt er keinen direkten Datenbankzugang.

```text
POST https://DEIN-PROJEKT.netlify.app/api/bot/data
Authorization: Bearer DEIN_BOT_INGEST_TOKEN
Content-Type: application/json
```

Beispielinhalt:

```json
{
  "namespace": "public",
  "key": "discord",
  "discordGuildId": "DEINE_GUILD_ID",
  "data": {
    "members": 250,
    "online": 74,
    "inviteCode": "drpg"
  }
}
```

Chronologische Bot-Ereignisse gehen an `/api/bot/events`.

## 7. Spätere Änderungen veröffentlichen

Nach Änderungen im Projekt:

```powershell
git add .
git commit -m "Website aktualisiert"
git push
```

Netlify baut und veröffentlicht den neuen Stand automatisch.

## 8. Lokal mit der Netlify-Datenbank testen

Empfohlen wird eine aktuelle Node.js-LTS-Version, mindestens Node 20.19.

Einmalig:

```powershell
npx netlify login
npx netlify link
```

Dann Terminal 1:

```powershell
npm run dev:netlify
```

Beim ersten Start Terminal 2:

```powershell
npm run db:setup
```

Anschließend ist die Website unter `http://localhost:3000` erreichbar. Die lokale PostgreSQL-Datenbank läuft ohne Docker und wird beendet, sobald `npm run dev:netlify` beendet wird.

## Zusätzliche Variablen für Portal v2

In Netlify unter **Site configuration → Environment variables** ergänzen:

- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- optional DISCORD_GUILD_ID

Nach dem Deploy zuerst die Migrationen anwenden. Danach sendet der Bot einmal POST /api/bot/discord/roles, die Discord-Zuordnungen werden im Admin-Panel aktiviert und anschließend folgt der vollständige Mitgliederabgleich über POST /api/bot/discord/members.

Für den Mitgliederabgleich muss beim Discord-Bot der privilegierte GUILD_MEMBERS-Intent aktiviert sein.