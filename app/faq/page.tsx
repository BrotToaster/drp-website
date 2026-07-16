import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = { title: "FAQ" };

const questions = [
  ["Wie kann ich dem Server beitreten?", "Tritt zuerst unserem Discord bei, lies das Regelwerk und verbinde anschließend deinen Roblox-Namen im Dashboard."],
  ["Benötige ich eine Whitelist?", "Je nach aktueller Serverphase kann eine kurze Bewerbung erforderlich sein. Den Status siehst du direkt in deinem Dashboard."],
  ["Wo kann ich einen Spieler melden?", "Erstelle im Dashboard ein Ticket der Kategorie „Spielermeldung“ und füge alle verfügbaren Beweise hinzu."],
  ["Wie kann ich gegen eine Sanktion Einspruch einlegen?", "Nutze ein Ticket der Kategorie „Entbannungsantrag“. Ein unbeteiligtes Staff-Mitglied prüft den Vorgang."],
  ["Kann ich mich als Staff bewerben?", "Offene Staff- und Fraktionsbewerbungen werden über News und Discord angekündigt."],
];

export default function FaqPage() {
  return (
    <>
      <PageIntro eyebrow="Häufige Fragen" title="Schnell zur richtigen Antwort." copy="Alles Wichtige rund um Einstieg, Support und das gemeinsame Roleplay." />
      <section className="section-space">
        <div className="container-shell max-w-4xl space-y-3">
          {questions.map(([question, answer], index) => (
            <details key={question} className="surface group p-6">
              <summary className="flex cursor-pointer list-none items-center gap-5 font-semibold">
                <span className="text-xs text-[#efc76e]">0{index + 1}</span>
                <span>{question}</span>
                <span className="ml-auto text-[#686e72] transition group-open:rotate-45">+</span>
              </summary>
              <p className="ml-9 mt-5 max-w-2xl text-sm leading-7 text-[#92989c]">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
