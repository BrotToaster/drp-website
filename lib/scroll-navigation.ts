type ScrollTarget = HTMLElement | number;
type ScrollDriver = (target: ScrollTarget, immediate: boolean) => void;
let driver: ScrollDriver | null = null;

export function registerScrollDriver(next: ScrollDriver) {
  driver = next;
  return () => { if (driver === next) driver = null; };
}

export function scrollToTarget(target: ScrollTarget, immediate = false) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (driver) return driver(target, immediate || reduce);
  const behavior = immediate || reduce ? "instant" : "smooth";
  if (typeof target === "number") window.scrollTo({ top: target, behavior });
  else target.scrollIntoView({ block: "start", behavior });
}

export function decodeScrollHash(hash: string) {
  try { return decodeURIComponent(hash.replace(/^#/, "")); } catch { return ""; }
}
