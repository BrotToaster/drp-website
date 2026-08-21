"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const portalPrefixes = ["/dashboard", "/staff", "/admin"];

export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (portalPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) return null;
  return children;
}
