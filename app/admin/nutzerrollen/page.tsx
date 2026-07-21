import { PortalShell } from "@/components/portal-shell";
import { StaffUserDirectory, type UserDirectoryQuery } from "@/components/staff-user-directory";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminUserRolesPage({ searchParams }: { searchParams: Promise<UserDirectoryQuery> }) {
  const { authorization } = await requirePermission("users.roles.assign");
  return (
    <PortalShell authorization={authorization} title="Rollenvergabe" description="Manuelle Website-Rollen zuweisen. Discord-Zuweisungen bleiben synchronisiert und sind hier gekennzeichnet." section="admin">
      <StaffUserDirectory query={await searchParams} editable basePath="/admin/nutzerrollen" />
    </PortalShell>
  );
}
