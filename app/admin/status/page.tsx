import {
  deleteStatusServiceAction,
  saveStatusServiceAction,
  updateManualStatusAction,
} from "@/app/actions/admin-content";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { statusColor, statusLabels } from "@/lib/service-status";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

const statusValues = ["OPERATIONAL", "DEGRADED", "PARTIAL_OUTAGE", "MAJOR_OUTAGE", "MAINTENANCE", "UNKNOWN"] as const;

export default async function StatusAdminPage() {
  const { authorization } = await requirePermission("status.manage");
  const services = await prisma.statusService.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { updates: { orderBy: { createdAt: "desc" }, take: 3 } },
  });

  const serviceFields = (service?: typeof services[number]) => (
    <>
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-4 md:grid-cols-[1fr_1.5fr_110px]">
        <label className="field-label">Name<input className="field" name="name" defaultValue={service?.name} required /></label>
        <label className="field-label">Beschreibung<input className="field" name="description" defaultValue={service?.description || ""} /></label>
        <label className="field-label">Sortierung<input className="field" type="number" min="0" name="sortOrder" defaultValue={service?.sortOrder || 0} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={service?.enabled ?? true} /> Öffentlich anzeigen</label>
      <SubmitButton variant="secondary">Dienst speichern</SubmitButton>
    </>
  );

  return (
    <PortalShell authorization={authorization} title="Status" description="Automatische Dienste schalten und eigene Statusobjekte mit öffentlichen Meldungen verwalten." section="admin">
      <details className="surface mb-5 p-6">
        <summary className="cursor-pointer font-semibold text-[#efc76e]">Manuellen Dienst hinzufügen</summary>
        <ReliableActionForm action={saveStatusServiceAction} resetOnSuccess className="mt-6 grid gap-4">{serviceFields()}</ReliableActionForm>
      </details>
      <div className="grid gap-4">
        {services.map((service) => (
          <details key={service.id} className="surface p-6">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs uppercase tracking-[0.12em] text-[#777d81]">{service.source}</p><h2 className="mt-2 text-lg font-semibold">{service.name}</h2><p className="mt-1 text-xs text-[#686e72]">{service.lastCheckedAt ? "Zuletzt geprüft " + formatDateTime(service.lastCheckedAt) : "Noch nicht geprüft"}</p></div>
                <span className={"rounded-full border px-3 py-1 text-xs font-semibold " + statusColor(service.source === "MANUAL" ? service.manualStatus : service.lastStatus)}>{statusLabels[service.source === "MANUAL" ? service.manualStatus : service.lastStatus]}</span>
              </div>
            </summary>
            <div className="mt-6 grid gap-5 border-t border-white/[0.07] pt-6">
              <ReliableActionForm action={saveStatusServiceAction} className="grid gap-4">{serviceFields(service)}</ReliableActionForm>
              {service.source === "MANUAL" && (
                <ReliableActionForm action={updateManualStatusAction} resetOnSuccess className="grid gap-4 rounded-xl border border-white/[0.07] p-4">
                  <input type="hidden" name="serviceId" value={service.id} />
                  <h3 className="font-semibold">Statusmeldung veröffentlichen</h3>
                  <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <label className="field-label">Status<select className="field" name="status" defaultValue={service.manualStatus}>{statusValues.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
                    <label className="field-label">Nachricht<textarea className="field min-h-24" name="message" placeholder="Bei einer Störung oder Wartung verpflichtend" /></label>
                  </div>
                  <SubmitButton>Status veröffentlichen</SubmitButton>
                </ReliableActionForm>
              )}
              {service.source === "MANUAL" && (
                <ReliableActionForm action={deleteStatusServiceAction}>
                  <input type="hidden" name="id" value={service.id} />
                  <ConfirmSubmitButton message="Diesen manuellen Dienst und alle Statusmeldungen löschen?">Dienst löschen</ConfirmSubmitButton>
                </ReliableActionForm>
              )}
              {service.updates.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#777d81]">Letzte Meldungen</p><div className="grid gap-2">{service.updates.map((update) => <div key={update.id} className="rounded-xl bg-white/[0.025] p-3 text-xs text-[#8d9397]">{formatDateTime(update.createdAt)} · {statusLabels[update.status]}{update.message ? " · " + update.message : ""}</div>)}</div></div>}
            </div>
          </details>
        ))}
      </div>
    </PortalShell>
  );
}
