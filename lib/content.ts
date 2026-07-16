import type { JSONContent } from "@tiptap/react";
import { z } from "zod";

export const emptyContent: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const contentNodeSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    attrs: z.record(z.any()).optional(),
    marks: z
      .array(
        z
          .object({
            type: z.string(),
            attrs: z.record(z.any()).optional(),
          })
          .passthrough(),
      )
      .optional(),
    text: z.string().optional(),
    content: z.array(contentNodeSchema).optional(),
  }),
) as z.ZodType<JSONContent>;

export function parseContentJson(value: string): JSONContent | null {
  try {
    const parsed = contentNodeSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function plainTextFromContent(content: JSONContent | null | undefined): string {
  if (!content) return "";
  const own = typeof content.text === "string" ? content.text : "";
  const children = content.content?.map(plainTextFromContent).filter(Boolean) || [];
  return [own, ...children].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function paragraphContent(text: string): JSONContent {
  return {
    type: "doc",
    content: text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })),
  };
}