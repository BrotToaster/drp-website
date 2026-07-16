import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await requireRole("ADMIN");
  let logs: Array<{
    id: string; action: string; entityType: string; entityId: string | null;
    createdAt: Date; metadata: unknown; actor: { name: string } | null;
  }> = [];
  try {
    logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { name: true } } },
    });
  } catch {}
  return (
    <PortalShell role={user.role} title="Audit-Log" description="Unveränderliche Historie aller privilegierten Verwaltungsaktionen." staff>
      <section className="surface overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Zeitpunkt</th><th>Akteur</th><th>Aktion</th><th>Objekt</th><th>Metadaten</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-[#858b90]">{formatDateTime(log.createdAt)}</td>
                  <td className="font-semibold">{log.actor?.name || "System"}</td>
                  <td>{log.action}</td>
                  <td>{log.entityType}{log.entityId ? " · " + log.entityId.slice(0, 8) : ""}</td>
                  <td className="max-w-64 truncate text-[#777d81]">{log.metadata ? JSON.stringify(log.metadata) : "–"}</td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={5} className="py-12 text-center text-[#777d81]">Noch keine Audit-Einträge vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </PortalShell>
  );
}
