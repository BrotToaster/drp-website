import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/ui";
import { getLegalSettings } from "@/lib/legal-settings";

export const metadata: Metadata = { title: "Impressum" };
export const dynamic = "force-dynamic";

export default async function ImprintPage() {
  const legal = await getLegalSettings();
  if (!legal.imprintEnabled) notFound();
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Impressum." copy="Angaben zum verantwortlichen Betreiber des DRP-Portals." />
      <section className="section-space pt-12">
        <div className="container-shell max-w-3xl">
          <div className="surface grid gap-8 p-7 md:p-10">
            <section><h2 className="text-lg font-semibold">Verantwortlicher Betreiber</h2><address className="mt-3 not-italic text-sm leading-7 text-[#9da3a8]">{legal.operatorName || "Betreiberangaben werden ergänzt"}<br />{legal.addressLine}<br />{legal.postalCode} {legal.city}<br />{legal.country}</address></section>
            <section><h2 className="text-lg font-semibold">Kontakt</h2><p className="mt-3 text-sm text-[#9da3a8]">{legal.contactEmail ? <a className="text-[#efc76e]" href={"mailto:" + legal.contactEmail}>{legal.contactEmail}</a> : "Kontaktangabe wird ergänzt"}</p></section>
            <section><h2 className="text-lg font-semibold">Projekt und Spenden</h2><p className="mt-3 text-sm leading-7 text-[#9da3a8]">DRP ist ein Community-Projekt und nicht mit Roblox, Discord oder Police Roleplay Community verbunden. {legal.donations === "VOLUNTARY" ? "Das Projekt kann freiwillige Spenden erhalten; auf dieser Website werden keine Zahlungsdienste oder Spendenlinks angeboten." : "Auf dieser Website werden keine Zahlungen oder Spenden angeboten."}</p></section>
          </div>
        </div>
      </section>
    </>
  );
}
