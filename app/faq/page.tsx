import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = { title: "FAQ" };

const items = [
  ["Wie komme ich auf den Server?", "Tritt unserem Discord bei, verbinde Discord und Roblox und bestätige anschließend das aktuelle Regelwerk im Dashboard."],
  ["Wie erreiche ich den Support?", "Erstelle im Dashboard ein Ticket als „Technischer Support“ oder „Kontaktaufnahme“. Dort siehst du jederzeit den Bearbeitungsstand."],
  ["Warum muss ich Discord und Roblox verbinden?", "Die Verknüpfung ordnet deine Community- und Spielidentität eindeutig zu, ohne dass DRP deine Passwörter erhält."],
  ["Wo sehe ich Regeländerungen?", "Jede Regel zeigt ihre Version und letzte Bearbeitung. Nach einer neuen Veröffentlichung ist eine erneute Bestätigung erforderlich."],
];

export default function FaqPage() {
  return (
    <>
      <PageIntro eyebrow="Hilfe" title="Häufige Fragen." copy="Die wichtigsten Antworten rund um deinen Einstieg bei DRP." />
      <section className="section-space">
        <div className="container-shell grid max-w-4xl gap-3">
          {items.map(([question, answer]) => (
            <details key={question} className="surface group p-6">
              <summary className="cursor-pointer list-none font-semibold">{question}</summary>
              <p className="mt-4 text-sm leading-7 text-[#9da3a8]">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}