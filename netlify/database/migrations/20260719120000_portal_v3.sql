-- DRP portal v3: ticket archive, profile refresh, editorial pages, legal settings and service status.

CREATE TYPE "StatusSource" AS ENUM ('ERLC', 'DISCORD', 'ROBLOX', 'MANUAL');
CREATE TYPE "ServiceStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE', 'UNKNOWN');

ALTER TABLE "User"
  ADD COLUMN "discordAvatarUrl" TEXT,
  ADD COLUMN "discordSyncedAt" TIMESTAMP(3),
  ADD COLUMN "robloxAvatarUrl" TEXT,
  ADD COLUMN "robloxSyncedAt" TIMESTAMP(3);
UPDATE "User" SET "email" = NULL;

ALTER TABLE "Ticket"
  ADD COLUMN "ownerArchivedAt" TIMESTAMP(3),
  ADD COLUMN "ownerHiddenAt" TIMESTAMP(3);
CREATE INDEX "Ticket_userId_ownerHiddenAt_ownerArchivedAt_idx"
  ON "Ticket"("userId", "ownerHiddenAt", "ownerArchivedAt");

ALTER TABLE "RoleTicketCategoryAccess" ADD COLUMN "canDelete" BOOLEAN NOT NULL DEFAULT false;
UPDATE "RoleTicketCategoryAccess" access
SET "canDelete" = true
FROM "AccessRole" role
WHERE access."roleId" = role."id" AND role."key" IN ('ADMIN', 'OWNER');

INSERT INTO "Permission" ("id", "key", "label", "group") VALUES
  ('perm-tickets-delete', 'tickets.delete', 'Geschlossene Tickets löschen', 'Tickets'),
  ('perm-faq-view', 'faq.view', 'FAQ-Verwaltung anzeigen', 'FAQ'),
  ('perm-faq-manage', 'faq.manage', 'FAQ verwalten', 'FAQ'),
  ('perm-team-manage', 'team.manage', 'Teamseite verwalten', 'Administration'),
  ('perm-status-manage', 'status.manage', 'Statusseite verwalten', 'Administration'),
  ('perm-legal-manage', 'legal.manage', 'Rechtliche Inhalte verwalten', 'Administration')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "AccessRole" role CROSS JOIN "Permission" permission
WHERE role."key" = 'OWNER'
  AND permission."key" IN ('tickets.delete', 'faq.view', 'faq.manage', 'team.manage', 'status.manage', 'legal.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "AccessRole" role CROSS JOIN "Permission" permission
WHERE role."key" = 'ADMIN'
  AND permission."key" IN ('tickets.delete', 'faq.view', 'faq.manage', 'team.manage', 'status.manage', 'legal.manage')
ON CONFLICT DO NOTHING;

ALTER TABLE "StaffProfile" DROP CONSTRAINT IF EXISTS "StaffProfile_userId_fkey";
ALTER TABLE "StaffProfile"
  ALTER COLUMN "userId" DROP NOT NULL,
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "imageId" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "StaffProfile" profile
SET "displayName" = COALESCE(member."name", 'DRP Team')
FROM "User" member
WHERE profile."userId" = member."id";
UPDATE "StaffProfile" SET "displayName" = 'DRP Team' WHERE "displayName" IS NULL;
ALTER TABLE "StaffProfile" ALTER COLUMN "displayName" SET NOT NULL;
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_imageId_fkey"
  FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FaqItem" (
  "id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FaqItem_visible_sortOrder_idx" ON "FaqItem"("visible", "sortOrder");
ALTER TABLE "FaqItem" ADD CONSTRAINT "FaqItem_editorId_fkey"
  FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FaqItem" ("id", "question", "answer", "sortOrder") VALUES
  ('faq-serverzugang', 'Wie komme ich auf den Server?', 'Tritt unserem Discord bei, verbinde Discord und Roblox und bestätige anschließend das aktuelle Regelwerk im Dashboard.', 10),
  ('faq-support', 'Wie erreiche ich den Support?', 'Erstelle im Dashboard ein Ticket als „Technischer Support“ oder „Kontaktaufnahme“. Dort siehst du jederzeit den Bearbeitungsstand.', 20),
  ('faq-konten', 'Warum muss ich Discord und Roblox verbinden?', 'Die Verknüpfung ordnet deine Community- und Spielidentität eindeutig zu, ohne dass DRP deine Passwörter erhält.', 30),
  ('faq-regeln', 'Wo sehe ich Regeländerungen?', 'Jede Regel zeigt ihre Version und letzte Bearbeitung. Nach einer neuen Veröffentlichung ist eine erneute Bestätigung erforderlich.', 40)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "StatusService" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "source" "StatusSource" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "manualStatus" "ServiceStatus" NOT NULL DEFAULT 'OPERATIONAL',
  "lastStatus" "ServiceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "lastMessage" TEXT,
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StatusService_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StatusService_key_key" ON "StatusService"("key");
CREATE INDEX "StatusService_enabled_sortOrder_idx" ON "StatusService"("enabled", "sortOrder");

CREATE TABLE "StatusUpdate" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "status" "ServiceStatus" NOT NULL,
  "message" TEXT,
  "public" BOOLEAN NOT NULL DEFAULT true,
  "authorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StatusUpdate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StatusUpdate_serviceId_createdAt_idx" ON "StatusUpdate"("serviceId", "createdAt");
CREATE INDEX "StatusUpdate_public_createdAt_idx" ON "StatusUpdate"("public", "createdAt");
ALTER TABLE "StatusUpdate" ADD CONSTRAINT "StatusUpdate_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "StatusService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatusUpdate" ADD CONSTRAINT "StatusUpdate_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "StatusService" ("id", "key", "name", "description", "source", "sortOrder", "updatedAt") VALUES
  ('status-erlc', 'erlc', 'ER:LC Server', 'Status und Spielerzahl des DRP Private Servers', 'ERLC', 10, CURRENT_TIMESTAMP),
  ('status-discord', 'discord', 'Discord', 'Offizieller Discord-Plattformstatus', 'DISCORD', 20, CURRENT_TIMESTAMP),
  ('status-roblox', 'roblox', 'Roblox', 'Offizieller Roblox-Plattformstatus', 'ROBLOX', 30, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SiteSetting" ("id", "key", "value", "updatedAt") VALUES
  ('setting-legal', 'legal.settings', '{"imprintEnabled":true,"privacyPublished":false,"operatorName":"","addressLine":"","postalCode":"","city":"","country":"Schweiz","contactEmail":"","donations":"NONE","lastReviewedAt":null,"noAgeVerificationAcknowledged":true}'::jsonb, CURRENT_TIMESTAMP),
  ('setting-retention', 'retention.settings', '{"closedTicketDays":365,"auditLogDays":730,"discordSnapshotDays":30}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;