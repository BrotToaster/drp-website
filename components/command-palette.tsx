"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigationItem } from "@/lib/navigation";

type SearchResult = { id: string; kind: string; title: string; subtitle?: string; href: string; status?: string };

export function CommandPalette({ items, open, onClose }: { items: NavigationItem[]; open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
    else { setQuery(""); setRemote([]); }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setRemote([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const body = response.ok ? await response.json() as { results?: SearchResult[] } : {};
        setRemote(body.results || []);
      } catch { if (!controller.signal.aborted) setRemote([]); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  const local = useMemo(() => {
    const normalized = query.toLocaleLowerCase("de").trim();
    if (!normalized) return items.slice(0, 8);
    return items.filter((item) => [item.label, item.href, ...item.keywords].join(" ").toLocaleLowerCase("de").includes(normalized)).slice(0, 8);
  }, [items, query]);

  if (!open) return null;
  return <div className="command-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="command-dialog" role="dialog" aria-modal="true" aria-label="DRP durchsuchen">
      <div className="command-search-row"><span aria-hidden="true">⌕</span><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && onClose()} placeholder="Seiten, Regeln, Tickets, Dokumente …" aria-label="Suchbegriff" /><kbd>ESC</kbd></div>
      <div className="command-results">
        {local.length > 0 && <div className="command-group"><p>Navigation</p>{local.map((item) => <Link href={item.href} key={item.href} onClick={onClose}><span className="nav-code">{item.code}</span><span><strong>{item.label}</strong><small>{item.href}</small></span><span aria-hidden="true">↗</span></Link>)}</div>}
        {query.trim().length >= 2 && <div className="command-group"><p>{loading ? "Suche …" : "Inhalte"}</p>{remote.map((result) => <Link href={result.href} key={`${result.kind}:${result.id}`} onClick={onClose}><span className="nav-code">{result.kind.slice(0, 2).toUpperCase()}</span><span><strong>{result.title}</strong><small>{result.subtitle || result.kind}</small></span>{result.status && <em>{result.status}</em>}</Link>)}{!loading && remote.length === 0 && <div className="command-empty">Keine weiteren Treffer.</div>}</div>}
      </div>
      <footer><span><kbd>↵</kbd> Öffnen</span><span>Ergebnisse werden nach deinen Rechten gefiltert.</span></footer>
    </section>
  </div>;
}
