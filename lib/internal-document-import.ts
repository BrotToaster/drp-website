import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { JSONContent } from "@tiptap/react";

export type WorkbookSnapshot = {
  kind: "workbook";
  sheets: { name: string; rows: string[][] }[];
};

export const internalDocumentPresets = [
  { key: "team-rulebook", title: "Team-Regelwerk", type: "GOOGLE_DOCS" as const, externalId: "1J064B-SoVn57wXbwg3207yDCRnt5EVHvxZE6Scp6IOU", url: "https://docs.google.com/document/d/1J064B-SoVn57wXbwg3207yDCRnt5EVHvxZE6Scp6IOU/edit?usp=sharing", splitProtocols: true },
  { key: "user-list", title: "User Liste", type: "GOOGLE_SHEETS" as const, externalId: "1rM94jgLil1YHStuvbVY-YVreC_n_OCSh8YUE0dG7rq8", url: "https://docs.google.com/spreadsheets/d/1rM94jgLil1YHStuvbVY-YVreC_n_OCSh8YUE0dG7rq8/edit?usp=sharing" },
  { key: "penalty-catalog", title: "Strafen Katalog", type: "UPLOAD_XLSX" as const, externalId: "1qlgUfdSYIjLkGEP1bKa1rnzwDUWo0ulATj4ZNXTf0jk", url: "https://docs.google.com/spreadsheets/d/1qlgUfdSYIjLkGEP1bKa1rnzwDUWo0ulATj4ZNXTf0jk/edit?usp=sharing" },
  { key: "intermediate-exam", title: "Zwischen Prüfung", type: "GOOGLE_SHEETS" as const, externalId: "1AhegKqJ96xb0Kb-NCtiFh2Hl5AsIijhkpeWXzFK-6GI", url: "https://docs.google.com/spreadsheets/d/1AhegKqJ96xb0Kb-NCtiFh2Hl5AsIijhkpeWXzFK-6GI/edit?usp=sharing" },
  { key: "junior-moderator-exam", title: "Junior Moderator Prüfung", type: "GOOGLE_DOCS" as const, externalId: "1DrLkOIasQZGYhB4p0-_ZnGP5IOu9Nj6z45EceEUEBDg", url: "https://docs.google.com/document/d/1DrLkOIasQZGYhB4p0-_ZnGP5IOu9Nj6z45EceEUEBDg/edit?usp=sharing" },
  { key: "test-administrator-exam", title: "Test Administrator Prüfung", type: "UPLOAD_DOCX" as const, externalId: "1MFmDwd74avNFQX008w4MEXbP5EaRwkBtvu3FVXPqxnY", url: "https://docs.google.com/document/d/1MFmDwd74avNFQX008w4MEXbP5EaRwkBtvu3FVXPqxnY/edit?usp=sharing" },
] as const;

const protocolDefinitions = [
  { slug: "protokoll-discord-kick", title: "Protokoll zum Kick auf dem Discord-Server", aliases: ["Protokoll zum Kick", "Protokoll zum Kick auf dem Discord-Server"] },
  { slug: "protokoll-discord-bann", title: "Protokoll zur Bannung auf dem Discord-Server", aliases: ["Protokoll zur Bannung", "Protokoll zur Bannung auf dem Discord-Server"] },
  { slug: "protokoll-community-ausschluss", title: "Protokoll für einen Community-Ausschluss", aliases: ["Protokoll für einen Community Ausschluss", "Protokoll für einen Community-Ausschluss"] },
  { slug: "protokoll-discord-entbannung", title: "Protokoll zur Entbannung auf dem Discord-Server", aliases: ["Protokoll zur Entbannung", "Protokoll zur Entbannung auf dem Discord-Server"] },
  { slug: "protokoll-regelwerk", title: "Protokoll zur Bearbeitung des Regelwerks und Team-Regelwerks", aliases: ["Protokoll zur Bearbeitung des Regelwerks", "Protokoll zur Bearbeitung des Regelwerks und Team Regelwerks"] },
] as const;

