"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./navigation-progress.module.css";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    setLoading(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(stop, [pathname, searchParams, stop]);
  useEffect(() => {
    const start = () => {
      if (timer.current) clearTimeout(timer.current);
      setLoading(true);
      timer.current = setTimeout(stop, 12_000);
    };
    window.addEventListener("drp:navigation-start", start);
    window.addEventListener("pageshow", stop);
    window.addEventListener("popstate", stop);
    return () => {
      window.removeEventListener("drp:navigation-start", start);
      window.removeEventListener("pageshow", stop);
      window.removeEventListener("popstate", stop);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [stop]);

  return loading ? <div className={styles.bar} aria-label="Seite lädt" role="progressbar" /> : null;
}
