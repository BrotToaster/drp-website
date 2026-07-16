import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function BotDataPage() {
  const user = await requireRole("ADMIN");
  const [records, events] = await Promise.all([
    prisma.botRecord.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.botEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 100 }),
  ]);
  return (
    <PortalShell
      role={user.role}
      title="Discord-Bot-Daten"
      description="Vom Bot synchronisierte Datensätze und Ereignisse in der gemeinsamen Datenbank."
      staff
    >
      <section className="surface overflow-hidden">
        <div className="border-b border-white/[0.07] p-6">
          <h2 className="text-xl font-semibold">Aktuelle Datensätze</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Namespace</th><th>Schlüssel</th><th>Daten</th><th>Aktualisiert</th></tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.namespace}</td>
                  <td className="font-semibold">{record.key}</td>
                  <td className="max-w-80 truncate text-[#858b90]">{JSON.stringify(record.data)}</td>
                  <td>{formatDateTime(record.updatedAt)}</td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={4} className="py-10 text-center text-[#777d81]">Noch keine Bot-Daten vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="surface mt-5 overflow-hidden">
        <div className="border-b border-white/[0.07] p-6">
          <h2 className="text-xl font-semibold">Letzte Ereignisse</h2>
        </div>
        <div className="divide-y divide-white/[0.07]">
          {events.map((event) => (
            <div key={event.id} className="p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <strong className="text-sm">{event.type}</strong>
                <time className="text-xs text-[#777d81]">{formatDateTime(event.occurredAt)}</time>
              </div>
              <p className="mt-2 truncate text-xs text-[#858b90]">{JSON.stringify(event.data)}</p>
            </div>
          ))}
          {!events.length && <p className="p-10 text-center text-sm text-[#777d81]">Noch keine Bot-Ereignisse vorhanden.</p>}
        </div>
      </section>
    </PortalShell>
  );
}
