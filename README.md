# DRP – ER:LC Serverportal

Minimalistisches Serverportal mit öffentlicher Website, Spieler-Dashboard, Staff-Panel, Discord-/Roblox-Anmeldung, Tickets, Bewerbungen, Sanktionen und einer geschützten Bot-Datenschnittstelle.

## Technik

- Next.js App Router und TypeScript
- Auth.js mit Discord und Roblox OAuth
- Prisma ORM mit PostgreSQL
- Netlify für Website, Server Actions, API-Routen und Deployments
- Netlify Database für die gemeinsame PostgreSQL-Datenbank

## Auf Netlify veröffentlichen

Die vollständige Schritt-für-Schritt-Anleitung steht in [DEPLOY_NETLIFY.md](./DEPLOY_NETLIFY.md).

Die wichtigsten Vorbereitungen sind bereits enthalten:

- `netlify.toml` mit Build- und lokaler Dev-Konfiguration
- automatische PostgreSQL-Migrationen unter `netlify/database/migrations`
- automatische Startdaten für Regelwerk, News, Team und Bot-Status
- Prisma-Anbindung an `NETLIFY_DB_URL`
- `.env.example` mit allen benötigten Variablen

## Lokal mit Netlify entwickeln

Nach dem ersten Netlify-Deployment und `netlify link`:

1. In Terminal 1: `npm run dev:netlify`
2. Beim ersten Start in Terminal 2: `npm run db:setup`
3. Im Browser `http://localhost:3000` öffnen

Netlify startet dabei eine lokale PostgreSQL-Datenbank. Docker wird nicht benötigt. Der reine Befehl `npm run dev` ist nur sinnvoll, wenn `DATABASE_URL` auf eine erreichbare PostgreSQL-Datenbank zeigt.

## Discord-Bot anbinden

Der selbst gehostete Bot muss keine Datenbank-Zugangsdaten erhalten. Er sendet den Header:

```text
Authorization: Bearer <BOT_INGEST_TOKEN>
```

Endpunkte:

- `POST /api/bot/data` für aktuelle, überschreibbare Werte
- `GET /api/bot/data` zum geschützten Auslesen
- `POST /api/bot/events` für chronologische Ereignisse

Beispiel für `/api/bot/data`:

```json
{
  "namespace": "public",
  "key": "discord",
  "discordGuildId": "123456789",
  "data": { "members": 250, "online": 74, "inviteCode": "drpg" }
}
```

Die Website speichert diese Werte serverseitig in Netlify Database. Der Datenbank-Connection-String bleibt geheim.

## Qualitätsprüfung

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```
