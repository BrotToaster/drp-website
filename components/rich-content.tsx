import type { JSONContent } from "@tiptap/react";
import { createElement, type ReactNode } from "react";
import { ContentImage } from "@/components/content-image";
import { HighlightedText } from "@/components/highlighted-text";
import { safeContentHref } from "@/lib/content-links";

function safeHref(value: unknown) {
  return safeContentHref(value);
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
        <a key={index} href={href} target={href.startsWith("/") || href.startsWith("#") ? undefined : "_blank"} rel={href.startsWith("/") || href.startsWith("#") ? undefined : "noreferrer noopener"}>
          {value}
        </a>
      ) : value;
    }
    return value;
  }, child);
}

function renderNode(node: JSONContent, key: number | string, headingOffset: number, highlightQuery: string): ReactNode {
  if (node.type === "text") return <span key={key}>{withMarks(node, highlightQuery ? <HighlightedText text={node.text || ""} query={highlightQuery} /> : node.text || "")}</span>;
  const children = node.content?.map((child, index) => renderNode(child, index, headingOffset, highlightQuery));
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return <p key={key}>{children || <br />}</p>;
    case "heading": {
      const level = Math.min(6, Math.min(3, Math.max(2, Number(node.attrs?.level) || 2)) + headingOffset);
      return createElement(`h${level}`, { key }, children);
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <div className="rich-code-scroll" key={key} tabIndex={0}>
          <pre>
            <code>{children}</code>
          </pre>
        </div>
      );
    case "table":
      return (
        <div className="rich-table-scroll" key={key} tabIndex={0}>
          <table>{children}</table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableHeader":
      return <th key={key}>{children}</th>;
    case "tableCell":
      return <td key={key}>{children}</td>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "image": {
      const src = safeHref(node.attrs?.src);
      return src ? (
        <ContentImage key={key} src={src} alt={String(node.attrs?.alt || node.attrs?.title || "Bild zum Beitrag")} className="h-auto max-w-full" />
      ) : null;
    }
    default:
      return <span key={key}>{children}</span>;
  }
}

export function RichContent({ content, headingOffset = 0, highlightQuery = "" }: { content: JSONContent; headingOffset?: number; highlightQuery?: string }) {
  return <div className="rich-content text-safe">{renderNode(content, "root", headingOffset, highlightQuery)}</div>;
}