function clean(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function safeUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://docs.google.com");
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function inlineNodes($: CheerioAPI, node: AnyNode): JSONContent[] {
  const result: JSONContent[] = [];
  const visit = (current: AnyNode, inheritedMarks: NonNullable<JSONContent["marks"]>) => {
    $(current).contents().each((_, child) => {
      if (child.type === "text") {
        const text = $(child).text().replace(/\u00a0/g, " ").replace(/\s+/g, " ");
        if (text.trim()) result.push({ type: "text", text, ...(inheritedMarks.length ? { marks: inheritedMarks } : {}) });
        return;
      }
      if (child.type !== "tag") return;
      const name = child.name.toLowerCase();
      if (name === "br") {
        result.push({ type: "hardBreak" });
        return;
      }
      const style = String($(child).attr("style") || "").toLowerCase();
      const marks = [...inheritedMarks];
      if (["strong", "b"].includes(name) || /font-weight:\s*(bold|[6-9]00)/.test(style)) marks.push({ type: "bold" });
      if (["em", "i"].includes(name) || /font-style:\s*italic/.test(style)) marks.push({ type: "italic" });
      if (name === "a") {
        const href = safeUrl($(child).attr("href"));
        if (href) marks.push({ type: "link", attrs: { href } });
      }
      visit(child, marks.filter((mark, index, all) => all.findIndex((candidate) => candidate.type === mark.type) === index));
    });
  };
  visit(node, []);
  const firstText = result.find((item) => item.type === "text");
  const lastText = [...result].reverse().find((item) => item.type === "text");
  if (firstText?.text) firstText.text = firstText.text.trimStart();
  if (lastText?.text) lastText.text = lastText.text.trimEnd();
  return result.filter((item) => item.type !== "text" || Boolean(item.text));
}

function tableNode($: CheerioAPI, node: AnyNode): JSONContent | null {
  const rows = $(node).find("tr").toArray().map((row, rowIndex) => ({
    type: "tableRow",
    content: $(row).children("th,td").toArray().map((cell) => ({
      type: rowIndex === 0 || cell.type === "tag" && cell.name === "th" ? "tableHeader" : "tableCell",
      content: [{ type: "paragraph", content: inlineNodes($, cell) }],
    })),
  })).filter((row) => row.content.length);
  return rows.length ? { type: "table", content: rows } : null;
}

function listNode($: CheerioAPI, node: AnyNode): JSONContent | null {
  const items = $(node).children("li").toArray().map((item) => {
    const nested = $(item).children("ul,ol").first();
    const clone = $(item).clone();
    clone.children("ul,ol").remove();
    const content: JSONContent[] = [{ type: "paragraph", content: inlineNodes($, clone.get(0) || item) }];
    if (nested.length) {
      const parsed = listNode($, nested.get(0)!);
      if (parsed) content.push(parsed);
    }
    return { type: "listItem", content };
  });
  return items.length ? { type: node.type === "tag" && node.name === "ol" ? "orderedList" : "bulletList", content: items } : null;
}

export function parseDocumentHtml(html: string): JSONContent {
  const $ = load(html);
  const nodes: JSONContent[] = [];
  $("body").find("h1,h2,h3,h4,h5,h6,p,ul,ol,table,blockquote").each((_, element) => {
    const tag = element.name.toLowerCase();
    if ($(element).parents("table").length && tag !== "table") return;
    if ($(element).parents("ul,ol").length && !["ul", "ol"].includes(tag)) return;
    if (["ul", "ol"].includes(tag) && $(element).parents("ul,ol").length) return;
    if (tag === "table" && $(element).parents("table").length) return;
    if (tag === "table") {
      const parsed = tableNode($, element);
      if (parsed) nodes.push(parsed);
      return;
    }
    if (["ul", "ol"].includes(tag)) {
      const parsed = listNode($, element);
      if (parsed) nodes.push(parsed);
      return;
    }
    const content = inlineNodes($, element);
    if (!content.length) return;
    if (/^h[1-6]$/.test(tag)) nodes.push({ type: "heading", attrs: { level: Math.min(3, Math.max(2, Number(tag.slice(1)))) }, content });
    else if (tag === "blockquote") nodes.push({ type: "blockquote", content: [{ type: "paragraph", content }] });
    else nodes.push({ type: "paragraph", content });
  });
  return { type: "doc", content: nodes };
}

export async function parseDocx(buffer: Buffer) {
  const converted = await mammoth.convertToHtml({ buffer });
  return parseDocumentHtml(converted.value);
}

function spreadsheetCellText(cell: ExcelJS.Cell) {
  try {
    return cell.text || "";
  } catch {
    if (cell.isMerged && cell.master !== cell) {
      try {
        return cell.master.text || "";
      } catch {}
    }
    const value = cell.value;
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "object" && "result" in value && value.result != null) return String(value.result);
    if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
    if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
    return "";
  }
}

