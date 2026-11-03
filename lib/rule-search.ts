import type { RuleView } from "@/lib/demo-data";
import { plainTextFromContent } from "@/lib/content-text";

const categoryOrder = ["Grundregeln", "Roleplay-Regelwerk", "Roleplay", "Einsatzregeln", "Kommunikation", "Discord-Regelwerk", "Event-Regelwerk", "Fraktionsregelwerk", "Hauptfraktionen", "Legale Fraktionen", "Illegale Fraktionen", "Support"];
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("de").replace(/ß/g, "ss");
export const normalizeRuleSearch = (text: string) => fold(text).replace(/§\s+/g, "§");
const termsOf = (query: string) => normalizeRuleSearch(query).trim().split(/\s+/).filter(Boolean);

export function indexRules(rules: readonly RuleView[]) {
  return rules.map(rule => {
    const text = plainTextFromContent(rule.content);
    return { rule, text, haystack: normalizeRuleSearch(`${rule.title} ${rule.category} ${rule.searchText} ${text}`) };
  });
}

export function searchRules(index: ReturnType<typeof indexRules>, query: string, category = "Alle") {
  const terms = termsOf(query);
  return index.filter(item => (category === "Alle" || item.rule.category === category) && terms.every(term => item.haystack.includes(term)));
}

export function groupRules<T extends { rule: Pick<RuleView, "category"> }>(items: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.rule.category, [...(groups.get(item.rule.category) || []), item]);
  return [...groups].sort(([a], [b]) => {
    const rank = (name: string) => categoryOrder.includes(name) ? categoryOrder.indexOf(name) : categoryOrder.length;
    return rank(a) - rank(b) || a.localeCompare(b, "de");
  }).map(([name, entries]) => ({ name, entries }));
}

export function ruleMatchRanges(text: string, query: string) {
  const starts: number[] = [], ends: number[] = [];
  let normalized = "", offset = 0;
  for (const char of text) {
    const part = /\s/.test(char) && normalized.endsWith("§") ? "" : fold(char);
    normalized += part;
    for (let i = 0; i < part.length; i++) { starts.push(offset); ends.push(offset + char.length); }
    offset += char.length;
  }
  const ranges: Array<{ start: number; end: number }> = [];
  for (const term of new Set(termsOf(query))) {
    for (let from = 0; from <= normalized.length - term.length;) {
      const at = normalized.indexOf(term, from);
      if (at < 0) break;
      ranges.push({ start: starts[at], end: ends[at + term.length - 1] });
      from = at + term.length;
    }
  }
  const merged: typeof ranges = [];
  for (const range of ranges.sort((a, b) => a.start - b.start || a.end - b.end)) {
    const previous = merged[merged.length - 1];
    if (previous && previous.end >= range.start) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

export function ruleSnippet(text: string, query: string, length = 155) {
  const first = ruleMatchRanges(text, query)[0];
  let start = Math.max(0, (first?.start || 0) - 45);
  if (start) { const boundary = text.indexOf(" ", start); if (boundary >= 0 && boundary < start + 20) start = boundary + 1; }
  const end = Math.min(text.length, start + length);
  return `${start ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}
