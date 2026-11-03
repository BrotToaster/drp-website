import type { JSONContent } from "@tiptap/react";

export function plainTextFromContent(content: JSONContent | null | undefined): string {
  if (!content) return "";
  const own = typeof content.text === "string" ? content.text : "";
  const children = content.content?.map(plainTextFromContent).filter(Boolean) || [];
  return [own, ...children].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