export async function parseWorkbook(buffer: Buffer): Promise<WorkbookSnapshot> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  if (workbook.worksheets.length > 25) throw new Error("Die Arbeitsmappe enthält mehr als 25 Tabellenblätter.");
  let totalCells = 0;
  const sheets = workbook.worksheets.map((sheet) => {
    if (sheet.actualRowCount > 10_000 || sheet.actualColumnCount > 100) throw new Error(`Das Tabellenblatt „${sheet.name}“ ist zu groß.`);
    const rows: string[][] = [];
    for (let rowNumber = 1; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
      const row: string[] = [];
      for (let column = 1; column <= sheet.actualColumnCount; column += 1) {
        row.push(clean(spreadsheetCellText(sheet.getCell(rowNumber, column))));
        totalCells += 1;
      }
      while (row.length && !row[row.length - 1]) row.pop();
      rows.push(row);
    }
    while (rows.length && !rows[rows.length - 1].some(Boolean)) rows.pop();
    return { name: clean(sheet.name) || "Tabelle", rows };
  });
  if (totalCells > 250_000) throw new Error("Die Arbeitsmappe enthält zu viele Zellen.");
  return { kind: "workbook", sheets };
}

export function contentText(content: JSONContent | undefined): string {
  if (!content) return "";
  return [content.text || "", ...(content.content || []).map(contentText)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function workbookText(workbook: WorkbookSnapshot | null) {
  return workbook?.sheets.flatMap((sheet) => [sheet.name, ...sheet.rows.flat()]).join(" ").replace(/\s+/g, " ").trim() || "";
}

export function asWorkbookSnapshot(value: unknown): WorkbookSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { kind?: unknown; sheets?: unknown };
  if (candidate.kind !== "workbook" || !Array.isArray(candidate.sheets)) return null;
  const sheets = candidate.sheets.flatMap((sheet) => {
    if (!sheet || typeof sheet !== "object" || Array.isArray(sheet)) return [];
    const item = sheet as { name?: unknown; rows?: unknown };
    if (typeof item.name !== "string" || !Array.isArray(item.rows)) return [];
    const rows = item.rows.flatMap((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string") ? [row as string[]] : []);
    return [{ name: item.name, rows }];
  });
  return sheets.length === candidate.sheets.length ? { kind: "workbook", sheets } : null;
}

export function sourceChecksum(content: JSONContent, structuredData?: WorkbookSnapshot | null) {
  return createHash("sha256").update(JSON.stringify({ content, structuredData: structuredData || null })).digest("hex");
}

function nodeText(node: JSONContent) {
  return contentText(node).replace(/[–—]/g, "-").toLocaleLowerCase("de");
}

export function splitTeamRulebook(content: JSONContent) {
  const nodes = content.content || [];
  const marker = nodes.findIndex((node, index) => index > nodes.length / 2 && /protokolle/.test(nodeText(node)));
  if (marker < 0) return { main: content, protocols: [] as { slug: string; title: string; content: JSONContent }[] };
  const starts: number[] = [];
  let cursor = marker + 1;
  for (const definition of protocolDefinitions) {
    const index = nodes.findIndex((node, nodeIndex) => nodeIndex >= cursor && definition.aliases.some((alias) => nodeText(node) === alias.replace(/[–—]/g, "-").toLocaleLowerCase("de")));
    if (index < 0) return { main: content, protocols: [] as { slug: string; title: string; content: JSONContent }[] };
    starts.push(index);
    cursor = index + 1;
  }
  const protocols = protocolDefinitions.map((definition, index) => ({
    slug: definition.slug,
    title: definition.title,
    content: { type: "doc", content: nodes.slice(starts[index], starts[index + 1] ?? nodes.length) } as JSONContent,
  }));
  const links: JSONContent[] = [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Protokolle" }] },
    {
      type: "bulletList",
      content: protocols.map((protocol) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: protocol.title, marks: [{ type: "link", attrs: { href: `/staff/dokumente/${protocol.slug}` } }] }] }],
      })),
    },
  ];
  return { main: { type: "doc", content: [...nodes.slice(0, marker), ...links] } as JSONContent, protocols };
}
