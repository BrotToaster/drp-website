-- DRP portal v5: documents, calendar, Melonly reviews and Railway jobs.
-- This migration is forward-only and preserves all existing portal data.

ALTER TYPE "MediaKind" ADD VALUE IF NOT EXISTS 'DOCUMENT';

DO $$ BEGIN
  CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "CalendarEventStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "RecurrenceFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "WeeklyRecommendation" AS ENUM ('UPRANK', 'LOA', 'STRIKE', 'BLOCKED', 'REMOVAL', 'NO_ACTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ReviewDecision" AS ENUM ('PENDING', 'APPLIED', 'REJECTED', 'CORRECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "TeamStrikeStatus" AS ENUM ('ACTIVE', 'WAIVED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DiscordRoleJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DiscordRoleOperation" AS ENUM ('ADD', 'REMOVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ScheduledJobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "MediaAsset"
  ADD COLUMN IF NOT EXISTS "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "deliveryType" TEXT NOT NULL DEFAULT 'upload';

CREATE TABLE IF NOT EXISTS "InternalDocumentCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalDocumentCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InternalDocumentCategory_slug_key" ON "InternalDocumentCategory"("slug");
CREATE INDEX IF NOT EXISTS "InternalDocumentCategory_visible_sortOrder_idx" ON "InternalDocumentCategory"("visible", "sortOrder");

CREATE TABLE IF NOT EXISTS "RoleDocumentCategoryAccess" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT false,
  "canCreate" BOOLEAN NOT NULL DEFAULT false,
  "canEdit" BOOLEAN NOT NULL DEFAULT false,
  "canManage" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "RoleDocumentCategoryAccess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoleDocumentCategoryAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RoleDocumentCategoryAccess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InternalDocumentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RoleDocumentCategoryAccess_roleId_categoryId_key" ON "RoleDocumentCategoryAccess"("roleId", "categoryId");
CREATE INDEX IF NOT EXISTS "RoleDocumentCategoryAccess_categoryId_idx" ON "RoleDocumentCategoryAccess"("categoryId");

CREATE TABLE IF NOT EXISTS "InternalDocument" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "creatorId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalDocument_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InternalDocumentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InternalDocument_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InternalDocument_slug_key" ON "InternalDocument"("slug");
CREATE INDEX IF NOT EXISTS "InternalDocument_categoryId_archivedAt_updatedAt_idx" ON "InternalDocument"("categoryId", "archivedAt", "updatedAt");

CREATE TABLE IF NOT EXISTS "InternalDocumentRevision" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "searchText" TEXT NOT NULL,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalDocumentRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalDocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InternalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InternalDocumentRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InternalDocumentRevision_documentId_version_key" ON "InternalDocumentRevision"("documentId", "version");
CREATE INDEX IF NOT EXISTS "InternalDocumentRevision_documentId_createdAt_idx" ON "InternalDocumentRevision"("documentId", "createdAt");

CREATE TABLE IF NOT EXISTS "InternalDocumentRevisionMedia" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  CONSTRAINT "InternalDocumentRevisionMedia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalDocumentRevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "InternalDocumentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InternalDocumentRevisionMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InternalDocumentRevisionMedia_revisionId_mediaId_key" ON "InternalDocumentRevisionMedia"("revisionId", "mediaId");

CREATE TABLE IF NOT EXISTS "CalendarCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#d6aa4c',
  "imageId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarCategory_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarCategory_slug_key" ON "CalendarCategory"("slug");
CREATE INDEX IF NOT EXISTS "CalendarCategory_visible_sortOrder_idx" ON "CalendarCategory"("visible", "sortOrder");

CREATE TABLE IF NOT EXISTS "RoleCalendarCategoryAccess" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "canCreate" BOOLEAN NOT NULL DEFAULT false,
  "canPublish" BOOLEAN NOT NULL DEFAULT false,
  "canEditOwn" BOOLEAN NOT NULL DEFAULT false,
  "canManage" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "RoleCalendarCategoryAccess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoleCalendarCategoryAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RoleCalendarCategoryAccess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CalendarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RoleCalendarCategoryAccess_roleId_categoryId_key" ON "RoleCalendarCategoryAccess"("roleId", "categoryId");
CREATE INDEX IF NOT EXISTS "RoleCalendarCategoryAccess_categoryId_idx" ON "RoleCalendarCategoryAccess"("categoryId");

CREATE TABLE IF NOT EXISTS "CalendarEvent" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "creatorId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CalendarCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CalendarEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarEvent_slug_key" ON "CalendarEvent"("slug");
CREATE INDEX IF NOT EXISTS "CalendarEvent_categoryId_archivedAt_updatedAt_idx" ON "CalendarEvent"("categoryId", "archivedAt", "updatedAt");

CREATE TABLE IF NOT EXISTS "CalendarEventRevision" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" "CalendarEventStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "content" JSONB NOT NULL,
  "searchText" TEXT NOT NULL,
  "location" TEXT,
  "externalUrl" TEXT,
  "coverImageId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "timeZone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
  "recurrenceFrequency" "RecurrenceFrequency" NOT NULL DEFAULT 'NONE',
  "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
  "recurrenceUntil" TIMESTAMP(3),
  "editorId" TEXT,
  "reviewerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "CalendarEventRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarEventRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CalendarEventRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CalendarEventRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CalendarEventRevision_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CalendarEventRevision_eventId_status_publishedAt_idx" ON "CalendarEventRevision"("eventId", "status", "publishedAt");
CREATE INDEX IF NOT EXISTS "CalendarEventRevision_status_startsAt_endsAt_idx" ON "CalendarEventRevision"("status", "startsAt", "endsAt");

CREATE TABLE IF NOT EXISTS "CalendarEventRevisionMedia" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  CONSTRAINT "CalendarEventRevisionMedia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarEventRevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "CalendarEventRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CalendarEventRevisionMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarEventRevisionMedia_revisionId_mediaId_key" ON "CalendarEventRevisionMedia"("revisionId", "mediaId");

CREATE TABLE IF NOT EXISTS "MelonlyRole" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "weeklyTargetMinutes" INTEGER NOT NULL DEFAULT 0,
  "nextRoleId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MelonlyRole_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MelonlyRole_nextRoleId_fkey" FOREIGN KEY ("nextRoleId") REFERENCES "MelonlyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MelonlyRole_externalId_key" ON "MelonlyRole"("externalId");
CREATE INDEX IF NOT EXISTS "MelonlyRole_active_position_idx" ON "MelonlyRole"("active", "position");

CREATE TABLE IF NOT EXISTS "MelonlyMember" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "userId" TEXT,
  "discordId" TEXT,
  "robloxUserId" TEXT,
  "displayName" TEXT NOT NULL,
  "roleId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MelonlyMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MelonlyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MelonlyMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "MelonlyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MelonlyMember_externalId_key" ON "MelonlyMember"("externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "MelonlyMember_userId_key" ON "MelonlyMember"("userId");
CREATE INDEX IF NOT EXISTS "MelonlyMember_discordId_idx" ON "MelonlyMember"("discordId");
CREATE INDEX IF NOT EXISTS "MelonlyMember_robloxUserId_idx" ON "MelonlyMember"("robloxUserId");
CREATE INDEX IF NOT EXISTS "MelonlyMember_active_roleId_idx" ON "MelonlyMember"("active", "roleId");

CREATE TABLE IF NOT EXISTS "MelonlyShift" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MelonlyShift_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MelonlyShift_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MelonlyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MelonlyShift_externalId_key" ON "MelonlyShift"("externalId");
CREATE INDEX IF NOT EXISTS "MelonlyShift_memberId_startsAt_idx" ON "MelonlyShift"("memberId", "startsAt");

CREATE TABLE IF NOT EXISTS "MelonlyLeave" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE NOT NULL,
  "status" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MelonlyLeave_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MelonlyLeave_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MelonlyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MelonlyLeave_externalId_key" ON "MelonlyLeave"("externalId");
CREATE INDEX IF NOT EXISTS "MelonlyLeave_memberId_startsOn_endsOn_idx" ON "MelonlyLeave"("memberId", "startsOn", "endsOn");
CREATE INDEX IF NOT EXISTS "MelonlyLeave_approved_startsOn_endsOn_idx" ON "MelonlyLeave"("approved", "startsOn", "endsOn");

CREATE TABLE IF NOT EXISTS "TeamWeeklyReview" (
  "id" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "weekEnd" DATE NOT NULL,
  "reportText" TEXT,
  "sourceSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamWeeklyReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamWeeklyReview_weekStart_weekEnd_key" ON "TeamWeeklyReview"("weekStart", "weekEnd");
CREATE INDEX IF NOT EXISTS "TeamWeeklyReview_weekStart_idx" ON "TeamWeeklyReview"("weekStart");

CREATE TABLE IF NOT EXISTS "TeamWeeklyResult" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "requiredMinutes" INTEGER NOT NULL DEFAULT 0,
  "actualMinutes" INTEGER NOT NULL DEFAULT 0,
  "loaDays" INTEGER NOT NULL DEFAULT 0,
  "activeStrikesBefore" INTEGER NOT NULL DEFAULT 0,
  "recommendation" "WeeklyRecommendation" NOT NULL,
  "decision" "ReviewDecision" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamWeeklyResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamWeeklyResult_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "TeamWeeklyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamWeeklyResult_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MelonlyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamWeeklyResult_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamWeeklyResult_reviewId_memberId_key" ON "TeamWeeklyResult"("reviewId", "memberId");
CREATE INDEX IF NOT EXISTS "TeamWeeklyResult_memberId_createdAt_idx" ON "TeamWeeklyResult"("memberId", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamWeeklyResult_decision_recommendation_idx" ON "TeamWeeklyResult"("decision", "recommendation");

CREATE TABLE IF NOT EXISTS "TeamStrike" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "resultId" TEXT,
  "reason" TEXT NOT NULL,
  "status" "TeamStrikeStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "issuerId" TEXT,
  "waivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamStrike_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamStrike_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MelonlyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamStrike_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TeamWeeklyResult"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TeamStrike_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamStrike_resultId_key" ON "TeamStrike"("resultId");
CREATE INDEX IF NOT EXISTS "TeamStrike_memberId_status_expiresAt_idx" ON "TeamStrike"("memberId", "status", "expiresAt");

CREATE TABLE IF NOT EXISTS "TeamRankBlock" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "sourceStrikeId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "liftedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamRankBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamRankBlock_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MelonlyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamRankBlock_sourceStrikeId_fkey" FOREIGN KEY ("sourceStrikeId") REFERENCES "TeamStrike"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamRankBlock_sourceStrikeId_key" ON "TeamRankBlock"("sourceStrikeId");
CREATE INDEX IF NOT EXISTS "TeamRankBlock_memberId_endsAt_liftedAt_idx" ON "TeamRankBlock"("memberId", "endsAt", "liftedAt");

CREATE TABLE IF NOT EXISTS "DiscordTeamRoleMapping" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "discordRoleId" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscordTeamRoleMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscordTeamRoleMapping_discordRoleId_fkey" FOREIGN KEY ("discordRoleId") REFERENCES "DiscordRole"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DiscordTeamRoleMapping_key_key" ON "DiscordTeamRoleMapping"("key");

CREATE TABLE IF NOT EXISTS "DiscordRoleJob" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "memberId" TEXT,
  "discordId" TEXT NOT NULL,
  "discordRoleId" TEXT NOT NULL,
  "operation" "DiscordRoleOperation" NOT NULL,
  "status" "DiscordRoleJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscordRoleJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscordRoleJob_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MelonlyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DiscordRoleJob_discordRoleId_fkey" FOREIGN KEY ("discordRoleId") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DiscordRoleJob_dedupeKey_key" ON "DiscordRoleJob"("dedupeKey");
CREATE INDEX IF NOT EXISTS "DiscordRoleJob_status_availableAt_idx" ON "DiscordRoleJob"("status", "availableAt");
CREATE INDEX IF NOT EXISTS "DiscordRoleJob_discordId_createdAt_idx" ON "DiscordRoleJob"("discordId", "createdAt");

CREATE TABLE IF NOT EXISTS "ScheduledJobRun" (
  "id" TEXT NOT NULL,
  "runKey" TEXT NOT NULL,
  "jobKey" TEXT NOT NULL,
  "status" "ScheduledJobStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "details" JSONB,
  "error" TEXT,
  CONSTRAINT "ScheduledJobRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledJobRun_runKey_key" ON "ScheduledJobRun"("runKey");
CREATE INDEX IF NOT EXISTS "ScheduledJobRun_jobKey_startedAt_idx" ON "ScheduledJobRun"("jobKey", "startedAt");
CREATE INDEX IF NOT EXISTS "ScheduledJobRun_status_startedAt_idx" ON "ScheduledJobRun"("status", "startedAt");

INSERT INTO "Permission" ("id", "key", "label", "group") VALUES
  ('perm-documents-access', 'documents.access', 'Interne Dokumente öffnen', 'Wissen'),
  ('perm-documents-categories', 'documents.manage_categories', 'Dokumentkategorien und Zugriffe verwalten', 'Wissen'),
  ('perm-calendar-categories', 'calendar.manage_categories', 'Kalenderkategorien und Zugriffe verwalten', 'Kalender'),
  ('perm-team-self', 'team_activity.view_self', 'Eigene Teamaktivität anzeigen', 'Team'),
  ('perm-team-all', 'team_activity.view_all', 'Teamaktivität aller Mitglieder anzeigen', 'Team'),
  ('perm-team-review', 'team_activity.review', 'Wochenempfehlungen entscheiden', 'Team'),
  ('perm-melonly-manage', 'melonly.manage', 'Melonly-Integration verwalten', 'Team')
ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "group" = EXCLUDED."group";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "AccessRole" r CROSS JOIN "Permission" p
WHERE r."key" IN ('SUPPORTER', 'MODERATOR', 'ADMIN', 'OWNER')
  AND p."key" IN ('documents.access', 'team_activity.view_self')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "AccessRole" r CROSS JOIN "Permission" p
WHERE r."key" IN ('ADMIN', 'OWNER')
  AND p."key" IN ('documents.manage_categories', 'calendar.manage_categories', 'team_activity.view_all', 'team_activity.review', 'melonly.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "InternalDocumentCategory" ("id", "slug", "title", "description", "sortOrder", "updatedAt") VALUES
  ('doc-cat-general', 'allgemein', 'Allgemein', 'Interne Informationen und Arbeitsunterlagen für das DRP-Team.', 10, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "CalendarCategory" ("id", "slug", "title", "description", "color", "sortOrder", "updatedAt") VALUES
  ('calendar-cat-community', 'community', 'Community', 'Öffentliche Community- und Servertermine.', '#d6aa4c', 10, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "RoleDocumentCategoryAccess" ("id", "roleId", "categoryId", "canView", "canCreate", "canEdit", "canManage")
SELECT 'doc-access-' || lower(r."key"), r."id", c."id", true,
  r."key" IN ('MODERATOR', 'ADMIN', 'OWNER'),
  r."key" IN ('MODERATOR', 'ADMIN', 'OWNER'),
  r."key" IN ('ADMIN', 'OWNER')
FROM "AccessRole" r CROSS JOIN "InternalDocumentCategory" c
WHERE r."key" IN ('SUPPORTER', 'MODERATOR', 'ADMIN', 'OWNER') AND c."slug" = 'allgemein'
ON CONFLICT ("roleId", "categoryId") DO NOTHING;

INSERT INTO "RoleCalendarCategoryAccess" ("id", "roleId", "categoryId", "canCreate", "canPublish", "canEditOwn", "canManage")
SELECT 'calendar-access-' || lower(r."key"), r."id", c."id", true,
  r."key" IN ('MODERATOR', 'ADMIN', 'OWNER'), true,
  r."key" IN ('MODERATOR', 'ADMIN', 'OWNER')
FROM "AccessRole" r CROSS JOIN "CalendarCategory" c
WHERE r."key" IN ('SUPPORTER', 'MODERATOR', 'ADMIN', 'OWNER') AND c."slug" = 'community'
ON CONFLICT ("roleId", "categoryId") DO NOTHING;

INSERT INTO "DiscordTeamRoleMapping" ("id", "key", "enabled", "updatedAt") VALUES
  ('team-role-strike-1', 'STRIKE_1', true, CURRENT_TIMESTAMP),
  ('team-role-strike-2', 'STRIKE_2', true, CURRENT_TIMESTAMP),
  ('team-role-strike-3', 'STRIKE_3', true, CURRENT_TIMESTAMP),
  ('team-role-uprank-block', 'UPRANK_BLOCK', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
