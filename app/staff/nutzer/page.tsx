import { PortalShell } from "@/components/portal-shell";
import { StaffUserDirectory, type UserDirectoryQuery } from "@/components/staff-user-directory";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function StaffUsersPage({ searchParams }: { searchParams: Promise<UserDirectoryQuery> }) {
  const { authorization } = await requirePermission("users.view");
  return (
    <PortalShell authorization={authorization} title="Nutzer" description="Konten, verknüpfte Namen und Rollen in einer rein lesenden Übersicht." section="staff">
      <StaffUserDirectory query={await searchParams} editable={false} basePath="/staff/nutzer" />
    </PortalShell>
  );
}
