-- DRP portal v2: composable permissions, versioned content and Discord synchronization.

CREATE TYPE "AssignmentSource" AS ENUM ('MANUAL', 'DISCORD', 'SYSTEM');
CREATE TYPE "RevisionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

ALTER TABLE "User"
  ADD COLUMN "discordUsername" TEXT,
  ADD COLUMN "discordDisplayName" TEXT,
  ADD COLUMN "robloxDisplayName" TEXT;

CREATE TABLE "AccessRole" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#d6aa4c',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessRole_key_key" ON "AccessRole"("key");
CREATE UNIQUE INDEX "AccessRole_name_key" ON "AccessRole"("name");

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "group" TEXT NOT NULL,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

CREATE TABLE "RolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserRoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "source" "AssignmentSource" NOT NULL,
  "sourceKey" TEXT NOT NULL DEFAULT '',
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserRoleAssignment_userId_roleId_source_sourceKey_key" ON "UserRoleAssignment"("userId", "roleId", "source", "sourceKey");
CREATE INDEX "UserRoleAssignment_userId_idx" ON "UserRoleAssignment"("userId");
CREATE INDEX "UserRoleAssignment_roleId_idx" ON "UserRoleAssignment"("roleId");
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DiscordRole" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "discordRoleId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "managed" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscordRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscordRole_guildId_discordRoleId_key" ON "DiscordRole"("guildId", "discordRoleId");
CREATE INDEX "DiscordRole_guildId_position_idx" ON "DiscordRole"("guildId", "position");

