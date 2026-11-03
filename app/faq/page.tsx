import { publicMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const metadata = publicMetadata("Häufige Fragen", "Antworten zu Servereinstieg, Konten, Regelwerk und Kontaktmöglichkeiten bei DRP.", "/faq");
export const dynamic = "force-dynamic";

export default async function FaqPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const query = await searchParams;
  const q = (query.q || "").trim();
  const items = await prisma.faqItem.findMany({
    where: {
      visible: true,
      ...(query.category ? { category: query.category } : {}),
      ...(q ? { OR: [{ question: { contains: q, mode: "insensitive" } }, { answer: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const allCategories = await prisma.faqItem.findMany({ where: { visible: true }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } });
  const groups = Array.from(new Set(items.map((item) => item.category))).map((category) => ({ category, items: items.filter((item) => item.category === category) }));

  return (
    <>
      <PageIntro eyebrow="Hilfe" title="Häufige Fragen." copy="Schnelle Antworten zu Einstieg, Konten, Regelwerk, Support und Serverbetrieb." />
      <section className="section-space pt-0">
        <div className="container-shell max-w-4xl">
          <form className="surface mb-8 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]" action="/faq">
            <label className="field-label">Suchen<input className="field" type="search" name="q" defaultValue={query.q} placeholder="Wonach suchst du?" /></label>
            <label className="field-label">Kategorie<select className="field" name="category" defaultValue={query.category || ""}><option value="">Alle Kategorien</option>{allCategories.map((item) => <option key={item.category} value={item.category}>{item.category}</option>)}</select></label>
            <button className="button button-primary self-end" type="submit">Suchen</button>
          </form>
          <div className="grid gap-8">{groups.map((group) => <section key={group.category}><p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent-ink)]">{group.category}</p><div className="grid gap-3">{group.items.map((item) => <details key={item.id} className="surface group p-6"><summary className="cursor-pointer list-none font-semibold">{item.question}</summary><p className="mt-4 whitespace-pre-wrap border-t border-[var(--line)] pt-4 text-sm leading-7 text-[var(--muted)]">{item.answer}</p></details>)}</div></section>)}{!items.length && <div className="surface p-8 text-center text-sm text-[var(--muted)]">Keine passende Antwort gefunden. Erstelle bei Bedarf ein Ticket.</div>}</div>
        </div>
      </section>
    </>
  );
}
