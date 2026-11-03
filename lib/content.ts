import type { JSONContent } from "@tiptap/react";
import { z } from "zod";

export const emptyContent: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const contentNodeSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(
        z
          .object({
            type: z.string(),
            attrs: z.record(z.string(), z.unknown()).optional(),
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
    if (value.length > 1_000_000) return null;
    const input = JSON.parse(value);
    const pending = [{ node: input, depth: 0 }];
    let count = 0;
    while (pending.length) {
      const { node, depth } = pending.pop()!;
      if (++count > 20000 || depth > 40) return null;
      if (node && Array.isArray(node.content)) {
        for (const child of node.content) pending.push({ node: child, depth: depth + 1 });
      }
    }
    const parsed = contentNodeSchema.safeParse(input);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export { plainTextFromContent } from "@/lib/content-text";

export function paragraphContent(text: string): JSONContent {
  return {
    type: "doc",
    content: text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })),
  };
}
