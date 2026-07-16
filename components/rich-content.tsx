import type { JSONContent } from "@tiptap/react";
import type { ReactNode } from "react";

function safeHref(value: unknown) {
  if (typeof value !== "string") return undefined;
  return /^(https?:|mailto:)/i.test(value) ? value : undefined;
}

function withMarks(node: JSONContent, child: ReactNode) {
  return (node.marks || []).reduce<ReactNode>((value, mark, index) => {
    if (mark.type === "bold") return <strong key={index}>{value}</strong>;
    if (mark.type === "italic") return <em key={index}>{value}</em>;
    if (mark.type === "strike") return <s key={index}>{value}</s>;
    if (mark.type === "code") return <code key={index}>{value}</code>;
    if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      return href ? (
        <a key={index} href={href} target="_blank" rel="noreferrer noopener">
          {value}
        </a>
      ) : value;
    }
    return value;
  }, child);
}

function renderNode(node: JSONContent, key: number | string): ReactNode {
  if (node.type === "text") return <span key={key}>{withMarks(node, node.text || "")}</span>;
  const children = node.content?.map((child, index) => renderNode(child, index));
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return <p key={key}>{children || <br />}</p>;
    case "heading": {
      const level = Math.min(3, Math.max(2, Number(node.attrs?.level) || 2));
      return level === 3 ? <h3 key={key}>{children}</h3> : <h2 key={key}>{children}</h2>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "image": {
      const src = safeHref(node.attrs?.src);
      return src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={key} src={src} alt={String(node.attrs?.alt || "")} loading="lazy" />
      ) : null;
    }
    default:
      return <span key={key}>{children}</span>;
  }
}

export function RichContent({ content }: { content: JSONContent }) {
  return <div className="rich-content">{renderNode(content, "root")}</div>;
}