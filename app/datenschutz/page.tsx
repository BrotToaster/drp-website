import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = { title: "Datenschutz" };

export default function PrivacyPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Datenschutz" copy="Transparente Informationen zum Umgang mit deinen Daten." />
      <section className="section-space">
        <div className="container-shell max-w-3xl surface p-8 prose-copy">
          <h2 className="text-xl font-semibold text-white">Verarbeitete Daten</h2>
          <p className="mt-3">Bei der Anmeldung werden Discord-ID, Anzeigename, Profilbild und – sofern freigegeben – E-Mail-Adresse verarbeitet. Freiwillig können Roblox-Name und Roblox-ID hinterlegt werden.</p>
          <h2 className="mt-9 text-xl font-semibold text-white">Zweck</h2>
          <p className="mt-3">Die Daten dienen der Kontoverwaltung, Bearbeitung von Bewerbungen und Support-Tickets sowie der sicheren Administration des Servers.</p>
          <h2 className="mt-9 text-xl font-semibold text-white">Speicherung und Rechte</h2>
          <p className="mt-3">Daten werden nur so lange gespeichert, wie sie für den jeweiligen Zweck erforderlich sind. Anfragen zu Auskunft, Berichtigung oder Löschung können über ein Support-Ticket gestellt werden. Vor Veröffentlichung sind Verantwortliche, Hosting-Anbieter und konkrete Löschfristen zu ergänzen.</p>
        </div>
      </section>
    </>
  );
}
