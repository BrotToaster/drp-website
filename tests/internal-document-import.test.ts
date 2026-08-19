import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  asWorkbookSnapshot,
  contentText,
  parseDocumentHtml,
  parseWorkbook,
  sourceChecksum,
} from "@/lib/internal-document-import";

describe("Import interner Dokumente", () => {
  it("übernimmt Überschriften, Listen, Links und Tabellen strukturiert", () => {
    const content = parseDocumentHtml(`
      <html><body>
        <h1>Team-Regelwerk</h1>
        <p><strong>Wichtig:</strong> <a href="https://example.com/info">Hinweis lesen</a></p>
        <ul><li>Erster Punkt</li><li>Zweiter Punkt</li></ul>
        <table><tr><th>Rang</th><th>Ziel</th></tr><tr><td>JM</td><td>120 Minuten</td></tr></table>
      </body></html>
    `);
    expect(content.content?.map((node) => node.type)).toEqual(["heading", "paragraph", "bulletList", "table"]);
    expect(contentText(content)).toContain("Team-Regelwerk");
    expect(contentText(content)).toContain("120 Minuten");
    const paragraph = content.content?.[1];
    expect(paragraph?.content?.some((node) => node.marks?.some((mark) => mark.type === "bold"))).toBe(true);
    expect(paragraph?.content?.some((node) => node.marks?.some((mark) => mark.type === "link"))).toBe(true);
  });

  it("übernimmt Tabellenblätter und sichtbare Zellwerte aus XLSX", async () => {
    const workbook = new ExcelJS.Workbook();
    const users = workbook.addWorksheet("User Liste");
    users.addRow(["Discord", "Rang"]);
    users.addRow(["Morit", "Admin"]);
    const second = workbook.addWorksheet("Archiv");
    second.addRow(["Eintrag", 42]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const snapshot = await parseWorkbook(buffer);
    expect(snapshot.sheets).toHaveLength(2);
    expect(snapshot.sheets[0].rows[1]).toEqual(["Morit", "Admin"]);
    expect(snapshot.sheets[1].rows[0]).toEqual(["Eintrag", "42"]);
    expect(asWorkbookSnapshot(snapshot)).toEqual(snapshot);
  });

  it("erzeugt nur bei verändertem Inhalt eine andere Prüfsumme", () => {
    const first = parseDocumentHtml("<p>Version eins</p>");
    const same = parseDocumentHtml("<p>Version eins</p>");
    const changed = parseDocumentHtml("<p>Version zwei</p>");
    expect(sourceChecksum(first)).toBe(sourceChecksum(same));
    expect(sourceChecksum(first)).not.toBe(sourceChecksum(changed));
  });
});
