import { saveDocumentCategoryAccessAction, saveDocumentCategoryAction } from "@/app/actions/documents";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DocumentAdminPage() {
  const { authorization } = await requirePermission("documents.manage_categories");
  const [categories, roles] = await Promise.all([
    prisma.internalDocumentCategory.findMany({ include: { roleAccess: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
    prisma.accessRole.findMany({ orderBy: { priority: "desc" } }),
  ]);
  const fields = (category?: typeof categories[number]) => <><input type="hidden" name="id" value={category?.id || ""} /><div className="grid gap-4 md:grid-cols-[1fr_1.5fr_110px]"><label className="field-label">Name<input className="field" name="title" defaultValue={category?.title} required /></label><label className="field-label">Beschreibung<input className="field" name="description" defaultValue={category?.description || ""} /></label><label className="field-label">Sortierung<input className="field" type="number" name="sortOrder" min="0" defaultValue={category?.sortOrder || 0} /></label></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={category?.visible ?? true} /> Kategorie anzeigen</label><SubmitButton variant="secondary">Kategorie speichern</SubmitButton></>;
  return <PortalShell authorization={authorization} title="Dokumente & Zugriffe" description="Interne Dokumentkategorien und rollenbasierte Rechte verwalten." section="admin">
    <details className="surface mb-6 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Kategorie hinzufügen</summary><ReliableActionForm action={saveDocumentCategoryAction} resetOnSuccess className="mt-6 grid gap-4">{fields()}</ReliableActionForm></details>
    <div className="grid gap-5">{categories.map((category) => <section key={category.id} className="surface p-6"><h2 className="text-lg font-semibold">{category.title}</h2><ReliableActionForm action={saveDocumentCategoryAction} className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5">{fields(category)}</ReliableActionForm><div className="mt-6 border-t border-white/[0.07] pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-[#777d81]">Rollenzugriffe</p><div className="grid gap-3">{roles.map((role) => { const access = category.roleAccess.find((item) => item.roleId === role.id); return <ReliableActionForm key={role.id} action={saveDocumentCategoryAccessAction} className="grid gap-3 rounded-xl border border-white/[0.07] p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center"><input type="hidden" name="roleId" value={role.id} /><input type="hidden" name="categoryId" value={category.id} /><strong className="text-sm">{role.name}</strong><div className="flex flex-wrap gap-4 text-xs">{[["canView","Lesen"],["canCreate","Erstellen"],["canEdit","Bearbeiten"],["canManage","Verwalten"]].map(([name,label]) => <label key={name} className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={Boolean(access?.[name as keyof typeof access])} /> {label}</label>)}</div><SubmitButton variant="secondary" pendingText="Speichert …">Rechte speichern</SubmitButton></ReliableActionForm>; })}</div></div></section>)}</div>
  </PortalShell>;
}
