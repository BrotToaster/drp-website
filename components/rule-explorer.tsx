"use client";

import Link from "next/link";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { RichContent } from "@/components/rich-content";
import { MediaGallery } from "@/components/media-gallery";
import type { RuleView } from "@/lib/demo-data";
import { formatDate } from "@/lib/site";
import { groupRules, indexRules, ruleSnippet, searchRules } from "@/lib/rule-search";
import { HighlightedText as Highlight } from "@/components/highlighted-text";
import { ruleReadingContent } from "@/lib/rule-content";
import { decodeScrollHash, scrollToTarget } from "@/lib/scroll-navigation";

const RuleBody = memo(function RuleBody({ rule, query }: { rule: RuleView; query: string }) {
  const content = useMemo(() => ruleReadingContent(rule.content), [rule.content]);
  return <><RichContent content={content} headingOffset={3} highlightQuery={query} /><MediaGallery media={rule.media} headingId={`rule-media-${rule.slug}`} title="Anhänge zu dieser Regel" headingLevel={5} /></>;
});

export function RuleExplorer({ rules }: { rules: RuleView[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState("Alle");
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [copied, setCopied] = useState<{ slug: string; ok: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<{ slug: string; immediate: boolean } | null>(null);
  const index = useMemo(() => indexRules(rules), [rules]);
  const categories = useMemo(() => groupRules(index), [index]);
  const matches = useMemo(() => searchRules(index, deferredQuery), [index, deferredQuery]);
  const filtered = useMemo(() => searchRules(index, deferredQuery, category), [index, deferredQuery, category]);
  const groups = useMemo(() => groupRules(filtered), [filtered]);
  const allOpen = filtered.length > 0 && filtered.every(item => open.has(item.rule.slug));
  const searching = Boolean(deferredQuery.trim());
  const reveal = useCallback((slug: string, immediate = false) => {
    if (!rules.some(rule => rule.slug === slug)) return;
    pendingScroll.current = { slug, immediate };
    setCategory("Alle"); setQuery("");
    setOpen(current => new Set(current).add(slug));
  }, [rules]);
  useEffect(() => {
    const pending = pendingScroll.current;
    if (!pending || !filtered.some(item => item.rule.slug === pending.slug)) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(pending.slug);
      if (target) { pendingScroll.current = null; scrollToTarget(target, pending.immediate); }
    });
    return () => cancelAnimationFrame(frame);
  }, [filtered, open]);
  useEffect(() => {
    const readHash = () => reveal(decodeScrollHash(location.hash), true);
    readHash();
    window.addEventListener("hashchange", readHash);
    const shortcut = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      event.preventDefault(); searchRef.current?.focus();
    };
    window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("hashchange", readHash); window.removeEventListener("keydown", shortcut); };
  }, [reveal]);
  const chooseCategory = (value: string) => {
    setCategory(value);
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    requestAnimationFrame(() => { if (resultsRef.current) scrollToTarget(resultsRef.current); });
  };
  const toggle = (slug: string, expanded: boolean) => setOpen(current => {
    if (current.has(slug) === expanded) return current;
    const next = new Set(current);
    if (expanded) next.add(slug); else next.delete(slug);
    return next;
  });
  const reset = () => { setQuery(""); setCategory("Alle"); searchRef.current?.focus(); };
  return (
    <div className="rules-workspace">
      <div className="rules-toolbar" data-intro="rules">
        <div className="rules-search">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
          <label className="sr-only" htmlFor="rule-search">Regelwerk durchsuchen</label>
          <input ref={searchRef} id="rule-search" type="search" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setCategory("Alle"); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setQuery(""); } }} placeholder="Begriff, Regel oder Paragraph suchen …" aria-controls="rule-results" />
          {query ? <button type="button" className="rules-clear" aria-label="Suche leeren" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button> : <kbd aria-hidden="true">/</kbd>}
        </div>
        <div className="rules-mobile-category"><label htmlFor="rule-category">Bereich</label><select id="rule-category" className="field" value={category} onChange={event => chooseCategory(event.target.value)}><option value="Alle">Alle Bereiche ({matches.length})</option>{categories.map(group => <option key={group.name} value={group.name}>{group.name} ({matches.filter(item => item.rule.category === group.name).length})</option>)}</select></div>
      </div>
      <div className="rules-layout">
        <aside className="rules-sidebar" aria-label="Regelbereiche">
          <h2>Bereiche</h2>
          <nav aria-label="Regelwerk nach Bereichen" data-lenis-prevent>
            <button type="button" aria-pressed={category === "Alle"} onClick={() => chooseCategory("Alle")}><span>Alle Bereiche</span><span>{matches.length}</span></button>
            {categories.map(group => <button key={group.name} type="button" aria-pressed={category === group.name} onClick={() => chooseCategory(group.name)}><span>{group.name}</span><span>{matches.filter(item => item.rule.category === group.name).length}</span></button>)}
          </nav>
          <div className="rules-help"><p>Frage zu einer Regel?</p><Link href="/kontakt">Kontakt zum Team<span aria-hidden="true"> →</span></Link></div>
        </aside>
        <div className="rules-results" id="rule-results" ref={resultsRef} aria-busy={query !== deferredQuery}>
          <div className="rules-results-heading">
            <div><h2>{searching ? "Suchergebnisse" : category === "Alle" ? "Alle Regeln" : category}</h2><p role="status">{searching ? `${filtered.length} Treffer` : `${filtered.length} ${filtered.length === 1 ? "Regel" : "Regeln"}`}{category === "Alle" && groups.length ? ` in ${groups.length} ${groups.length === 1 ? "Bereich" : "Bereichen"}` : ""}</p></div>
            {filtered.length > 0 && <button type="button" className="rules-expand-all" onClick={() => setOpen(current => {
              const next = new Set(current);
              for (const { rule } of filtered) { if (allOpen) next.delete(rule.slug); else next.add(rule.slug); }
              return next;
            })}>{allOpen ? "Alles schließen" : "Alles aufklappen"}</button>}
          </div>
          {!rules.length ? <div className="rules-empty"><h3>Noch keine Regeln veröffentlicht.</h3><p>Sobald eine Fassung freigegeben ist, findest du sie hier.</p></div>
            : !filtered.length ? <div className="rules-empty"><h3>Keine passende Regel gefunden.</h3><p>Versuche einen kürzeren Begriff oder suche in allen Bereichen.</p><button type="button" className="button button-secondary" onClick={reset}>Suche und Filter zurücksetzen</button></div>
              : groups.map((group, groupIndex) => <section key={group.name} className="rules-group" aria-labelledby={`rule-group-${groupIndex}`}>
                <div className="rules-group-heading"><h3 id={`rule-group-${groupIndex}`}>{group.name}</h3><span>{group.entries.length} {group.entries.length === 1 ? "Regel" : "Regeln"}</span></div>
                <div className="rules-entries">
                  {group.entries.map(({ rule, text }) => <details className="rule-entry" key={rule.id} id={rule.slug} open={open.has(rule.slug)} onToggle={event => toggle(rule.slug, event.currentTarget.open)}>
                    <summary><div><h4><Highlight text={rule.title} query={deferredQuery} /></h4><p className="rule-excerpt"><Highlight text={ruleSnippet(text, searching ? deferredQuery : "")} query={deferredQuery} /></p></div><svg className="rule-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
                    <div className="rule-body">
                      <RuleBody rule={rule} query={deferredQuery} />
                      <div className="rule-meta"><p>Version {rule.version}<span aria-hidden="true"> · </span>Stand <time dateTime={new Date(rule.updatedAt).toISOString()}>{formatDate(rule.updatedAt)}</time></p><div><a href={`#${encodeURIComponent(rule.slug)}`} onClick={event => { event.preventDefault(); history.pushState(history.state, "", `#${encodeURIComponent(rule.slug)}`); reveal(rule.slug); }}>Direktlink</a><button type="button" onClick={async () => {
                        try { await navigator.clipboard.writeText(`${location.origin}/regelwerk#${encodeURIComponent(rule.slug)}`); setCopied({ slug: rule.slug, ok: true }); }
                        catch { setCopied({ slug: rule.slug, ok: false }); }
                      }}>Link kopieren</button></div></div>
                      {copied?.slug === rule.slug && <p className="rule-copy-status" role="status">{copied.ok ? "Direktlink kopiert." : "Kopieren ist hier nicht möglich. Öffne den Direktlink und kopiere die Adresse aus dem Browser."}</p>}
                    </div>
                  </details>)}
                </div>
              </section>)}
        </div>
      </div>
    </div>
  );
}
