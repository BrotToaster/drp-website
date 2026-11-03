import type { SVGProps } from "react";

type Name = "home" | "people" | "calendar" | "ticket" | "document" | "activity" | "grid" | "search" | "menu" | "arrow" | "shield" | "fire" | "road";
const paths: Record<Name, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10H5V10" /><path d="M9 20v-7h6v7" /></>,
  people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v3" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m5 0h1m-7 3h1" /></>,
  ticket: <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Zm12 0v2m0 3v2m0 3v2" />,
  document: <><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6" /></>,
  activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  arrow: <path d="M7 17 17 7M7 7h10v10" />,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  fire: <path d="M13 3c1 6 6 7 6 12a7 7 0 0 1-14 0c0-3 1-5 4-8 0 4 1 5 2 5 2-2 2-6 2-9Z" />,
  road: <><path d="M7 3 3 21M17 3l4 18M12 3v3m0 4v4m0 4v3" /></>,
};

export function InterfaceIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: Name }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export function NavigationIcon({ href }: { href: string }) {
  const name: Name = /kalender/.test(href) ? "calendar" : /ticket|kontakt/.test(href) ? "ticket" : /rollen|nutzer|team|discord|profil/.test(href) ? "people" : /news|regelwerk|dokument|handbuch|faq/.test(href) ? "document" : /status|aktiv|melonly|audit/.test(href) ? "activity" : /website|integration|recht/.test(href) ? "grid" : "home";
  return <InterfaceIcon name={name} className="navigation-icon" />;
}
