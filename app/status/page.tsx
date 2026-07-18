import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";
import { getPortalStatus, statusColor, statusLabels } from "@/lib/service-status";
import { formatDateTime } from "@/lib/site";

export const metadata: Metadata = { title: "Status" };
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const status = await getPortalStatus();
  return (
    <>
      <PageIntro eyebrow="Systemstatus" title="DRP auf einen Blick." copy="Automatische Plattformprüfungen und öffentliche Meldungen des DRP-Teams." />
      <section className="section-space pt-12">
        <div className="container-shell">
          <div className={"mb-7 rounded-2xl border p-6 " + statusColor(status.overall)}>
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Gesamtzustand</p>
            <h2 className="mt-2 text-2xl font-semibold">{statusLabels[status.overall]}</h2>
            <p className="mt-2 text-xs opacity-75">Letzte Zusammenstellung: {formatDateTime(status.checkedAt)}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {status.services.map((service) => (
              <article key={service.id} className="surface p-6">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.12em] text-[#777d81]">{service.source === "MANUAL" ? "DRP Dienst" : "Automatisch"}</p><h2 className="mt-2 text-xl font-semibold">{service.name}</h2></div><span className={"rounded-full border px-3 py-1 text-xs font-semibold " + statusColor(service.status)}>{statusLabels[service.status]}</span></div>
                {service.description && <p className="mt-4 text-sm leading-6 text-[#8d9397]">{service.description}</p>}
                {service.message && <p className="mt-4 rounded-xl bg-white/[0.035] p-3 text-sm text-[#b4b8bb]">{service.message}</p>}
                <p className="mt-5 text-xs text-[#656b70]">{service.checkedAt ? "Geprüft " + formatDateTime(service.checkedAt) : "Noch nicht geprüft"}</p>
              </article>
            ))}
          </div>
          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Statusmeldungen</h2>
            <div className="mt-5 grid gap-3">
              {status.updates.map((update) => (
                <article key={update.id} className="surface flex flex-wrap gap-4 p-5">
                  <span className={"h-fit rounded-full border px-3 py-1 text-xs font-semibold " + statusColor(update.status)}>{statusLabels[update.status]}</span>
                  <div className="min-w-[220px] flex-1"><h3 className="font-semibold">{update.serviceName}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#8d9397]">{update.message || "Status wurde aktualisiert."}</p></div>
                  <time className="text-xs text-[#686e72]">{formatDateTime(update.createdAt)}</time>
                </article>
              ))}
              {!status.updates.length && <p className="surface p-7 text-sm text-[#777d81]">Aktuell gibt es keine öffentlichen Statusmeldungen.</p>}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
