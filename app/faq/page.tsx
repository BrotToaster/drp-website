import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

const fallbackItems = [
  ["Wie komme ich auf den Server?", "Tritt unserem Discord bei, verbinde Discord und Roblox und bestätige anschließend das aktuelle Regelwerk im Dashboard."],
  ["Wie erreiche ich den Support?", "Erstelle im Dashboard ein Ticket als „Technischer Support“ oder „Kontaktaufnahme“. Dort siehst du jederzeit den Bearbeitungsstand."],
  ["Warum muss ich Discord und Roblox verbinden?", "Die Verknüpfung ordnet deine Community- und Spielidentität eindeutig zu, ohne dass DRP deine Passwörter erhält."],
  ["Wo sehe ich Regeländerungen?", "Nach einer neuen Veröffentlichung ist eine erneute Bestätigung erforderlich."],
];

export default async function FaqPage() {
  const items = await prisma.faqItem.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })
    .catch(() => fallbackItems.map(([question, answer], index) => ({ id: String(index), question, answer })));
  return (
    <>
      <PageIntro eyebrow="Hilfe" title="Häufige Fragen." copy="Die wichtigsten Antworten rund um deinen Einstieg bei DRP." />
      <section className="section-space">
        <div className="container-shell grid max-w-4xl gap-3">
          {items.map((item) => (
            <details key={item.id} className="surface group p-6">
              <summary className="cursor-pointer list-none font-semibold">{item.question}</summary>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#9da3a8]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
