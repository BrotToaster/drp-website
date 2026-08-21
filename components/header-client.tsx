"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { isNavigationActive, publicDiscoverNavigation, publicHelpNavigation, publicNavigation } from "@/lib/navigation";

function DesktopMenu({
  label,
  items,
  open,
  active,
  onToggle,
  onNavigate,
}: {
  label: string;
  items: typeof publicDiscoverNavigation;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return <div className="public-nav-menu" data-open={open ? "true" : "false"}>
    <button type="button" className={active ? "active" : ""} aria-expanded={open} onClick={onToggle}>{label}<span aria-hidden="true">⌄</span></button>
    <div className="public-nav-popover" aria-hidden={!open} inert={!open}>
      {items.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate}><span className="nav-code">{item.code}</span><span><strong>{item.label}</strong><small>{item.keywords.slice(0, 2).join(" · ")}</small></span></Link>)}
    </div>
  </div>;
}

export function HeaderClient({ authenticated, discordUrl }: { authenticated: boolean; discordUrl: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState<"discover" | "help" | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const closeMenus = () => {
    setOpen(false);
    setDesktopMenu(null);
  };
  useEffect(() => {
    setOpen(false);
    setDesktopMenu(null);
  }, [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setDesktopMenu(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setOpen(false);
        setDesktopMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return <header ref={headerRef} className="public-header">
    <div className="container-shell public-header-row">
      <Logo />
      <nav aria-label="Hauptnavigation" className="public-desktop-nav">
        <Link className={isNavigationActive(pathname, "/", true) ? "active" : ""} href="/" onClick={closeMenus}>Start</Link>
        <DesktopMenu label="Entdecken" items={publicDiscoverNavigation} open={desktopMenu === "discover"} active={publicDiscoverNavigation.some((item) => isNavigationActive(pathname, item.href))} onToggle={() => setDesktopMenu((current) => current === "discover" ? null : "discover")} onNavigate={closeMenus} />
        <Link className={isNavigationActive(pathname, "/regelwerk") ? "active" : ""} href="/regelwerk" onClick={closeMenus}>Regelwerk</Link>
        <DesktopMenu label="Hilfe" items={publicHelpNavigation} open={desktopMenu === "help"} active={publicHelpNavigation.some((item) => isNavigationActive(pathname, item.href))} onToggle={() => setDesktopMenu((current) => current === "help" ? null : "help")} onNavigate={closeMenus} />
      </nav>
      <div className="public-header-actions">
        <Link className="button button-secondary compact-action" href={authenticated ? "/dashboard" : "/login"} onClick={closeMenus}>{authenticated ? "Portal" : "Anmelden"}</Link>
        <a className="button button-primary compact-action public-discord-action" href={discordUrl} target="_blank" rel="noreferrer" onClick={() => { setOpen(false); setDesktopMenu(null); }}>Discord</a>
        <button className="mobile-menu-button" type="button" aria-label={open ? "Navigation schließen" : "Navigation öffnen"} aria-expanded={open} onClick={() => { setDesktopMenu(null); setOpen((value) => !value); }}><span /><span /></button>
      </div>
    </div>
    <div className="public-mobile-panel" data-open={open ? "true" : "false"} aria-hidden={!open}>
      <nav className="container-shell" aria-label="Mobile Navigation" inert={!open}>
        <p>DRP entdecken</p>
        {[...publicNavigation, ...publicDiscoverNavigation, ...publicHelpNavigation].map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className={isNavigationActive(pathname, item.href, item.href === "/") ? "active" : ""}><span className="nav-code">{item.code}</span>{item.label}<span aria-hidden="true">→</span></Link>)}
        <a href={discordUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><span className="nav-code">DC</span>Discord & Support<span aria-hidden="true">↗</span></a>
      </nav>
    </div>
  </header>;
}
