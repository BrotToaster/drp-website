import type { ReactNode } from "react";
import { ActiveNavLink } from "@/components/active-nav-link";
import { Logo } from "@/components/logo";
import { staffNavigationPermissions } from "@/lib/permission-keys";
import type { AuthorizationContext } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

const playerLinks = [
  { href: "/dashboard", label: "Übersicht", exact: true },
  { href: "/dashboard/profil", label: "Profil" },
  { href: "/dashboard/tickets", label: "Tickets" },
];

const staffLinks = [
  { href: "/staff", label: "Übersicht", permission: "staff.access", exact: true },
  { href: "/staff/tickets", label: "Ticketverwaltung", permission: staffNavigationPermissions.tickets },
  { href: "/staff/regelwerk", label: "Regelwerk", permission: staffNavigationPermissions.rules },
  { href: "/staff/news", label: "News", permission: staffNavigationPermissions.news },
  { href: "/staff/audit", label: "Audit-Log", permission: staffNavigationPermissions.audit },
] as const;

const adminLinks = [
  { href: "/admin", label: "Übersicht", permission: "admin.access", exact: true },
  { href: "/admin/rollen", label: "Rollen & Rechte", permission: "roles.manage" },
  { href: "/admin/discord", label: "Discord", permission: "discord.manage" },
  { href: "/admin/tickets", label: "Ticketzugriffe", permission: "tickets.manage_categories" },
  { href: "/admin/website", label: "Website", permission: "site.manage" },
  { href: "/admin/integrationen", label: "Integrationen", permission: "integrations.view" },
] as const;

export function PortalShell({
  authorization,
  title,
  description,
  children,
  section = "dashboard",
}: {
  authorization: AuthorizationContext;
  title: string;
  description: string;
  children: ReactNode;
  section?: "dashboard" | "staff" | "admin";
}) {
  const links =
    section === "dashboard"
      ? playerLinks
      : (section === "staff" ? staffLinks : adminLinks).filter((link) =>
          hasPermission(authorization, link.permission),
        );
  const sidebarClass =
    "rounded-xl border border-transparent px-3 py-3 text-sm font-semibold text-[#9da3a8] transition hover:bg-white/[0.045] hover:text-white";
  const sidebarActive =
    "!border-[#d6aa4c]/25 !bg-[#d6aa4c]/10 !text-[#efc76e]";

  return (
    <div className="container-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit lg:sticky lg:top-28">
          <div className="surface p-4">
            <div className="mb-5 flex items-center justify-between px-2 py-2">
              <Logo compact />
              <span className="badge badge-gold">{authorization.primaryRole}</span>
            </div>
            <nav
              className="grid gap-1"
              aria-label={
                section === "dashboard"
                  ? "Dashboard-Navigation"
                  : section === "staff"
                    ? "Staff-Navigation"
                    : "Admin-Navigation"
              }
            >
              {links.map((link) => (
                <ActiveNavLink
                  key={link.href}
                  href={link.href}
                  exact={"exact" in link ? link.exact : false}
                  className={sidebarClass}
                  activeClassName={sidebarActive}
                >
                  {link.label}
                </ActiveNavLink>
              ))}
              {section === "dashboard" && hasPermission(authorization, "staff.access") && (
                <ActiveNavLink
                  href="/staff"
                  className="mt-2 rounded-xl border border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.07] px-3 py-3 text-sm font-semibold text-[#efc76e]"
                  activeClassName="!bg-[#d6aa4c]/15"
                >
                  Staff-Panel
                </ActiveNavLink>
              )}
              {section === "staff" && hasPermission(authorization, "admin.access") && (
                <ActiveNavLink
                  href="/admin"
                  className="mt-2 rounded-xl border border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.07] px-3 py-3 text-sm font-semibold text-[#efc76e]"
                  activeClassName="!bg-[#d6aa4c]/15"
                >
                  Admin-Panel
                </ActiveNavLink>
              )}
              {section !== "dashboard" && (
                <ActiveNavLink
                  href={section === "admin" ? "/staff" : "/dashboard"}
                  className="mt-2 rounded-xl px-3 py-3 text-sm font-semibold text-[#9da3a8]"
                  activeClassName=""
                >
                  Zurück
                </ActiveNavLink>
              )}
            </nav>
          </div>
        </aside>
        <main className="min-w-0">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#efc76e]">
              {section === "dashboard"
                ? "Mein DRP"
                : section === "staff"
                  ? "DRP Staff"
                  : "DRP Administration"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8d9397]">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}