import { getConnectionString } from "@netlify/database";
import { PrismaClient } from "@prisma/client";
import { hostedPreviewEnabled } from "./preview-mode";
import { assertPreviewDatabase } from "@/prisma/preview-guard.mjs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatasourceUrl() {
  const preview = hostedPreviewEnabled();
  const configuredUrl = (preview && process.env.PREVIEW_DATABASE_URL?.trim()) || process.env.DATABASE_URL?.trim();
  if (!configuredUrl && !preview && process.env.NETLIFY_DB_URL?.trim()) {
    return getConnectionString();
  }

  if (configuredUrl && /^postgres(?:ql)?:\/\//i.test(configuredUrl)) {
    if (preview) {
      // An explicit preview target also works with provider-managed DATABASE_URL.
      // Bound each instance's connections, including when using direct Postgres.
      const url = new URL(configuredUrl);
      url.searchParams.set("connection_limit", "1");
      url.searchParams.set("pool_timeout", "15");
      return url.toString();
    }
    return configuredUrl;
  }

  if (process.env.NODE_ENV === "production") throw new Error("Eine gültige PostgreSQL-DATABASE_URL ist erforderlich.");
  // Development only. Hosting must fail closed instead of using an implicit DB.
  return "postgresql://postgres:postgres@127.0.0.1:5432/drp";
}

function createClient() {
  const base = new PrismaClient({
    datasourceUrl: getDatasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  let verified: Promise<void> | null = null;
  // Every query is guarded, including guest writes, raw SQL and transactions.
  // Verification is immutable for this client/DB instance; it is not a rate limit.
  return base.$extends({ query: { async $allOperations({ args, query }) {
    if (hostedPreviewEnabled()) {
      verified ??= assertPreviewDatabase(base, process.env.DRP_PREVIEW_DATABASE_ID).catch(error => { verified = null; throw error; });
      await verified;
    }
    return query(args);
  } } }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