CREATE TABLE "DiscordRoleMapping" (
  "id" TEXT NOT NULL,
  "discordRoleId" TEXT NOT NULL,
  "accessRoleId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscordRoleMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscordRoleMapping_discordRoleId_accessRoleId_key" ON "DiscordRoleMapping"("discordRoleId", "accessRoleId");
ALTER TABLE "DiscordRoleMapping" ADD CONSTRAINT "DiscordRoleMapping_discordRoleId_fkey" FOREIGN KEY ("discordRoleId") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscordRoleMapping" ADD CONSTRAINT "DiscordRoleMapping_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DiscordMemberSnapshot" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "discordId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "roleIds" JSONB NOT NULL,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscordMemberSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscordMemberSnapshot_guildId_discordId_key" ON "DiscordMemberSnapshot"("guildId", "discordId");
CREATE INDEX "DiscordMemberSnapshot_discordId_idx" ON "DiscordMemberSnapshot"("discordId");

CREATE TABLE "TicketCategory" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TicketCategory_key_key" ON "TicketCategory"("key");

CREATE TABLE "RoleTicketCategoryAccess" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT false,
  "canReply" BOOLEAN NOT NULL DEFAULT false,
  "canAssign" BOOLEAN NOT NULL DEFAULT false,
  "canStatus" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "RoleTicketCategoryAccess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RoleTicketCategoryAccess_roleId_categoryId_key" ON "RoleTicketCategoryAccess"("roleId", "categoryId");
ALTER TABLE "RoleTicketCategoryAccess" ADD CONSTRAINT "RoleTicketCategoryAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleTicketCategoryAccess" ADD CONSTRAINT "RoleTicketCategoryAccess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AccessRole" ("id", "key", "name", "description", "color", "priority", "isSystem", "updatedAt") VALUES
  ('role-player', 'PLAYER', 'Player', 'Standardrolle für alle registrierten Nutzer', '#7d858c', 0, true, CURRENT_TIMESTAMP),
  ('role-supporter', 'SUPPORTER', 'Supporter', 'Bearbeitet Community-Anfragen', '#57c98c', 20, true, CURRENT_TIMESTAMP),
  ('role-moderator', 'MODERATOR', 'Moderator', 'Moderation und Qualitätssicherung', '#63a8ff', 40, true, CURRENT_TIMESTAMP),
  ('role-admin', 'ADMIN', 'Admin', 'Verwaltet Inhalte und Integrationen', '#efc76e', 60, true, CURRENT_TIMESTAMP),
  ('role-owner', 'OWNER', 'Owner', 'Geschützte Projektleitung mit allen Rechten', '#ef6b6b', 100, true, CURRENT_TIMESTAMP);

INSERT INTO "Permission" ("id", "key", "label", "group") VALUES
  ('perm-staff-access', 'staff.access', 'Staff-Panel öffnen', 'Zugang'),
  ('perm-admin-access', 'admin.access', 'Admin-Panel öffnen', 'Zugang'),
  ('perm-tickets-view', 'tickets.view', 'Tickets anzeigen', 'Tickets'),
  ('perm-tickets-reply', 'tickets.reply', 'Auf Tickets antworten', 'Tickets'),
  ('perm-tickets-assign', 'tickets.assign', 'Tickets zuweisen', 'Tickets'),
  ('perm-tickets-status', 'tickets.status', 'Ticketstatus ändern', 'Tickets'),
  ('perm-users-view', 'users.view', 'Nutzer anzeigen', 'Nutzer'),
  ('perm-users-roles-assign', 'users.roles.assign', 'Nutzerrollen zuweisen', 'Nutzer'),
  ('perm-rules-view', 'rules.view', 'Regelverwaltung anzeigen', 'Regelwerk'),
  ('perm-rules-create', 'rules.create', 'Regeln erstellen', 'Regelwerk'),
  ('perm-rules-edit', 'rules.edit', 'Regeln bearbeiten', 'Regelwerk'),
  ('perm-rules-delete', 'rules.delete', 'Regeln löschen', 'Regelwerk'),
  ('perm-rules-publish', 'rules.publish', 'Regeln veröffentlichen', 'Regelwerk'),
  ('perm-news-view', 'news.view', 'Newsverwaltung anzeigen', 'News'),
  ('perm-news-create', 'news.create', 'News erstellen', 'News'),
  ('perm-news-edit', 'news.edit', 'News bearbeiten', 'News'),
  ('perm-news-delete', 'news.delete', 'News löschen', 'News'),
  ('perm-news-publish', 'news.publish', 'News veröffentlichen', 'News'),
  ('perm-audit-view', 'audit.view', 'Audit-Log anzeigen', 'Kontrolle'),
  ('perm-roles-manage', 'roles.manage', 'Rollen und Rechte verwalten', 'Administration'),
  ('perm-discord-manage', 'discord.manage', 'Discord-Zuordnungen verwalten', 'Administration'),
  ('perm-tickets-manage-categories', 'tickets.manage_categories', 'Ticketkategorien verwalten', 'Administration'),
  ('perm-site-manage', 'site.manage', 'Website-Inhalte verwalten', 'Administration'),
  ('perm-integrations-view', 'integrations.view', 'Integrationen anzeigen', 'Administration');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-owner', "id" FROM "Permission";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-admin', "id" FROM "Permission"
WHERE "key" <> 'roles.manage';

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-moderator', "id" FROM "Permission"
WHERE "key" IN ('staff.access', 'tickets.view', 'tickets.reply', 'tickets.assign', 'tickets.status', 'users.view', 'rules.view', 'news.view', 'audit.view');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-supporter', "id" FROM "Permission"
WHERE "key" IN ('staff.access', 'tickets.view', 'tickets.reply', 'tickets.assign', 'tickets.status', 'users.view');

INSERT INTO "UserRoleAssignment" ("id", "userId", "roleId", "source", "sourceKey", "updatedAt")
SELECT 'ura-player-' || md5("id"), "id", 'role-player', 'SYSTEM', 'default-player', CURRENT_TIMESTAMP FROM "User";

INSERT INTO "UserRoleAssignment" ("id", "userId", "roleId", "source", "sourceKey", "updatedAt")
SELECT 'ura-legacy-' || md5("id" || "role"::text), "id",
  CASE "role"::text
    WHEN 'SUPPORTER' THEN 'role-supporter'
    WHEN 'MODERATOR' THEN 'role-moderator'
    WHEN 'ADMIN' THEN 'role-admin'
    WHEN 'OWNER' THEN 'role-owner'
    ELSE 'role-player'
  END,
  'SYSTEM', 'legacy-role', CURRENT_TIMESTAMP
FROM "User"
WHERE "role"::text <> 'PLAYER';

INSERT INTO "TicketCategory" ("id", "key", "label", "description", "sortOrder", "updatedAt") VALUES
  ('ticket-category-technical', 'TECHNICAL', 'Technischer Support', 'Technische Probleme mit Website, Discord oder Serverzugang', 10, CURRENT_TIMESTAMP),
  ('ticket-category-contact', 'CONTACT', 'Kontaktaufnahme', 'Allgemeine Kontaktaufnahme mit dem DRP-Team', 20, CURRENT_TIMESTAMP);

INSERT INTO "RoleTicketCategoryAccess" ("id", "roleId", "categoryId", "canView", "canReply", "canAssign", "canStatus")
SELECT 'rtca-' || substr(md5(r."id" || c."id"), 1, 24), r."id", c."id", true, true, true, true
FROM "AccessRole" r CROSS JOIN "TicketCategory" c
WHERE r."key" IN ('SUPPORTER', 'MODERATOR', 'ADMIN', 'OWNER');

ALTER TABLE "Ticket" ADD COLUMN "categoryId" TEXT;
UPDATE "Ticket"
SET "categoryId" = CASE WHEN upper("category") = 'TECHNICAL'
  THEN 'ticket-category-technical'
  ELSE 'ticket-category-contact'
END;
ALTER TABLE "Ticket" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" DROP COLUMN "category";
CREATE INDEX "Ticket_categoryId_status_updatedAt_idx" ON "Ticket"("categoryId", "status", "updatedAt");

DELETE FROM "RuleAcceptance";
DELETE FROM "Rule";
ALTER TABLE "Rule"
  DROP COLUMN "content",
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ALTER COLUMN "version" SET DEFAULT 0,
  ALTER COLUMN "published" SET DEFAULT false;
CREATE UNIQUE INDEX "Rule_sourceKey_key" ON "Rule"("sourceKey");

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "secureUrl" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "kind" "MediaKind" NOT NULL,
  "mimeType" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "duration" DOUBLE PRECISION,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RuleRevision" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "content" JSONB NOT NULL,
  "searchText" TEXT NOT NULL,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "RuleRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RuleRevision_ruleId_status_publishedAt_idx" ON "RuleRevision"("ruleId", "status", "publishedAt");
ALTER TABLE "RuleRevision" ADD CONSTRAINT "RuleRevision_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleRevision" ADD CONSTRAINT "RuleRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RuleRevisionMedia" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  CONSTRAINT "RuleRevisionMedia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RuleRevisionMedia_revisionId_mediaId_key" ON "RuleRevisionMedia"("revisionId", "mediaId");
ALTER TABLE "RuleRevisionMedia" ADD CONSTRAINT "RuleRevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "RuleRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleRevisionMedia" ADD CONSTRAINT "RuleRevisionMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsPost"
  ADD COLUMN "editedAt" TIMESTAMP(3),
  ADD COLUMN "thumbnailId" TEXT;

CREATE TABLE "NewsRevision" (
  "id" TEXT NOT NULL,
  "newsPostId" TEXT NOT NULL,
  "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "content" JSONB NOT NULL,
  "searchText" TEXT NOT NULL,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "NewsRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NewsRevision_newsPostId_status_publishedAt_idx" ON "NewsRevision"("newsPostId", "status", "publishedAt");
ALTER TABLE "NewsRevision" ADD CONSTRAINT "NewsRevision_newsPostId_fkey" FOREIGN KEY ("newsPostId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsRevision" ADD CONSTRAINT "NewsRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "NewsRevision" ("id", "newsPostId", "status", "content", "searchText", "editorId", "createdAt", "updatedAt", "publishedAt")
SELECT 'news-revision-' || md5("id"), "id",
  CASE WHEN "published" THEN 'PUBLISHED'::"RevisionStatus" ELSE 'DRAFT'::"RevisionStatus" END,
  jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', "content"))))),
  "content", "authorId", "createdAt", "updatedAt", "publishedAt"
FROM "NewsPost";

ALTER TABLE "NewsPost" DROP COLUMN "content";
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "NewsRevisionMedia" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  CONSTRAINT "NewsRevisionMedia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsRevisionMedia_revisionId_mediaId_key" ON "NewsRevisionMedia"("revisionId", "mediaId");
ALTER TABLE "NewsRevisionMedia" ADD CONSTRAINT "NewsRevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "NewsRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsRevisionMedia" ADD CONSTRAINT "NewsRevisionMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BotEvent" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "BotEvent_externalId_key" ON "BotEvent"("externalId");

CREATE TABLE "BotSyncReceipt" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BotSyncReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BotSyncReceipt_externalId_key" ON "BotSyncReceipt"("externalId");

CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

DROP TABLE "Application";
DROP TABLE "Sanction";
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "ApplicationStatus";
DROP TYPE "SanctionType";
DROP TYPE "SanctionStatus";
DROP TYPE "Role";