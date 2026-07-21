import { deleteFaqAction, saveFaqAction } from "@/app/actions/management";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function StaffFaqPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { authorization } = await requirePermission("faq.view");
  const query = await searchParams;
  const canManage = hasPermission(authorization, "faq.manage");
  const items = await prisma.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  const fields = (item?: typeof items[number]) => (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="field-label">Kategorie<input className="field" name="category" defaultValue={item?.category || "Allgemein"} required /></label>
      <label className="field-label">Frage<input className="field" name="question" defaultValue={item?.question} required /></label>
      <label className="field-label">Antwort<textarea className="field min-h-32" name="answer" defaultValue={item?.answer} required /></label>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="field-label">Sortierung<input className="field" type="number" min="0" name="sortOrder" defaultValue={item?.sortOrder || 0} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={item?.visible ?? true} /> Öffentlich sichtbar</label>
      </div>
      <SubmitButton variant="secondary">Speichern</SubmitButton>
    </>
  );

  return (
    <PortalShell authorization={authorization} title="FAQ" description="Häufige Fragen erstellen, sortieren und veröffentlichen." section="staff">
      {(query.error || query.saved) && <p className={"mb-5 rounded-xl p-4 text-sm " + (query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]")}>{query.error ? "FAQ konnte nicht gespeichert werden." : "FAQ wurde gespeichert."}</p>}
      {canManage && <details className="surface mb-5 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Neue Frage hinzufügen</summary><form action={saveFaqAction} className="mt-6 grid gap-4">{fields()}</form></details>}
      <div className="grid gap-4">
        {items.map((item) => (
          <details key={item.id} className="surface p-6">
            <summary className="cursor-pointer list-none"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">{item.question}</h2><p className="mt-2 text-xs text-[#777d81]">Aktualisiert {formatDateTime(item.updatedAt)}</p></div><span className={"badge " + (item.visible ? "badge-gold" : "")}>{item.visible ? "Sichtbar" : "Versteckt"}</span></div></summary>
            {canManage && <><form action={saveFaqAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6">{fields(item)}</form><form action={deleteFaqAction} className="mt-3"><input type="hidden" name="id" value={item.id} /><ConfirmSubmitButton message="Diese FAQ wirklich löschen?">Löschen</ConfirmSubmitButton></form></>}
          </details>
        ))}
      </div>
    </PortalShell>
  );
}
