"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { isNavigationActive, publicDiscoverNavigation, publicHelpNavigation, publicNavigation } from "@/lib/navigation";

function DesktopMenu({ label, items }: { label: string; items: typeof publicDiscoverNavigation }) {
  return <details className="public-nav-menu">
    <summary>{label}<span aria-hidden="true">⌄</span></summary>
    <div className="public-nav-popover">
      {items.map((item) => <Link key={item.href} href={item.href}><span className="nav-code">{item.code}</span><span><strong>{item.label}</strong><small>{item.keywords.slice(0, 2).join(" · ")}</small></span></Link>)}
    </div>
  </details>;
}

export function HeaderClient({ authenticated, discordUrl }: { authenticated: boolean; discordUrl: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return <header className="public-header">
    <div className="container-shell public-header-row">
      <Logo />
      <nav aria-label="Hauptnavigation" className="public-desktop-nav">
        <Link className={isNavigationActive(pathname, "/", true) ? "active" : ""} href="/">Start</Link>
        <DesktopMenu label="Entdecken" items={publicDiscoverNavigation} />
        <Link className={isNavigationActive(pathname, "/regelwerk") ? "active" : ""} href="/regelwerk">Regelwerk</Link>
        <DesktopMenu label="Hilfe" items={publicHelpNavigation} />
      </nav>
      <div className="public-header-actions">
        <Link className="button button-secondary compact-action" href={authenticated ? "/dashboard" : "/login"}>{authenticated ? "Portal" : "Anmelden"}</Link>
        <a className="button button-primary compact-action public-discord-action" href={discordUrl} target="_blank" rel="noreferrer">Discord</a>
        <button className="mobile-menu-button" type="button" aria-label="Navigation öffnen" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span /><span /></button>
      </div>
    </div>
    {open && <div className="public-mobile-panel">
      <nav className="container-shell" aria-label="Mobile Navigation">
        <p>DRP entdecken</p>
        {[...publicNavigation, ...publicDiscoverNavigation, ...publicHelpNavigation].map((item) => <Link key={item.href} href={item.href} className={isNavigationActive(pathname, item.href, item.href === "/") ? "active" : ""}><span className="nav-code">{item.code}</span>{item.label}<span aria-hidden="true">→</span></Link>)}
        <a href={discordUrl} target="_blank" rel="noreferrer"><span className="nav-code">DC</span>Discord & Support<span aria-hidden="true">↗</span></a>
      </nav>
    </div>}
  </header>;
}
