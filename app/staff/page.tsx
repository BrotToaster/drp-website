import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { getServerDetails } from "@/lib/erlc";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const { authorization } = await requirePermission("staff.access");
  const visibleCategoryIds = authorization.isOwner
    ? undefined
    : authorization.ticketAccess.filter((item) => item.canView).map((item) => item.categoryId);

  const [server, ticketCount, userCount] = await Promise.all([
    getServerDetails(true),
    prisma.ticket.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_USER"] },
        ...(visibleCategoryIds ? { categoryId: { in: visibleCategoryIds } } : {}),
      },
    }),
    prisma.user.count(),
  ]);

  return (
    <PortalShell
      authorization={authorization}
      title="Staff-Übersicht"
      description="Die wichtigsten Kennzahlen für deinen Arbeitsbereich."
      section="staff"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Für dich sichtbare offene Tickets", ticketCount],
          ["Registrierte Nutzer", userCount],
          ["ER:LC Spieler", server.status.players ?? "–"],
        ].map(([label, result]) => (
          <div key={label} className="surface p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">{label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{result}</p>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
