import { PortalShell } from "@/components/portal-shell";
import { StaffUserDirectory, type UserDirectoryQuery } from "@/components/staff-user-directory";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function StaffRolesPage({ searchParams }: { searchParams: Promise<UserDirectoryQuery> }) {
  const { authorization } = await requirePermission("users.roles.assign");
  return (
    <PortalShell authorization={authorization} title="Rollenvergabe" description="Manuelle Website-Rollen zuweisen. Discord-Rollen werden weiterhin synchronisiert." section="staff">
      <StaffUserDirectory query={await searchParams} editable basePath="/staff/rollen" />
    </PortalShell>
  );
}
