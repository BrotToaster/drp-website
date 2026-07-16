import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import * as cheerio from "cheerio";

const sources = [
  {
    category: "Roleplay-Regelwerk",
    prefix: "main",
    path: process.argv[2] || "C:/tmp/drp-rules-main.html",
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/regelwerk",
  },
  {
    category: "Fraktionsregelwerk",
    prefix: "faction",
    path: process.argv[3] || "C:/tmp/drp-rules-faction.html",
    sourceUrl:
      "https://sites.google.com/view/deutschland-rp-regelwerk/regelwerk/fraktionsregelwerk",
  },
];

const outputPath = process.argv[4] || "data/rules.fixture.json";

function clean(value) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function textNode(text, marks) {
  return {
    type: "text",
    text,
    ...(marks?.length ? { marks } : {}),
  };
}

function inlineContent($, element) {
  const content = [];
  $(element)
    .contents()
    .each((_, node) => {
      if (node.type === "text") {
        const text = clean($(node).text());
        if (text) content.push(textNode(text));
        return;
      }
      if (node.type !== "tag") return;
      const text = clean($(node).text());
      if (!text) return;
      const tag = node.tagName?.toLowerCase();
      if (tag === "a") {
        content.push(
          textNode(text, [
            {
              type: "link",
              attrs: {
                href: $(node).attr("href") || "",
                target: "_blank",
                rel: "noopener noreferrer nofollow",
                class: null,
              },
            },
          ]),
        );
      } else if (tag === "strong" || tag === "b") {
        content.push(textNode(text, [{ type: "bold" }]));
      } else if (tag === "em" || tag === "i") {
        content.push(textNode(text, [{ type: "italic" }]));
      } else {
        content.push(textNode(text));
      }
    });

  if (!content.length) {
    const text = clean($(element).text());
    if (text) content.push(textNode(text));
  }
  return content;
}

function tiptapNode($, element) {
  const tag = element.tagName?.toLowerCase();
  const content = inlineContent($, element);
  if (!content.length) return null;
  if (/^h[1-6]$/.test(tag || "")) {
    return {
      type: "heading",
      attrs: { level: Math.min(Number(tag.slice(1)), 3) },
      content,
    };
  }
  return { type: "paragraph", content };
}

function extractRules(html, source) {
  const $ = cheerio.load(html);
  const startHeading = source.prefix === "main" ? "Roleplay Regelwerk" : "Fraktionsregelwerk";
  const candidates = $("h1,h2,h3,h4,p,li")
    .toArray()
    .filter((element) => {
      if ($(element).parents("li").length && element.tagName?.toLowerCase() !== "li") {
        return false;
      }
      return clean($(element).text()).length > 0;
    });

  const startIndex = candidates.findIndex((element) =>
    clean($(element).text()).includes(startHeading),
  );
  const scoped = candidates.slice(Math.max(0, startIndex + 1));
  const rules = [];
  let current = null;

  for (const element of scoped) {
    const text = clean($(element).text());
    if (!text || text === "Seite aktualisiert") continue;
    const majorMatch = text.match(/^§\s*(\d+)(?:[.\s]|$)/);
    if (majorMatch) {
      const major = Number(majorMatch[1]);
      if (!current || current.major !== major) {
        current = {
          major,
          sourceKey: `${source.prefix}-${major}`,
          sourceUrl: source.sourceUrl,
          category: source.category,
          title: text,
          order: rules.length + 1,
          content: { type: "doc", content: [] },
        };
        rules.push(current);
        continue;
      }
    }
    if (!current) continue;
    const node = tiptapNode($, element);
    if (node) current.content.content.push(node);
  }

  return rules.filter((rule) => rule.content.content.length || rule.title);
}

const rules = [];
for (const source of sources) {
  const html = await readFile(source.path, "utf8");
  rules.push(...extractRules(html, source));
}

const payload = {
  source: "Deutschland Roleplay Google Sites",
  importedAt: "2026-07-17",
  rules,
};
const canonicalRules = JSON.stringify(rules);
payload.checksum = createHash("sha256").update(canonicalRules).digest("hex");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Imported ${rules.length} rules to ${outputPath}`);
console.log(`Checksum: ${payload.checksum}`);
