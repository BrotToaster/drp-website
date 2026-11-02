"use client";

import { useLayoutEffect } from "react";

const locks = new Set<symbol>();
function sync() {
  document.documentElement.classList.toggle("drp-scroll-locked", locks.size > 0);
  window.dispatchEvent(new Event("drp:scroll-lock"));
}

// Multiple overlays may coexist; closing one must not unlock another.
export function useDocumentScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const token = Symbol("scroll-lock");
    locks.add(token); sync();
    return () => { locks.delete(token); sync(); };
  }, [active]);
}
