import { readFile, writeFile } from "node:fs/promises";

const fixturePath = process.argv[2] || "data/rules.fixture.json";
const outputPath =
  process.argv[3] ||
  "netlify/database/migrations/20260819120100_rule_fixture_v7.sql";
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));

function sql(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function text(node) {
  if (!node || typeof node !== "object") return "";
  const own = typeof node.text === "string" ? node.text : "";
  const children = Array.isArray(node.content) ? node.content.map(text).join(" ") : "";
  return [own, children].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

const lines = [
  "-- Additive rule update imported from the public Deutschland Roleplay Google Site.",
  `-- SHA-256: ${fixture.checksum}`,
  "",
];

for (const rule of fixture.rules) {
  const slug = rule.sourceKey;
  const searchText = `${rule.title} ${text(rule.content)}`.trim();
  lines.push(
    'DO $$ DECLARE current_rule "Rule"%ROWTYPE; current_content JSONB; next_version INTEGER; changed BOOLEAN := false; BEGIN',
    `  SELECT * INTO current_rule FROM "Rule" WHERE "sourceKey" = ${sql(rule.sourceKey)};`,
    '  IF NOT FOUND THEN',
    '    next_version := 1;',
    '    changed := true;',
    '    INSERT INTO "Rule" ("id", "slug", "sourceKey", "sourceUrl", "category", "title", "order", "version", "published", "createdAt", "updatedAt") VALUES',
    `      (${sql(`rule-${rule.sourceKey}`)}, ${sql(slug)}, ${sql(rule.sourceKey)}, ${sql(rule.sourceUrl)}, ${sql(rule.category)}, ${sql(rule.title)}, ${Number(rule.order)}, next_version, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING * INTO current_rule;`,
    '  ELSE',
    '    SELECT "content" INTO current_content FROM "RuleRevision" WHERE "ruleId" = current_rule."id" AND "status" = \'PUBLISHED\' ORDER BY "publishedAt" DESC NULLS LAST, "createdAt" DESC LIMIT 1;',
    `    IF current_content IS DISTINCT FROM ${sql(JSON.stringify(rule.content))}::jsonb OR current_rule."title" IS DISTINCT FROM ${sql(rule.title)} OR current_rule."category" IS DISTINCT FROM ${sql(rule.category)} THEN`,
    '      next_version := current_rule."version" + 1;',
    '      changed := true;',
    '      UPDATE "RuleRevision" SET "status" = \'SUPERSEDED\', "updatedAt" = CURRENT_TIMESTAMP WHERE "ruleId" = current_rule."id" AND "status" = \'PUBLISHED\';',
    '    ELSE',
    '      next_version := current_rule."version";',
    '    END IF;',
    `    UPDATE "Rule" SET "sourceUrl" = ${sql(rule.sourceUrl)}, "category" = ${sql(rule.category)}, "title" = ${sql(rule.title)}, "order" = ${Number(rule.order)}, "version" = next_version, "published" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = current_rule."id" RETURNING * INTO current_rule;`,
    '  END IF;',
    '  IF changed OR NOT EXISTS (SELECT 1 FROM "RuleRevision" WHERE "ruleId" = current_rule."id") THEN',
    '    INSERT INTO "RuleRevision" ("id", "ruleId", "status", "content", "searchText", "createdAt", "updatedAt", "publishedAt") VALUES',
    `      (${sql(`revision-${rule.sourceKey}-v`)} || next_version, current_rule."id", 'PUBLISHED', ${sql(JSON.stringify(rule.content))}::jsonb, ${sql(searchText)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;`,
    '  END IF;',
    'END $$;',
    "",
  );
}

const sourceKeys = fixture.rules.map((rule) => sql(rule.sourceKey)).join(", ");
lines.push(
  `UPDATE "Rule" SET "published" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "sourceKey" IS NOT NULL AND "sourceKey" NOT IN (${sourceKeys});`,
  "",
);

await writeFile(outputPath, lines.join("\n"), "utf8");
console.log(`Generated ${outputPath} with ${fixture.rules.length} rules`);
