"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RouteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.querySelector("body > main");
    main?.animate(
      [
        { opacity: .72, transform: "translateY(7px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 360, easing: "cubic-bezier(.22,1,.36,1)" },
    );
  }, [pathname]);
  return null;
}
