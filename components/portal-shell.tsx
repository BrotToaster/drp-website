import type { ReactNode } from "react";
import { ActiveNavLink } from "@/components/active-nav-link";
import { Logo } from "@/components/logo";
import type { PermissionKey } from "@/lib/permission-keys";
import type { AuthorizationContext } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

type NavItem = { href: string; label: string; permission?: PermissionKey; exact?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

const playerGroups: NavGroup[] = [{ items: [
  { href: "/dashboard", label: "Übersicht", exact: true },
  { href: "/dashboard/profil", label: "Profil" },
  { href: "/dashboard/tickets", label: "Tickets" },
] }];
const staffGroups: NavGroup[] = [
  { items: [{ href: "/staff", label: "Übersicht", permission: "staff.access", exact: true }] },
  { label: "Arbeitsbereich", items: [
    { href: "/staff/tickets", label: "Ticketverwaltung", permission: "tickets.view" },
    { href: "/staff/nutzer", label: "Nutzer", permission: "users.view" },
  ] },
  { label: "Redaktion", items: [
    { href: "/staff/regelwerk", label: "Regelwerk", permission: "rules.view" },
    { href: "/staff/news", label: "News", permission: "news.view" },
    { href: "/staff/faq", label: "Öffentliches FAQ", permission: "faq.view" },
  ] },
  { label: "Wissen & Kontrolle", items: [
    { href: "/staff/handbuch", label: "Staff-FAQ", permission: "staff_faq.view" },
    { href: "/staff/audit", label: "Audit-Log", permission: "audit.view" },
  ] },
];
const adminGroups: NavGroup[] = [
  { items: [{ href: "/admin", label: "Übersicht", permission: "admin.access", exact: true }] },
  { label: "Nutzer & Zugriffe", items: [
    { href: "/admin/nutzerrollen", label: "Rollenvergabe", permission: "users.roles.assign" },
    { href: "/admin/rollen", label: "Rollen & Rechte", permission: "roles.manage" },
    { href: "/admin/discord", label: "Discord", permission: "discord.manage" },
    { href: "/admin/tickets", label: "Ticketzugriffe", permission: "tickets.manage_categories" },
  ] },
  { label: "Website", items: [
    { href: "/admin/website", label: "Startseite & Rollenkarten", permission: "site.manage" },
    { href: "/admin/team", label: "Team", permission: "team.manage" },
    { href: "/admin/status", label: "Status", permission: "status.manage" },
  ] },
  { label: "System", items: [
    { href: "/admin/staff-faq", label: "Staff-FAQ verwalten", permission: "staff_faq.manage" },
    { href: "/admin/rechtliches", label: "Rechtliches", permission: "legal.manage" },
    { href: "/admin/integrationen", label: "Integrationen", permission: "integrations.view" },
  ] },
];

export function PortalShell({ authorization, title, description, children, section = "dashboard" }: {
  authorization: AuthorizationContext; title: string; description: string; children: ReactNode;
  section?: "dashboard" | "staff" | "admin";
}) {
  const source = section === "dashboard" ? playerGroups : section === "staff" ? staffGroups : adminGroups;
  const groups = source.map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || hasPermission(authorization, item.permission)) })).filter((group) => group.items.length);
  const sidebarClass = "rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-[#9da3a8] transition hover:bg-white/[0.045] hover:text-white";
  const sidebarActive = "!border-[#d6aa4c]/25 !bg-[#d6aa4c]/10 !text-[#efc76e]";
  return (
    <div className="container-shell py-8 md:py-10">
      <div className="grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit lg:sticky lg:top-28"><div className="surface p-4">
          <div className="mb-4 flex items-center justify-between px-2 py-2"><Logo compact /><span className="badge badge-gold">{authorization.primaryRole}</span></div>
          <nav className="grid gap-4" aria-label={section === "dashboard" ? "Dashboard-Navigation" : section === "staff" ? "Staff-Navigation" : "Admin-Navigation"}>
            {groups.map((group, index) => <div key={group.label || index} className="grid gap-1">
              {group.label && <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#62686d]">{group.label}</p>}
              {group.items.map((link) => <ActiveNavLink key={link.href} href={link.href} exact={link.exact} className={sidebarClass} activeClassName={sidebarActive}>{link.label}</ActiveNavLink>)}
            </div>)}
            {section === "dashboard" && hasPermission(authorization, "staff.access") && <ActiveNavLink href="/staff" className="rounded-xl border border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.07] px-3 py-3 text-sm font-semibold text-[#efc76e]" activeClassName="!bg-[#d6aa4c]/15">Staff-Panel</ActiveNavLink>}
            {section === "staff" && hasPermission(authorization, "admin.access") && <ActiveNavLink href="/admin" className="rounded-xl border border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.07] px-3 py-3 text-sm font-semibold text-[#efc76e]" activeClassName="!bg-[#d6aa4c]/15">Admin-Panel</ActiveNavLink>}
            {section !== "dashboard" && <ActiveNavLink href={section === "admin" ? "/staff" : "/dashboard"} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#9da3a8]" activeClassName="">← Zurück</ActiveNavLink>}
          </nav>
        </div></aside>
        <main className="min-w-0">
          <div className="mb-8 border-b border-white/[0.07] pb-7">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#efc76e]">{section === "dashboard" ? "Mein DRP" : section === "staff" ? "DRP Staff" : "DRP Administration"}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8d9397]">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
