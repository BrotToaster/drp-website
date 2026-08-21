import type { PermissionKey } from "@/lib/permission-keys";

export function isNavigationActive(pathname: string, target: string, exact = false) {
  if (target === "/") return pathname === "/";
  return exact ? pathname === target : pathname === target || pathname.startsWith(target + "/");
}

export type NavigationItem = {
  href: string;
  label: string;
  code: string;
  keywords: string[];
  permission?: PermissionKey;
  exact?: boolean;
  external?: boolean;
};

export type NavigationGroup = { label: string; items: NavigationItem[] };

export function filterNavigationGroups(groups: NavigationGroup[], allowed: (permission: PermissionKey) => boolean) {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || allowed(item.permission)) }))
    .filter((group) => group.items.length > 0);
}

export const publicNavigation = [
  { href: "/", label: "Start", code: "ST", keywords: ["home", "startseite"] },
  { href: "/regelwerk", label: "Regelwerk", code: "RW", keywords: ["regeln", "paragraphen"] },
] satisfies NavigationItem[];

export const publicDiscoverNavigation = [
  { href: "/server", label: "Server", code: "SV", keywords: ["erlc", "beitreten"] },
  { href: "/team", label: "Team", code: "TM", keywords: ["staff", "mitarbeiter"] },
  { href: "/kalender", label: "Kalender", code: "KA", keywords: ["termine", "events"] },
  { href: "/news", label: "News", code: "NW", keywords: ["neuigkeiten", "updates"] },
] satisfies NavigationItem[];

export const publicHelpNavigation = [
  { href: "/faq", label: "FAQ", code: "FA", keywords: ["hilfe", "fragen"] },
  { href: "/status", label: "Status", code: "ON", keywords: ["dienste", "verfuegbarkeit"] },
] satisfies NavigationItem[];

export const dashboardNavigation: NavigationGroup[] = [
  { label: "Übersicht", items: [
    { href: "/dashboard", label: "Mein DRP", code: "DR", keywords: ["dashboard", "start"], exact: true },
  ] },
  { label: "Mein Konto", items: [
    { href: "/dashboard/profil", label: "Profil & Konten", code: "PR", keywords: ["discord", "roblox", "konto"] },
    { href: "/dashboard/tickets", label: "Website-Tickets", code: "TK", keywords: ["kontakt", "technik", "ownership"] },
    { href: "/dashboard/bewerbung", label: "Bewerbungen", code: "BE", keywords: ["melonly", "bewerben", "status"] },
  ] },
];

export const staffNavigation: NavigationGroup[] = [
  { label: "Betrieb", items: [
    { href: "/staff", label: "Live Operations", code: "OP", keywords: ["erlc", "spieler", "server"], permission: "staff.access", exact: true },
    { href: "/staff/tickets", label: "Website-Tickets", code: "TK", keywords: ["kontakt", "technik", "ownership"], permission: "tickets.view" },
    { href: "/staff/nutzer", label: "Nutzerverzeichnis", code: "NU", keywords: ["discord", "roblox", "mitglieder"], permission: "users.view" },
    { href: "/staff/aktivitaet", label: "Teamaktivität", code: "AK", keywords: ["melonly", "zeiten", "loa", "weekly"], permission: "team_activity.view_self" },
    { href: "/staff/bewerbungen", label: "Bewerbungen", code: "BE", keywords: ["melonly", "prüfung"], permission: "staff.access" },
    { href: "/staff/sanktionen", label: "Moderationsmaßnahmen", code: "MO", keywords: ["melonly", "warns", "appeals", "sanktionen"], permission: "staff.access" },
  ] },
  { label: "Inhalte & Wissen", items: [
    { href: "/staff/kalender", label: "Kalender", code: "KA", keywords: ["termine", "events"], permission: "staff.access" },
    { href: "/staff/regelwerk", label: "Regelwerk", code: "RW", keywords: ["regeln", "redaktion"], permission: "rules.view" },
    { href: "/staff/news", label: "News", code: "NW", keywords: ["beitraege", "redaktion"], permission: "news.view" },
    { href: "/staff/faq", label: "Öffentliches FAQ", code: "FA", keywords: ["fragen", "hilfe"], permission: "faq.view" },
    { href: "/staff/handbuch", label: "Staff-FAQ", code: "HB", keywords: ["handbuch", "wissen"], permission: "staff_faq.view" },
    { href: "/staff/dokumente", label: "Interne Dokumente", code: "DO", keywords: ["wissen", "dateien"], permission: "documents.access" },
    { href: "/staff/audit", label: "Audit-Log", code: "AU", keywords: ["historie", "kontrolle"], permission: "audit.view" },
  ] },
];

export const adminNavigation: NavigationGroup[] = [
  { label: "Administration", items: [
    { href: "/admin", label: "Systemübersicht", code: "SY", keywords: ["admin", "gesundheit"], permission: "admin.access", exact: true },
    { href: "/admin/nutzerrollen", label: "Rollenvergabe", code: "RV", keywords: ["nutzer", "rollen"], permission: "users.roles.assign" },
    { href: "/admin/rollen", label: "Rollen & Rechte", code: "RR", keywords: ["berechtigungen", "zugriff"], permission: "roles.manage" },
    { href: "/admin/discord", label: "Discord", code: "DI", keywords: ["sync", "rollen"], permission: "discord.manage" },
    { href: "/admin/tickets", label: "Ticketzugriffe", code: "TZ", keywords: ["kategorien", "support"], permission: "tickets.manage_categories" },
  ] },
  { label: "Website", items: [
    { href: "/admin/website", label: "Startseite & Links", code: "WE", keywords: ["rollenkarten", "discord", "melonly"], permission: "site.manage" },
    { href: "/admin/team", label: "Teamseite", code: "TM", keywords: ["staff", "profile"], permission: "team.manage" },
    { href: "/admin/status", label: "Statusseite", code: "ON", keywords: ["dienste", "meldungen"], permission: "status.manage" },
    { href: "/admin/staff-faq", label: "Staff-FAQ verwalten", code: "HF", keywords: ["handbuch", "wissen"], permission: "staff_faq.manage" },
  ] },
  { label: "System & Integrationen", items: [
    { href: "/admin/dokumente", label: "Dokumentzugriffe", code: "DZ", keywords: ["kategorien", "rollen"], permission: "documents.manage_categories" },
    { href: "/admin/kalender", label: "Kalenderzugriffe", code: "KZ", keywords: ["kategorien", "rollen"], permission: "calendar.manage_categories" },
    { href: "/admin/melonly", label: "Melonly & Team", code: "ME", keywords: ["zeiten", "ranks", "weekly"], permission: "melonly.manage" },
    { href: "/admin/integrationen", label: "Integrationen", code: "IN", keywords: ["status", "api", "sync"], permission: "integrations.view" },
    { href: "/admin/rechtliches", label: "Rechtliches", code: "RE", keywords: ["datenschutz", "impressum"], permission: "legal.manage" },
  ] },
];

export const allNavigationItems = [
  ...publicNavigation,
  ...publicDiscoverNavigation,
  ...publicHelpNavigation,
  ...dashboardNavigation.flatMap((group) => group.items),
  ...staffNavigation.flatMap((group) => group.items),
  ...adminNavigation.flatMap((group) => group.items),
];
