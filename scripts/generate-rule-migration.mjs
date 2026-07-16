import { readFile, writeFile } from "node:fs/promises";

const fixturePath = process.argv[2] || "data/rules.fixture.json";
const outputPath =
  process.argv[3] ||
  "netlify/database/migrations/20260717120100_rule_fixture.sql";
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
  "-- Exact rule fixture imported from the public Deutschland Roleplay Google Site.",
  `-- SHA-256: ${fixture.checksum}`,
  'DELETE FROM "RuleAcceptance";',
  'DELETE FROM "Rule";',
  "",
];

for (const rule of fixture.rules) {
  const slug = rule.sourceKey;
  const ruleId = `rule-${rule.sourceKey}`;
  const revisionId = `revision-${rule.sourceKey}-v1`;
  const searchText = `${rule.title} ${text(rule.content)}`.trim();
  lines.push(
    'INSERT INTO "Rule" ("id", "slug", "sourceKey", "sourceUrl", "category", "title", "order", "version", "published", "createdAt", "updatedAt") VALUES',
    `  (${sql(ruleId)}, ${sql(slug)}, ${sql(rule.sourceKey)}, ${sql(rule.sourceUrl)}, ${sql(rule.category)}, ${sql(rule.title)}, ${Number(rule.order)}, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
    'INSERT INTO "RuleRevision" ("id", "ruleId", "status", "content", "searchText", "createdAt", "updatedAt", "publishedAt") VALUES',
    `  (${sql(revisionId)}, ${sql(ruleId)}, 'PUBLISHED', ${sql(JSON.stringify(rule.content))}::jsonb, ${sql(searchText)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
    "",
  );
}

await writeFile(outputPath, lines.join("\n"), "utf8");
console.log(`Generated ${outputPath} with ${fixture.rules.length} rules`);