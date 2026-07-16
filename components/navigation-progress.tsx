"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./navigation-progress.module.css";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => setLoading(false), [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin === window.location.origin &&
        url.href !== window.location.href &&
        !url.hash
      ) setLoading(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return loading ? <div className={styles.bar} aria-label="Seite lädt" /> : null;
}
