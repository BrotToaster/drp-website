import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    action?: string;
    entity?: string;
    actor?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { authorization } = await requirePermission("audit.view");
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = 40;
  const createdAt = {
    ...(query.from ? { gte: new Date(query.from + "T00:00:00") } : {}),
    ...(query.to ? { lte: new Date(query.to + "T23:59:59.999") } : {}),
  };
  const where = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.entity ? { entityType: query.entity } : {}),
    ...(query.actor ? { actorId: query.actor } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q, mode: "insensitive" as const } },
            { entityType: { contains: query.q, mode: "insensitive" as const } },
            { entityId: { contains: query.q, mode: "insensitive" as const } },
            { actor: { name: { contains: query.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [logs, total, actions, entities, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
    prisma.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PortalShell
      authorization={authorization}
      title="Audit-Log"
      description="Unveränderliche Historie aller privilegierten Verwaltungsaktionen."
      section="staff"
    >
      <section className="surface overflow-hidden">
        <form className="grid gap-3 border-b border-white/[0.07] p-5 md:grid-cols-3 xl:grid-cols-6">
          <input className="field xl:col-span-2" name="q" defaultValue={query.q || ""} placeholder="Volltextsuche" />
          <select className="field" name="action" defaultValue={query.action || ""}>
            <option value="">Alle Aktionen</option>
            {actions.map((item) => <option key={item.action}>{item.action}</option>)}
          </select>
          <select className="field" name="entity" defaultValue={query.entity || ""}>
            <option value="">Alle Objekte</option>
            {entities.map((item) => <option key={item.entityType}>{item.entityType}</option>)}
          </select>
          <select className="field" name="actor" defaultValue={query.actor || ""}>
            <option value="">Alle Akteure</option>
            {actors.map((actor) => <option value={actor.id} key={actor.id}>{actor.name}</option>)}
          </select>
          <button className="button button-secondary">Filtern</button>
          <label className="field-label">Von<input className="field" type="date" name="from" defaultValue={query.from || ""} /></label>
          <label className="field-label">Bis<input className="field" type="date" name="to" defaultValue={query.to || ""} /></label>
        </form>
        <div className="divide-y divide-white/[0.07]">
          {logs.map((log) => (
            <details key={log.id} className="group p-5">
              <summary className="grid cursor-pointer list-none gap-2 md:grid-cols-[180px_1fr_1fr_1fr]">
                <time className="text-xs text-[#858b90]">{formatDateTime(log.createdAt)}</time>
                <strong className="text-sm">{log.actor?.name || "System"}</strong>
                <span className="text-sm">{log.action}</span>
                <span className="truncate text-sm text-[#777d81]">{log.entityType}{log.entityId ? " · " + log.entityId : ""}</span>
              </summary>
              <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-black/25 p-4 text-xs text-[#aeb2b5]">
                {log.metadata ? JSON.stringify(log.metadata, null, 2) : "Keine Metadaten"}
              </pre>
            </details>
          ))}
          {!logs.length && <p className="p-12 text-center text-sm text-[#777d81]">Keine passenden Audit-Einträge.</p>}
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.07] p-5 text-sm">
          <span>{total} Einträge</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="button button-secondary !min-h-9" href={{ query: { ...query, page: page - 1 } }}>Zurück</Link>}
            {page * pageSize < total && <Link className="button button-secondary !min-h-9" href={{ query: { ...query, page: page + 1 } }}>Weiter</Link>}
          </div>
        </div>
      </section>
    </PortalShell>
  );
}