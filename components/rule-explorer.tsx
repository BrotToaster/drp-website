"use client";

import { useMemo, useState } from "react";
import { RichContent } from "@/components/rich-content";
import { MediaGallery } from "@/components/media-gallery";
import type { RuleView } from "@/lib/demo-data";
import { formatDate } from "@/lib/site";

export function RuleExplorer({ rules }: { rules: RuleView[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alle");
  const categories = ["Alle", ...Array.from(new Set(rules.map((rule) => rule.category)))];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rules.filter(
      (rule) =>
        (category === "Alle" || rule.category === category) &&
        (!term || rule.searchText.toLowerCase().includes(term)),
    );
  }, [rules, query, category]);

  return (
    <div>
      <div className="surface mb-8 grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="rule-search">Regelwerk durchsuchen</label>
        <input
          id="rule-search"
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Regelwerk durchsuchen …"
        />
        <div className="flex max-w-full gap-2 overflow-x-auto">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setCategory(item)}
              className={
                "button !min-h-12 !shrink-0 !px-4 !text-xs " +
                (category === item ? "button-primary" : "button-secondary")
              }
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((rule) => (
          <article key={rule.id} id={rule.slug} className="surface scroll-mt-36 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858b90]">
                  {rule.category}
                </span>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{rule.title}</h2>
              </div>
              <div className="text-right">
                <span className="badge">Version {rule.version}</span>
                <p className="mt-2 text-[11px] text-[#6f7579]">Stand {formatDate(rule.updatedAt)}</p>
              </div>
            </div>
            <RichContent content={rule.content} />
            <MediaGallery media={rule.media} />
          </article>
        ))}
        {!filtered.length && (
          <div className="surface p-10 text-center text-sm text-[#9da3a8]">
            Keine passende Regel gefunden.
          </div>
        )}
      </div>
    </div>
  );
}