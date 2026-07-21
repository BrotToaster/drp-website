import type { Metadata } from "next";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff-FAQ", robots: { index: false, follow: false } };

export default async function StaffHandbookPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { authorization } = await requirePermission("staff_faq.view");
  const query = await searchParams;
  const q = (query.q || "").trim().toLocaleLowerCase("de");
  const categories = await prisma.staffFaqCategory.findMany({
    where: { visible: true },
    include: { items: { where: { visible: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  const visible = categories.map((category) => ({
    ...category,
    items: category.items.filter((item) =>
      (!q || item.searchText.includes(q)) && (!query.category || category.slug === query.category),
    ),
  })).filter((category) => category.items.length);

  return (
    <PortalShell authorization={authorization} title="Staff-FAQ" description="Interne Antworten und verbindliche Arbeitsgrundsätze für das DRP-Team." section="staff">
      <form className="surface mb-6 grid gap-3 p-4 md:grid-cols-[1fr_230px_auto]" action="/staff/handbuch">
        <label className="field-label">Suchen<input className="field" type="search" name="q" defaultValue={query.q} placeholder="z. B. Ticket, Strike oder Abwesenheit" /></label>
        <label className="field-label">Bereich<select className="field" name="category" defaultValue={query.category || ""}><option value="">Alle Bereiche</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.title}</option>)}</select></label>
        <button className="button button-primary self-end" type="submit">Filtern</button>
      </form>
      <div className="grid gap-7">
        {visible.map((category) => (
          <section key={category.id}>
            <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#efc76e]">{category.title}</p>{category.description && <p className="mt-1 text-sm text-[#777d81]">{category.description}</p>}</div>
            <div className="grid gap-3">
              {category.items.map((item) => <details key={item.id} className="surface group p-5"><summary className="cursor-pointer list-none pr-6 font-semibold">{item.question}</summary><p className="mt-4 whitespace-pre-wrap border-t border-white/[0.07] pt-4 text-sm leading-7 text-[#a8adb0]">{item.answer}</p></details>)}
            </div>
          </section>
        ))}
        {!visible.length && <div className="surface p-8 text-center text-sm text-[#8d9397]">Keine passende interne Antwort gefunden.</div>}
      </div>
    </PortalShell>
  );
}
