# DRP – Deutschland Roleplay Portal

Responsives Next.js-Portal für den ER:LC-Server mit öffentlichem Regelwerk und News, Discord-/Roblox-OAuth, Spieler-Dashboard, Tickets sowie rollenbasiertem Staff- und Admin-Panel.

## Technik

- Next.js 15 App Router, TypeScript und Tailwind CSS
- Auth.js mit Discord und Roblox OAuth
- PostgreSQL über Netlify Database und Prisma 6
- TipTap-JSON für versionierte Regeln und News
- signierte Cloudinary-Direktuploads
- kombinierbare Datenbankrollen mit Discord-Synchronisierung

## Lokal starten

~~~powershell
npm install
Copy-Item .env.example .env
npx netlify login
npx netlify link
npm run dev:netlify
~~~

In einem zweiten Terminal werden die Migrationen einmalig angewendet:

~~~powershell
npm run db:setup
npm run db:seed
~~~

Danach ist die Website unter http://localhost:3000 erreichbar. Docker wird nicht benötigt. npm run dev funktioniert nur, wenn DATABASE_URL auf eine erreichbare PostgreSQL-Datenbank zeigt.

## Netlify

Die ausführliche Anleitung steht in [DEPLOY_NETLIFY.md](./DEPLOY_NETLIFY.md). Vor dem ersten Produktionsdeploy müssen alle Werte aus .env.example als Netlify Environment Variables hinterlegt werden. Geheimnisse gehören niemals in Git.

Migrationen liegen unter netlify/database/migrations. Die Portal-v2-Migration:

- überführt bestehende feste Rollen in kombinierbare Rollen,
- führt TECHNICAL und CONTACT als Ticketkategorien ein,
- entfernt Bewerbungen und Sanktionen,
- erstellt versionierte Regeln/News und Medien,
- importiert 60 Regeln aus dem bestehenden DRP-Regelwerk.

## Discord-Bot

Alle Bot-Endpunkte erwarten:

~~~text
Authorization: Bearer <BOT_INGEST_TOKEN>
Content-Type: application/json
~~~

Vorhandene generische Endpunkte:

- POST /api/bot/data – aktuelle Werte
- POST /api/bot/events – chronologische Ereignisse

Neue Rollensynchronisierung:

- POST /api/bot/discord/roles
- POST /api/bot/discord/members

Beispiel für Rollen:

~~~json
{
  "guildId": "123456789",
  "externalId": "roles-sync-2026-07-17T12:00:00Z",
  "roles": [
    {
      "id": "987654321",
      "name": "Supporter",
      "color": "#57c98c",
      "position": 20,
      "managed": false
    }
  ]
}
~~~

Beispiel für Mitglieder:

~~~json
{
  "guildId": "123456789",
  "externalId": "members-sync-2026-07-17T12:00:00Z-1",
  "members": [
    {
      "id": "111222333",
      "username": "beispiel",
      "displayName": "Beispiel",
      "avatarUrl": null,
      "roleIds": ["987654321"]
    }
  ]
}
~~~

externalId macht Wiederholungen idempotent. Der Bot sollte auf Guild Member Update reagieren und zusätzlich regelmäßig einen Vollabgleich senden. Dafür muss im Discord Developer Portal der privilegierte GUILD_MEMBERS-Intent aktiviert sein.

## Regelwerk-Fixture

Das importierte Regelwerk liegt in data/rules.fixture.json. Neu erzeugen:

~~~powershell
node scripts/import-rule-source.mjs
node scripts/generate-rule-migration.mjs
~~~

Die Fixture enthält eine SHA-256-Prüfsumme, die durch Tests abgesichert wird.

## Qualität

~~~powershell
npm run lint
npm run typecheck
npm test
npm run build
~~~