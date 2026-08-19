"use client";

import { useMemo, useState } from "react";
import type { WorkbookSnapshot } from "@/lib/internal-document-import";

export function InternalWorkbookViewer({ workbook }: { workbook: WorkbookSnapshot }) {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const sheet = workbook.sheets[Math.min(active, workbook.sheets.length - 1)];
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("de");
    if (!normalized) return sheet?.rows || [];
    return (sheet?.rows || []).filter((row, index) => index === 0 || row.some((cell) => cell.toLocaleLowerCase("de").includes(normalized)));
  }, [query, sheet]);
  if (!sheet) return null;
  return <section className="workbook-shell">
    <div className="workbook-toolbar">
      <div className="workbook-tabs" role="tablist" aria-label="Tabellenblätter">{workbook.sheets.map((item, index) => <button key={`${item.name}-${index}`} type="button" role="tab" aria-selected={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}>{item.name}</button>)}</div>
      <label className="sr-only" htmlFor="workbook-search">Tabelle durchsuchen</label><input id="workbook-search" className="field !min-h-10 max-w-sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="In diesem Tabellenblatt suchen" />
    </div>
    <div className="workbook-scroll" tabIndex={0} aria-label={`Tabelle ${sheet.name}`}>
      <table><thead>{rows[0] && <tr>{rows[0].map((cell, index) => <th key={index} scope="col">{cell || `Spalte ${index + 1}`}</th>)}</tr>}</thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>
      {rows.length <= 1 && <p className="p-6 text-sm text-[#777d81]">Keine passenden Tabellenzeilen gefunden.</p>}
    </div>
  </section>;
}
