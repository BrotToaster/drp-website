import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Impressum" copy="Angaben gemäß § 5 DDG." />
      <section className="section-space">
        <div className="container-shell max-w-3xl surface p-8 prose-copy">
          <h2 className="text-xl font-semibold text-white">DRP – Deutschland Roleplay</h2>
          <p className="mt-5">Projektleitung: Bitte vor Veröffentlichung ergänzen<br />Anschrift: Bitte vor Veröffentlichung ergänzen<br />E-Mail: kontakt@drp.example</p>
          <h2 className="mt-9 text-xl font-semibold text-white">Hinweis</h2>
          <p className="mt-3">Dieses Community-Projekt steht in keiner Verbindung zu Roblox Corporation oder Police Roleplay Community.</p>
        </div>
      </section>
    </>
  );
}
