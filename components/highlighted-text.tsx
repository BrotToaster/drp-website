import { ruleMatchRanges } from "@/lib/rule-search";

export function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = [];
  let from = 0;
  for (const range of ruleMatchRanges(text, query)) {
    parts.push(text.slice(from, range.start), <mark key={range.start}>{text.slice(range.start, range.end)}</mark>);
    from = range.end;
  }
  return <>{parts}{text.slice(from)}</>;
}
