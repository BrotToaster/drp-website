import { getConnectionString } from "@netlify/database";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatasourceUrl() {
  if (process.env.NETLIFY_DB_URL?.trim()) {
    return getConnectionString();
  }

  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl && /^postgres(?:ql)?:\/\//i.test(configuredUrl)) {
    return configuredUrl;
  }

  // Keeps public demo fallbacks available before a local Postgres database is linked.
  return "postgresql://postgres:postgres@127.0.0.1:5432/drp";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getDatasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
