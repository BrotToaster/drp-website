"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { isNavigationActive } from "@/lib/navigation";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
  activeClassName?: string;
  exact?: boolean;
};

export function ActiveNavLink({
  href,
  className = "",
  activeClassName = "",
  exact,
  onNavigate,
  ...props
}: Props) {
  const pathname = usePathname();
  const target = typeof href === "string" ? href : href.pathname || "/";
  const active = isNavigationActive(pathname, target, exact);
  return (
    <Link
      href={href}
      prefetch
      onNavigate={(event) => {
        window.dispatchEvent(new Event("drp:navigation-start"));
        onNavigate?.(event);
      }}
      className={[className, active ? activeClassName : ""].filter(Boolean).join(" ")}
      aria-current={active ? "page" : undefined}
      {...props}
    />
  );
}