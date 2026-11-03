"use client";

import { useLayoutEffect, useRef } from "react";
import { ActiveNavLink } from "@/components/active-nav-link";
import { NavigationIcon } from "@/components/interface-icon";
import type { NavigationGroup } from "@/lib/navigation";

const positions = new Map<string, number>();

export function PortalNavigation({ groups, section, label, collapsed, onNavigate }: {
  groups: NavigationGroup[];
  section: string;
  label: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const navigation = useRef<HTMLElement>(null);
  const storageKey = `drp-panel-position:${section}`;
  useLayoutEffect(() => {
    const node = navigation.current;
    if (!node) return;
    let saved = positions.get(storageKey) || 0;
    try { saved = positions.get(storageKey) ?? Number(sessionStorage.getItem(storageKey) || 0); } catch { /* In-memory navigation also works without storage. */ }
    if (Number.isFinite(saved) && saved >= 0) node.scrollTop = saved;
  }, [storageKey]);
  const remember = () => {
    const node = navigation.current;
    if (!node?.getClientRects().length) return;
    positions.set(storageKey, node.scrollTop);
    try { sessionStorage.setItem(storageKey, String(node.scrollTop)); } catch { /* Optional session preference. */ }
  };
  return <nav ref={navigation} className="portal-navigation" aria-label={`${label} Navigation`} onScroll={remember} data-lenis-prevent>
    {groups.map(group => <div key={group.label} className="portal-nav-group"><p>{group.label}</p>{group.items.map(item => <ActiveNavLink key={item.href} href={item.href} exact={item.exact} scroll={false} onNavigate={() => { remember(); onNavigate(); }} className="portal-nav-link" activeClassName="active" aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined}><NavigationIcon href={item.href} />{!collapsed && <span>{item.label}</span>}</ActiveNavLink>)}</div>)}
  </nav>;
}
