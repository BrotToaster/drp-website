-- Portal v8: additive guest ticket access and ownership category.
CREATE TYPE "TicketAuthorKind" AS ENUM ('USER', 'GUEST', 'SYSTEM');

ALTER TABLE "Ticket" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "TicketMessage" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "TicketMessage" ADD COLUMN "authorKind" "TicketAuthorKind" NOT NULL DEFAULT 'USER';
ALTER TABLE "TicketMessage" ADD COLUMN "guestAccessId" TEXT;

CREATE TABLE "GuestTicketAccess" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "discordContact" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAccessedAt" TIMESTAMP(3),
  CONSTRAINT "GuestTicketAccess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuestTicketAccess_ticketId_key" ON "GuestTicketAccess"("ticketId");
CREATE UNIQUE INDEX "GuestTicketAccess_tokenHash_key" ON "GuestTicketAccess"("tokenHash");
ALTER TABLE "GuestTicketAccess" ADD CONSTRAINT "GuestTicketAccess_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GuestTicketRateLimit" (
  "id" TEXT NOT NULL,
  "fingerprintHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestTicketRateLimit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GuestTicketRateLimit_fingerprintHash_createdAt_idx" ON "GuestTicketRateLimit"("fingerprintHash", "createdAt");
CREATE INDEX "GuestTicketRateLimit_expiresAt_idx" ON "GuestTicketRateLimit"("expiresAt");

CREATE INDEX "TicketMessage_guestAccessId_idx" ON "TicketMessage"("guestAccessId");
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_guestAccessId_fkey" FOREIGN KEY ("guestAccessId") REFERENCES "GuestTicketAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "TicketCategory" ("id", "key", "label", "description", "enabled", "sortOrder", "createdAt", "updatedAt")
VALUES ('ticket-category-ownership', 'OWNERSHIP', 'Ownership', 'Vertrauliche Kontaktaufnahme mit Administration und Ownership', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "description" = EXCLUDED."description", "sortOrder" = EXCLUDED."sortOrder", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RoleTicketCategoryAccess" ("id", "roleId", "categoryId", "canView", "canReply", "canAssign", "canStatus", "canDelete")
SELECT 'ticket-access-' || lower(role."key") || '-ownership', role."id", category."id", true, true, true, true, true
FROM "AccessRole" role CROSS JOIN "TicketCategory" category
WHERE role."key" IN ('ADMIN', 'OWNER') AND category."key" = 'OWNERSHIP'
ON CONFLICT ("roleId", "categoryId") DO UPDATE SET "canView" = true, "canReply" = true, "canAssign" = true, "canStatus" = true, "canDelete" = true;
