DO $$ BEGIN
  CREATE TYPE "InternalDocumentAccessMode" AS ENUM ('CATEGORY', 'RESTRICTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InternalDocumentSourceType" AS ENUM ('GOOGLE_DOCS', 'GOOGLE_SHEETS', 'UPLOAD_DOCX', 'UPLOAD_XLSX');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InternalDocumentImportStatus" AS ENUM ('NEVER', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "InternalDocument"
  ADD COLUMN IF NOT EXISTS "accessMode" "InternalDocumentAccessMode" NOT NULL DEFAULT 'CATEGORY',
  ADD COLUMN IF NOT EXISTS "sourceType" "InternalDocumentSourceType",
  ADD COLUMN IF NOT EXISTS "sourceExternalId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceChecksum" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceImportedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceImportStatus" "InternalDocumentImportStatus" NOT NULL DEFAULT 'NEVER',
  ADD COLUMN IF NOT EXISTS "sourceImportError" TEXT;

ALTER TABLE "InternalDocumentRevision"
  ADD COLUMN IF NOT EXISTS "structuredData" JSONB;

CREATE TABLE IF NOT EXISTS "InternalDocumentRoleAccess" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "InternalDocumentRoleAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InternalDocumentRoleAccess_roleId_documentId_key"
  ON "InternalDocumentRoleAccess"("roleId", "documentId");
CREATE INDEX IF NOT EXISTS "InternalDocumentRoleAccess_documentId_idx"
  ON "InternalDocumentRoleAccess"("documentId");
CREATE INDEX IF NOT EXISTS "InternalDocument_accessMode_archivedAt_updatedAt_idx"
  ON "InternalDocument"("accessMode", "archivedAt", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "InternalDocument_sourceType_sourceExternalId_key"
  ON "InternalDocument"("sourceType", "sourceExternalId");

DO $$ BEGIN
  ALTER TABLE "InternalDocumentRoleAccess"
    ADD CONSTRAINT "InternalDocumentRoleAccess_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InternalDocumentRoleAccess"
    ADD CONSTRAINT "InternalDocumentRoleAccess_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "InternalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "SiteSetting" ("id", "key", "value", "updatedAt")
SELECT 'setting-default-access-role', 'auth.defaultAccessRole', jsonb_build_object('roleId', "id"), CURRENT_TIMESTAMP
FROM "AccessRole"
WHERE "key" = 'PLAYER'
  AND NOT EXISTS (SELECT 1 FROM "SiteSetting" WHERE "key" = 'auth.defaultAccessRole')
LIMIT 1;
