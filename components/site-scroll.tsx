"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { scrollToTarget } from "@/lib/scroll-navigation";
import { introVisibilityEvent } from "@/lib/intro";

export function SiteScroll() {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; addEventListener?: typeof window.addEventListener; removeEventListener?: typeof window.removeEventListener } }).connection;
    let disposed = false;
    let generation = 0;
    let stop: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const configure = () => {
      const current = ++generation;
      clearTimeout(timer); stop?.(); stop = undefined;
      document.documentElement.dataset.scrollMode = "native";
      if (reduce.matches || !pointer.matches || connection?.saveData || (navigator.hardwareConcurrency || 8) < 4) return;
      timer = setTimeout(async () => {
        try {
          const { mountSiteScroll } = await import("@/lib/site-scroll");
          if (disposed || generation !== current) return;
          stop = mountSiteScroll();
          document.documentElement.dataset.scrollMode = "smooth";
        } catch { /* Native scrolling remains available. */ }
      }, 180);
    };
    configure();
    reduce.addEventListener("change", configure);
    pointer.addEventListener("change", configure);
    connection?.addEventListener?.("change", configure);
    return () => {
      disposed = true; generation++; clearTimeout(timer); stop?.();
      reduce.removeEventListener("change", configure);
      pointer.removeEventListener("change", configure);
      connection?.removeEventListener?.("change", configure);
      delete document.documentElement.dataset.scrollMode;
    };
  }, [pathname]);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; setShowTop(window.scrollY > 700 && !document.querySelector(".intro-panel")); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener(introVisibilityEvent, update);
    return () => { window.removeEventListener("scroll", scroll); window.removeEventListener(introVisibilityEvent, update); if (frame) cancelAnimationFrame(frame); };
  }, [pathname]);
  return showTop ? <button type="button" className="scroll-top" aria-label="Nach oben" onClick={() => {
    scrollToTarget(0);
    const main = document.getElementById("main-content");
    main?.setAttribute("tabindex", "-1"); main?.focus({ preventScroll: true });
  }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 12 6-6 6 6M12 6v13" /></svg></button> : null;
}
