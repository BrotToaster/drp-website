"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RuleView } from "@/lib/demo-data";

export function RuleRotator({ rules }: { rules: RuleView[] }) {
  const [start, setStart] = useState(0);
  const [pageSize, setPageSize] = useState(6);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 720px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPageSize(mobile.matches ? 2 : 6);
      setReducedMotion(reduced.matches);
    };
    update();
    mobile.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      mobile.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || rules.length <= pageSize) return;
    const timer = window.setInterval(
      () => setStart((current) => (current + pageSize) % rules.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, [pageSize, paused, reducedMotion, rules.length]);

  const visible = useMemo(
    () =>
      Array.from({ length: Math.min(pageSize, rules.length) }, (_, index) =>
        rules[(start + index) % rules.length],
      ),
    [pageSize, rules, start],
  );

  const move = (direction: number) => {
    setStart((current) => (current + direction * pageSize + rules.length) % rules.length);
  };

  if (!rules.length) return null;
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {visible.map((rule) => (
          <Link
            key={rule.id}
            href={"/regelwerk#" + rule.slug}
            className="surface surface-interactive min-h-36 p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#777d81]">
              {rule.category}
            </p>
            <p className="mt-3 line-clamp-3 font-semibold leading-6">{rule.title}</p>
            <span className="mt-5 inline-block text-xs font-bold text-[#efc76e]">Lesen →</span>
          </Link>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-[#70767a]">
          {Math.min(start + 1, rules.length)}–{Math.min(start + visible.length, rules.length)} von {rules.length}
        </p>
        <div className="flex gap-2">
          <button type="button" className="button button-secondary !min-h-10 !px-4" onClick={() => move(-1)} aria-label="Vorherige Regeln">←</button>
          <button type="button" className="button button-secondary !min-h-10 !px-4" onClick={() => move(1)} aria-label="Nächste Regeln">→</button>
        </div>
      </div>
    </div>
  );
}