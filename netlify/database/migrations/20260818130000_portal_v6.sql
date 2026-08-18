-- DRP portal v6: Discord rank history and structured Weekly Insider drafts.
-- Additive migration: existing reviews and legacy reportText values are preserved.

ALTER TABLE "TeamWeeklyReview"
  ADD COLUMN IF NOT EXISTS "mentionMode" TEXT NOT NULL DEFAULT 'CODE',
  ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mostActiveMemberId" TEXT,
  ADD COLUMN IF NOT EXISTS "mostActiveDiscordId" TEXT,
  ADD COLUMN IF NOT EXISTS "mostActiveDisplayName" TEXT;

CREATE TABLE IF NOT EXISTS "DiscordTeamRank" (
  "id" TEXT NOT NULL,
  "discordRoleId" TEXT NOT NULL,
  "section" TEXT NOT NULL DEFAULT 'MODERATION',
  "shortName" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "weeklyTargetMinutes" INTEGER NOT NULL DEFAULT 0,
  "nextDiscordRoleId" TEXT,
  "outputLabel" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscordTeamRank_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscordTeamRank_discordRoleId_fkey" FOREIGN KEY ("discordRoleId") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DiscordTeamRank_nextDiscordRoleId_fkey" FOREIGN KEY ("nextDiscordRoleId") REFERENCES "DiscordRole"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DiscordTeamRank_discordRoleId_key" ON "DiscordTeamRank"("discordRoleId");
CREATE INDEX IF NOT EXISTS "DiscordTeamRank_active_section_sortOrder_idx" ON "DiscordTeamRank"("active", "section", "sortOrder");

CREATE TABLE IF NOT EXISTS "DiscordRankHistory" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "discordId" TEXT NOT NULL,
  "fromRoleId" TEXT,
  "toRoleId" TEXT,
  "fromLabel" TEXT,
  "toLabel" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscordRankHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscordRankHistory_fromRoleId_fkey" FOREIGN KEY ("fromRoleId") REFERENCES "DiscordRole"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DiscordRankHistory_toRoleId_fkey" FOREIGN KEY ("toRoleId") REFERENCES "DiscordRole"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DiscordRankHistory_guildId_discordId_changedAt_idx" ON "DiscordRankHistory"("guildId", "discordId", "changedAt");
CREATE INDEX IF NOT EXISTS "DiscordRankHistory_toRoleId_changedAt_idx" ON "DiscordRankHistory"("toRoleId", "changedAt");

CREATE TABLE IF NOT EXISTS "TeamWeeklyEntry" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "memberId" TEXT,
  "kind" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "discordId" TEXT,
  "displayName" TEXT NOT NULL,
  "fromLabel" TEXT,
  "toLabel" TEXT,
  "text" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "automatic" BOOLEAN NOT NULL DEFAULT true,
  "included" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamWeeklyEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamWeeklyEntry_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "TeamWeeklyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamWeeklyEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MelonlyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TeamWeeklyEntry_reviewId_section_sortOrder_idx" ON "TeamWeeklyEntry"("reviewId", "section", "sortOrder");

CREATE TABLE IF NOT EXISTS "TeamWeeklySignature" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "discordId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamWeeklySignature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamWeeklySignature_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "TeamWeeklyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TeamWeeklySignature_reviewId_sortOrder_idx" ON "TeamWeeklySignature"("reviewId", "sortOrder");

INSERT INTO "Permission" ("id", "key", "label", "group") VALUES
  ('perm-team-configure', 'team_activity.configure', 'Discord-Ränge und Weekly Insider konfigurieren', 'Team')
ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "group" = EXCLUDED."group";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "AccessRole" r CROSS JOIN "Permission" p
WHERE r."key" IN ('ADMIN', 'OWNER') AND p."key" = 'team_activity.configure'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
