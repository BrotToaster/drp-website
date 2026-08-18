import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // Netlify supplies environment variables directly during builds.
}

const configuredUrl =
  process.env.NETLIFY_DB_URL?.trim() || process.env.DATABASE_URL?.trim();

const datasourceUrl =
  configuredUrl && /^postgres(?:ql)?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : "postgresql://postgres:postgres@127.0.0.1:5432/drp";

// Prisma still reads env("DATABASE_URL") while validating the schema. Keep it
// aligned with the URL selected above so a stale SQLite value in a local .env
// cannot break generate/validate after the project moved to PostgreSQL.
process.env.DATABASE_URL = datasourceUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  engine: "classic",
  datasource: {
    url: datasourceUrl,
  },
});
