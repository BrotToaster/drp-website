import { deleteStaffFaqAction, saveStaffFaqAction } from "@/app/actions/portal-v4";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminStaffFaqPage() {
  const { authorization } = await requirePermission("staff_faq.manage");
  const categories = await prisma.staffFaqCategory.findMany({
    include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  const fields = (item?: (typeof categories)[number]["items"][number], categoryId?: string) => <>
    {item && <input type="hidden" name="id" value={item.id} />}
    <label className="field-label">Kategorie<select className="field" name="categoryId" defaultValue={item?.categoryId || categoryId} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
    <label className="field-label">Frage<input className="field" name="question" defaultValue={item?.question} required /></label>
    <label className="field-label">Antwort<textarea className="field min-h-36" name="answer" defaultValue={item?.answer} required /></label>
    <div className="grid gap-3 sm:grid-cols-[150px_1fr]"><label className="field-label">Sortierung<input className="field" type="number" min="0" name="sortOrder" defaultValue={item?.sortOrder || 0} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={item?.visible ?? true} /> Für Staff sichtbar</label></div>
    <SubmitButton variant="secondary">Speichern</SubmitButton>
  </>;

  return (
    <PortalShell authorization={authorization} title="Staff-FAQ verwalten" description="Interne Arbeitsgrundsätze pflegen, sortieren und gezielt ausblenden." section="admin">
      <details className="surface mb-6 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Neue interne Frage</summary><ReliableActionForm action={saveStaffFaqAction} resetOnSuccess className="mt-6 grid gap-4">{fields(undefined, categories[0]?.id)}</ReliableActionForm></details>
      <div className="grid gap-7">
        {categories.map((category) => <section key={category.id}>
          <div className="mb-3"><h2 className="text-lg font-semibold">{category.title}</h2><p className="text-xs text-[#777d81]">{category.items.length} Einträge</p></div>
          <div className="grid gap-3">{category.items.map((item) => <details key={item.id} className="surface p-5">
            <summary className="cursor-pointer list-none"><div className="flex justify-between gap-3"><div><p className="font-semibold">{item.question}</p><p className="mt-1 text-xs text-[#777d81]">Aktualisiert {formatDateTime(item.updatedAt)}</p></div><span className={"badge " + (item.visible ? "badge-gold" : "")}>{item.visible ? "Sichtbar" : "Versteckt"}</span></div></summary>
            <ReliableActionForm action={saveStaffFaqAction} className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5">{fields(item)}</ReliableActionForm>
            <ReliableActionForm action={deleteStaffFaqAction} className="mt-3"><input type="hidden" name="id" value={item.id} /><SubmitButton variant="danger" pendingText="Wird gelöscht …">Löschen</SubmitButton></ReliableActionForm>
          </details>)}</div>
        </section>)}
      </div>
    </PortalShell>
  );
}
