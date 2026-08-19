import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import * as cheerio from "cheerio";

const sourceDirectory = process.argv[2] || "--fetch";
const sources = [
  {
    category: "Roleplay-Regelwerk",
    prefix: "main",
    path: `${sourceDirectory}/main.html`,
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/regelwerk",
    startHeading: "Roleplay Regelwerk",
  },
  {
    category: "Discord-Regelwerk",
    prefix: "discord",
    path: `${sourceDirectory}/discord.html`,
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/regelwerk/discord-regelwerk",
    startHeading: "Discord Regelwerk",
  },
  {
    category: "Event-Regelwerk",
    prefix: "event",
    path: `${sourceDirectory}/event.html`,
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/regelwerk/event-regelwerk",
    startHeading: "Event Regelwerk",
    roman: true,
  },
  {
    category: "Fraktionsregelwerk",
    prefix: "faction",
    path: `${sourceDirectory}/faction.html`,
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/fraktions-regelwerk",
    startHeading: "Fraktionsregelwerk",
  },
  {
    category: "Hauptfraktionen",
    prefix: "main-factions",
    path: `${sourceDirectory}/main-factions.html`,
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/fraktions-regelwerk/hauptfraktionen",
    startHeading: "Hauptfraktionen",
  },
  {
    category: "Legale Fraktionen",
    prefix: "legal-factions",
    path: `${sourceDirectory}/legal-factions.html`,
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/fraktions-regelwerk/legale-fraktionen",
    startHeading: "Legale Fraktionen",
  },
  {
    category: "Illegale Fraktionen",
    prefix: "illegal-factions",
    path: `${sourceDirectory}/illegal-factions.html`,
    sourceUrl: "https://sites.google.com/view/deutschland-rp-regelwerk/fraktions-regelwerk/illegale-fraktionen",
    startHeading: "Illegale Fraktionen",
  },
];

const outputPath = process.argv[3] || "data/rules.fixture.json";

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
  const visit = (parent, inheritedMarks = []) => {
    $(parent).contents().each((_, node) => {
      if (node.type === "text") {
        const text = $(node).text().replace(/\u00a0/g, " ").replace(/\s+/g, " ");
        if (text.trim()) content.push(textNode(text, inheritedMarks));
        return;
      }
      if (node.type !== "tag") return;
      const tag = node.tagName?.toLowerCase();
      if (tag === "br") {
        content.push({ type: "hardBreak" });
        return;
      }
      const marks = [...inheritedMarks];
      if (tag === "strong" || tag === "b") marks.push({ type: "bold" });
      if (tag === "em" || tag === "i") marks.push({ type: "italic" });
      if (tag === "a") marks.push({ type: "link", attrs: { href: $(node).attr("href") || "", target: "_blank", rel: "noopener noreferrer nofollow", class: null } });
      visit(node, marks.filter((mark, index, all) => all.findIndex((candidate) => candidate.type === mark.type) === index));
    });
  };
  visit(element);
  const firstText = content.find((node) => node.type === "text");
  const lastText = [...content].reverse().find((node) => node.type === "text");
  if (firstText?.text) firstText.text = firstText.text.trimStart();
  if (lastText?.text) lastText.text = lastText.text.trimEnd();
  return content.filter((node) => node.type !== "text" || Boolean(node.text));
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
  const startHeading = source.startHeading;
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
    const majorMatch = source.roman
      ? text.match(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/)
      : text.match(/^§\s*(\d+)(?:[.\s–-]|$)/);
    if (majorMatch) {
      const major = source.roman ? majorMatch[1] : Number(majorMatch[1]);
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
  const html = sourceDirectory === "--fetch"
    ? await fetch(source.sourceUrl, { headers: { "user-agent": "DRP-Rule-Importer/1.0" } }).then((response) => {
        if (!response.ok) throw new Error(`${source.sourceUrl} antwortete mit HTTP ${response.status}`);
        return response.text();
      })
    : await readFile(source.path, "utf8");
  rules.push(...extractRules(html, source));
}

const payload = {
  source: "Deutschland Roleplay Google Sites",
  importedAt: new Date().toISOString().slice(0, 10),
  rules,
};
const canonicalRules = JSON.stringify(rules);
payload.checksum = createHash("sha256").update(canonicalRules).digest("hex");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Imported ${rules.length} rules to ${outputPath}`);
console.log(`Checksum: ${payload.checksum}`);
