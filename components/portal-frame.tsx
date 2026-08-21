"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ActiveNavLink } from "@/components/active-nav-link";
import { CommandPalette } from "@/components/command-palette";
import { Logo } from "@/components/logo";
import type { NavigationGroup, NavigationItem } from "@/lib/navigation";

export function PortalFrame({ groups, allItems, title, description, section, role, canStaff, canAdmin, melonlyUrl, children }: {
  groups: NavigationGroup[];
  allItems: NavigationItem[];
  title: string;
  description: string;
  section: "dashboard" | "staff" | "admin";
  role: string;
  canStaff: boolean;
  canAdmin: boolean;
  melonlyUrl: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [command, setCommand] = useState(false);
  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => {
    const stored = window.localStorage.getItem("drp.portal.sidebar");
    if (stored === "collapsed") setCollapsed(true);
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("en") === "k") { event.preventDefault(); setCommand(true); }
      if (event.key === "Escape") { setCommand(false); setDrawer(false); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  const toggleCollapsed = () => setCollapsed((value) => { window.localStorage.setItem("drp.portal.sidebar", value ? "expanded" : "collapsed"); return !value; });
  const sectionLabel = section === "dashboard" ? "Mein DRP" : section === "staff" ? "DRP Staff" : "Administration";
  const switchers = useMemo(() => [
    { href: "/dashboard", label: "Mein DRP", show: true },
    { href: "/staff", label: "Staff", show: canStaff },
    { href: "/admin", label: "Admin", show: canAdmin },
  ].filter((item) => item.show), [canStaff, canAdmin]);

  const sidebar = <>
    <div className="portal-brand"><Logo compact={collapsed} /><button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}>{collapsed ? "→" : "←"}</button></div>
    <div className="portal-context"><span>{sectionLabel}</span>{!collapsed && <strong>{role}</strong>}</div>
    <nav className="portal-navigation" aria-label={`${sectionLabel} Navigation`}>
      {groups.map((group) => <div key={group.label} className="portal-nav-group"><p>{group.label}</p>{group.items.map((item) => <ActiveNavLink key={item.href} href={item.href} exact={item.exact} className="portal-nav-link" activeClassName="active"><span className="nav-code">{item.code}</span>{!collapsed && <span>{item.label}</span>}</ActiveNavLink>)}</div>)}
    </nav>
    <div className="portal-sidebar-footer">
      <a href={melonlyUrl} target="_blank" rel="noreferrer" className="portal-nav-link"><span className="nav-code">ME</span>{!collapsed && <span>Melonly öffnen</span>}</a>
      <Link href="/" className="portal-nav-link"><span className="nav-code">↗</span>{!collapsed && <span>Öffentliche Website</span>}</Link>
    </div>
  </>;

  return <div className={`portal-app ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="portal-sidebar">{sidebar}</aside>
    {drawer && <div className="portal-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDrawer(false)}><aside className="portal-mobile-drawer">{sidebar}</aside></div>}
    <div className="portal-workspace">
      <header className="portal-topbar">
        <button className="portal-mobile-trigger" type="button" onClick={() => setDrawer(true)} aria-label="Portal-Navigation öffnen">☰</button>
        <nav className="portal-switcher" aria-label="Portal wechseln">{switchers.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}>{item.label}</Link>)}</nav>
        <button className="portal-command-trigger" type="button" onClick={() => setCommand(true)}><span>⌕</span><span>DRP durchsuchen</span><kbd>CTRL K</kbd></button>
        <a className="portal-status-link" href="/status"><span className="status-dot" /> <span>System</span></a>
      </header>
      <div className="portal-content">
        <div className="portal-page-heading"><div><p>{sectionLabel}</p><h1>{title}</h1><span>{description}</span></div><button type="button" onClick={() => setCommand(true)}>Suchen <kbd>⌘K</kbd></button></div>
        {children}
      </div>
    </div>
    <CommandPalette items={allItems} open={command} onClose={() => setCommand(false)} />
  </div>;
}
