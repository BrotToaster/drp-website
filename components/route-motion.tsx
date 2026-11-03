"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RouteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/" || /^\/(admin|staff|dashboard)(?:\/|$)/.test(pathname) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.querySelector('.intro-panel:not([data-tour-step="welcome"])')) return;
    const main = document.querySelector("body > main");
    const animation = main?.animate(
      [
        { opacity: .72, transform: "translateY(7px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 360, easing: "cubic-bezier(.22,1,.36,1)" },
    );
    return () => animation?.cancel();
  }, [pathname]);
  return null;
}
