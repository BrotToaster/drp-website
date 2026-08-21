import type { ReactNode } from "react";
import { PortalFrame } from "@/components/portal-frame";
import type { AuthorizationContext } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { adminNavigation, dashboardNavigation, filterNavigationGroups, staffNavigation } from "@/lib/navigation";
import { getHomepageSettings } from "@/lib/site-settings";

export async function PortalShell({ authorization, title, description, children, section = "dashboard" }: {
  authorization: AuthorizationContext; title: string; description: string; children: ReactNode;
  section?: "dashboard" | "staff" | "admin";
}) {
  const source = section === "dashboard" ? dashboardNavigation : section === "staff" ? staffNavigation : adminNavigation;
  const allowed = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(authorization, permission);
  const groups = filterNavigationGroups(source, allowed);
  const allItems = filterNavigationGroups([...dashboardNavigation, ...staffNavigation, ...adminNavigation], allowed).flatMap((group) => group.items);
  const homepage = await getHomepageSettings();
  return <PortalFrame groups={groups} allItems={allItems} title={title} description={description} section={section} role={authorization.primaryRole} canStaff={hasPermission(authorization, "staff.access")} canAdmin={hasPermission(authorization, "admin.access")} melonlyUrl={homepage.melonlyUrl}>
    {children}
  </PortalFrame>;
}
