"use client";

import { useEffect } from "react";

type IdleWindow = Window & { requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

export function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-drp-home]");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; addEventListener?: typeof window.addEventListener; removeEventListener?: typeof window.removeEventListener } }).connection;
    let disposed = false;
    let generation = 0;
    let stop: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idle: number | undefined;
    const idleWindow = window as IdleWindow;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      if (idle !== undefined) idleWindow.cancelIdleCallback?.(idle);
      timer = undefined;
      idle = undefined;
      stop?.();
      stop = undefined;
    };
    const configure = () => {
      const current = ++generation;
      cancel();
      if (reduce.matches || connection?.saveData || (navigator.hardwareConcurrency || 8) < 4) {
        root.dataset.motion = "native";
        return;
      }
      const start = async () => {
        try {
          const { mountHomeMotion } = await import("@/lib/home-motion");
          if (disposed || current !== generation || !root.isConnected) return;
          stop = mountHomeMotion(root);
          root.dataset.motion = "ready";
        } catch {
          // Enhancement failure leaves the server-rendered content and scrolling intact.
          root.dataset.motion = "native";
        }
      };
      // The page and its primary image render before optional animation code loads.
      timer = setTimeout(() => {
        if (idleWindow.requestIdleCallback) idle = idleWindow.requestIdleCallback(() => { void start(); }, { timeout: 1200 });
        else void start();
      }, 180);
    };
    const loaded = () => configure();
    if (document.readyState === "complete") configure();
    else window.addEventListener("load", loaded, { once: true });
    reduce.addEventListener("change", configure);
    connection?.addEventListener?.("change", configure);
    return () => {
      disposed = true;
      generation++;
      cancel();
      window.removeEventListener("load", loaded);
      reduce.removeEventListener("change", configure);
      connection?.removeEventListener?.("change", configure);
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
