import type { JSONContent } from "@tiptap/react";

// Some imported paragraphs split the section number and sentence into adjacent
// text nodes with no space. Keep the stored document intact; add the separator
// only when rendering that exact boundary.
export function ruleReadingContent(node: JSONContent): JSONContent {
  if (!node.content) return node;
  const content = node.content.map(ruleReadingContent);
  const [first, second] = content;
  if (node.type === "paragraph" && first?.type === "text" && second?.type === "text"
    && /^§\s*\d+(?:\.\d+)*\.?$/.test(first.text || "") && second.text && !/^\s/.test(second.text)) {
    content[0] = { ...first, text: first.text + "\u00a0" };
  }
  return { ...node, content };
}
