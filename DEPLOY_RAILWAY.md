# DRP auf Railway betreiben

## 1. Website-Service

Der Website-Service verwendet das GitHub-Repository und startet mit `npm run start`. Als Build-Befehl wird `npm run build` verwendet. Das Projekt legt Railway über `package.json` auf Node.js 22 fest. Lokal sollte Node.js 22.13 oder neuer aus der 22er-LTS-Reihe verwendet werden.

Empfohlene Railway-Einstellungen für **drp-website → Settings → Deploy**:

- Build Command: `npm run build`
- Start Command: `npm run start`
- Healthcheck Path: `/api/health`
- Healthcheck Timeout: `120`
- Pre-Deploy Command: nach erfolgreicher Migration leer lassen

Unter **Variables** kann zusätzlich `RAILPACK_NODE_NPM_INSTALL=npm ci` gesetzt werden. Dadurch verwendet Railway exakt die geprüfte Lockdatei.

In Railway unter **drp-website → Variables** werden mindestens diese Variablen angelegt:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_URL=https://drpg.up.railway.app
AUTH_TRUST_HOST=true
AUTH_SECRET=EIN_LANGER_ZUFAELLSWERT
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
AUTH_ROBLOX_ID=
AUTH_ROBLOX_SECRET=
AUTH_DEMO_MODE=false
OWNER_DISCORD_ID=
ERLC_SERVER_KEY=
BOT_INGEST_TOKEN=EIN_ZWEITER_LANGER_ZUFAELLSWERT
DISCORD_GUILD_ID=
MELONLY_API_TOKEN=
MELONLY_API_BASE_URL=https://api.melonly.xyz/api/v1
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/drpg
NEXT_PUBLIC_ROBLOX_JOIN_URL=https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County
```

`DATABASE_URL` wird als Railway-Referenz eingetragen, nicht als öffentliches Datenbankpasswort. Nach Änderungen an OAuth-Variablen muss der Website-Service neu bereitgestellt werden.

Nach jedem Deployment zeigt `https://drpg.up.railway.app/api/health` den aktuell laufenden Commit unter `version`. So lässt sich eindeutig erkennen, ob Railway wirklich die neue Version aktiviert hat und nicht auf ein älteres Deployment zurückgerollt ist.

## 2. Datenbank sichern und Migrationen anwenden

Vor dem Rollout im Railway-Dashboard ein aktuelles PostgreSQL-Backup beziehungsweise einen Volume-Snapshot erstellen. Erst fortfahren, wenn die Sicherung als erfolgreich angezeigt wird. Die v7-Migration ist additiv; vorhandene Dokumente, Rollen und Regelbestätigungen bleiben erhalten. Nur tatsächlich geänderte Regeln erhalten durch die anschließende Fixture-Migration eine neue Version.

Im Website-Container:

```bash
npx prisma db execute --schema prisma/schema.prisma --file netlify/database/migrations/20260818120000_portal_v5.sql
npx prisma db execute --schema prisma/schema.prisma --file netlify/database/migrations/20260818130000_portal_v6.sql
npx prisma db execute --schema prisma/schema.prisma --file netlify/database/migrations/20260819120000_portal_v7.sql
npx prisma db execute --schema prisma/schema.prisma --file netlify/database/migrations/20260819120100_rule_fixture_v7.sql
node prisma/seed.mjs
```

Jede Migration nur einmal und in der angegebenen Reihenfolge ausführen. Bereits erfolgreich angewendete Dateien werden übersprungen. Danach die Website neu bereitstellen.

Nach dem ersten v6-Deploy im Admin-Panel unter **Melonly & Team**:

1. die synchronisierten Discord-Ränge von `JM` bis zur letzten gewünschten Stufe konfigurieren,
2. pro Rang Sektion, Kurzname, Position, Wochenziel und Folgerang festlegen,
3. beim letzten Rang optional `Prüfungszulassung` als abweichende Ausgabe eintragen,
4. Melonly-Mitglieder direkt mit Discord-Mitgliedern verknüpfen und angezeigte Konflikte auflösen.

Nach dem ersten v7-Deploy im Admin-Panel unter **Dokumente & Zugriffe**:

1. `Team-Regelwerk`, `User Liste`, `Zwischen Prüfung` und `Junior Moderator Prüfung` direkt importieren,
2. `Strafen Katalog` als XLSX und `Test Administrator Prüfung` als DOCX hochladen und importieren,
3. kontrollieren, dass das Team-Regelwerk und die fünf ausgelagerten Protokolle vorhanden sind,
4. pro Dokument den Modus **Eingeschränkt** beibehalten und die erlaubten Website-Rollen setzen,
5. erst nach der Kontrolle die ursprünglichen Google-Dateien auf **Eingeschränkt** stellen.

Neue Importe sind absichtlich zunächst ausschließlich für Owner sichtbar. Die Google-Originale müssen bis zum erfolgreichen Import erreichbar bleiben; die Website-Freigabe schützt keinen weiterhin öffentlich geteilten Google-Link.

## 3. Railway-Cronservice

Im selben Railway-Projekt einen weiteren Service aus demselben GitHub-Repository erstellen. Er benötigt dieselben Variablen `DATABASE_URL`, `ERLC_SERVER_KEY` und `MELONLY_API_TOKEN`.

- Start Command: `npm run jobs:tick`
- Cron Schedule: `*/5 * * * *`
- Build Command: `npx prisma generate`
- Healthcheck: leer lassen, da der Job absichtlich keinen Webserver startet
- Pre-Deploy Command: leer lassen

Der Prozess beendet sich nach jedem Lauf. Datenbank-Sperren verhindern doppelte ER:LC-, Melonly- und Wochenauswertungen. ER:LC wird alle fünf Minuten geprüft; Detaildaten werden nur geladen, wenn Spieler online sind. Melonly wird höchstens einmal pro Stunde synchronisiert. Das setzt wegen der dokumentierten API-Limits in der Praxis Melonly Plus voraus.

## 4. Discord-Bot

Der Bot synchronisiert weiterhin Rollen und Mitglieder. Zusätzlich verarbeitet er Rollenaufträge:

1. `GET /api/bot/discord/role-jobs` mit `Authorization: Bearer BOT_INGEST_TOKEN`.
2. Für jeden Auftrag die angegebene Discord-Rolle hinzufügen oder entfernen.
3. Ergebnisse an `POST /api/bot/discord/role-jobs` senden:

```json
{
  "jobs": [
    { "id": "job-id", "success": true },
    { "id": "job-id-2", "success": false, "error": "Missing permissions" }
  ]
}
```

Die Bot-Rolle muss oberhalb der Strike- und Up-Rank-Sperrrollen stehen. Die Zuordnungen werden im Admin-Panel unter **Melonly & Team** festgelegt.

## 5. OAuth-Weiterleitungen

Im Discord Developer Portal muss `https://drpg.up.railway.app/api/auth/callback/discord` eingetragen sein. In Roblox wird entsprechend `https://drpg.up.railway.app/api/auth/callback/roblox` hinterlegt. Bei einer eigenen Domain werden beide URLs zusätzlich mit der endgültigen Domain eingetragen und `AUTH_URL` angepasst.
