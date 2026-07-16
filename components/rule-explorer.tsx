"use client";

import { useMemo, useState } from "react";
import type { RuleView } from "@/lib/demo-data";

export function RuleExplorer({ rules }: { rules: RuleView[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alle");
  const categories = ["Alle", ...Array.from(new Set(rules.map((rule) => rule.category)))];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rules.filter(
      (rule) =>
        (category === "Alle" || rule.category === category) &&
        (!term ||
          rule.title.toLowerCase().includes(term) ||
          rule.content.toLowerCase().includes(term)),
    );
  }, [rules, query, category]);

  return (
    <div>
      <div className="surface mb-8 grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="rule-search">
          Regelwerk durchsuchen
        </label>
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
        {filtered.map((rule, index) => (
          <article key={rule.id} id={rule.slug} className="surface p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d6aa4c]/10 text-xs font-bold text-[#efc76e]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858b90]">
                    {rule.category}
                  </span>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{rule.title}</h2>
                </div>
              </div>
              <span className="badge">Version {rule.version}</span>
            </div>
            <p className="ml-0 mt-5 max-w-3xl text-[15px] leading-7 text-[#aeb2b5] md:ml-[52px]">
              {rule.content}
            </p>
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
