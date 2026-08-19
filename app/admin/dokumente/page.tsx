import {
  importInternalDocumentPresetAction,
  importUploadedInternalDocumentAction,
  saveDocumentCategoryAccessAction,
  saveDocumentCategoryAction,
  saveInternalDocumentAccessAction,
} from "@/app/actions/documents";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { internalDocumentPresets } from "@/lib/internal-document-import";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function DocumentAdminPage() {
  const { authorization } = await requirePermission("documents.manage_categories");
  const [categories, roles, documents] = await Promise.all([
    prisma.internalDocumentCategory.findMany({ include: { roleAccess: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
    prisma.accessRole.findMany({ orderBy: { priority: "desc" } }),
    prisma.internalDocument.findMany({ include: { category: true, roleAccess: true, revisions: { select: { version: true }, orderBy: { version: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } }),
  ]);
  const assignableRoles = roles.filter((role) => role.key !== "OWNER");
  const fields = (category?: typeof categories[number]) => <>
    <input type="hidden" name="id" value={category?.id || ""} />
    <div className="grid gap-4 md:grid-cols-[1fr_1.5fr_110px]">
      <label className="field-label">Name<input className="field" name="title" defaultValue={category?.title} required /></label>
      <label className="field-label">Beschreibung<input className="field" name="description" defaultValue={category?.description || ""} /></label>
      <label className="field-label">Sortierung<input className="field" type="number" name="sortOrder" min="0" defaultValue={category?.sortOrder || 0} /></label>
    </div>
    <label className="choice-row"><input type="checkbox" name="visible" defaultChecked={category?.visible ?? true} /> Kategorie anzeigen</label>
    <SubmitButton variant="secondary">Kategorie speichern</SubmitButton>
  </>;

  return <PortalShell authorization={authorization} title="Dokumente & Zugriffe" description="Interne Quellen importieren, versionieren und bis auf Dokumentebene freigeben." section="admin">
    <section className="surface mb-6 overflow-hidden">
      <div className="border-b border-white/[0.07] p-6">
        <p className="eyebrow">Geschützter Import</p>
        <h2 className="mt-2 text-xl font-semibold">DRP-Unterlagen übernehmen</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#858b90]">Inhalte werden erst auf dem Server verarbeitet und ausschließlich in der Datenbank gespeichert. Neue Importe sind zunächst nur für Owner sichtbar.</p>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {internalDocumentPresets.map((preset) => {
          const existing = documents.find((document) => document.sourceExternalId === preset.externalId);
          const upload = preset.type === "UPLOAD_DOCX" || preset.type === "UPLOAD_XLSX";
          return <article key={preset.key} className="content-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="font-semibold">{preset.title}</h3><p className="mt-1 text-xs text-[#6f7579]">{upload ? "Dateiimport" : preset.type === "GOOGLE_DOCS" ? "Google Docs" : "Google Sheets"}</p></div>
              <span className={"badge " + (existing?.sourceImportStatus === "SUCCEEDED" ? "badge-success" : existing?.sourceImportStatus === "FAILED" ? "badge-danger" : "")}>{existing?.sourceImportStatus === "SUCCEEDED" ? "Importiert" : existing?.sourceImportStatus === "FAILED" ? "Fehler" : "Ausstehend"}</span>
            </div>
            {existing?.sourceImportedAt && <p className="mt-3 text-xs text-[#777d81]">Letzter Import: {formatDateTime(existing.sourceImportedAt)} · Version {existing.revisions[0]?.version || 0}</p>}
            {existing?.sourceImportError && <p className="mt-3 rounded-lg bg-[#ef6f6c]/10 p-3 text-xs text-[#f28d8a]">{existing.sourceImportError}</p>}
            <ReliableActionForm action={upload ? importUploadedInternalDocumentAction : importInternalDocumentPresetAction} className="mt-4 grid gap-3">
              <input type="hidden" name="presetKey" value={preset.key} />
              <label className="field-label">Kategorie<select className="field" name="categoryId" required>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
              {upload && <MediaUploader inputName="sourceMediaId" internal single documentsOnly label={preset.type === "UPLOAD_XLSX" ? "XLSX hochladen" : "DOCX hochladen"} />}
              <SubmitButton variant={existing ? "secondary" : "primary"} pendingText="Import läuft …">{existing ? "Erneut importieren" : "Importieren"}</SubmitButton>
            </ReliableActionForm>
          </article>;
        })}
      </div>
    </section>

    <details className="surface mb-6 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Kategorie hinzufügen</summary><ReliableActionForm action={saveDocumentCategoryAction} resetOnSuccess className="mt-6 grid gap-4">{fields()}</ReliableActionForm></details>
    <div className="grid gap-5">{categories.map((category) => <section key={category.id} className="surface p-6">
      <h2 className="text-lg font-semibold">{category.title}</h2>
      <ReliableActionForm action={saveDocumentCategoryAction} className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5">{fields(category)}</ReliableActionForm>
      <details className="mt-6 border-t border-white/[0.07] pt-5"><summary className="cursor-pointer text-sm font-semibold text-[#efc76e]">Kategoriezugriffe</summary><div className="mt-4 grid gap-3">{roles.map((role) => { const access = category.roleAccess.find((item) => item.roleId === role.id); return <ReliableActionForm key={role.id} action={saveDocumentCategoryAccessAction} className="grid gap-3 rounded-xl border border-white/[0.07] p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center"><input type="hidden" name="roleId" value={role.id} /><input type="hidden" name="categoryId" value={category.id} /><strong className="text-sm">{role.name}</strong><div className="flex flex-wrap gap-4 text-xs">{[["canView","Lesen"],["canCreate","Erstellen"],["canEdit","Bearbeiten"],["canManage","Verwalten"]].map(([name,label]) => <label key={name} className="choice-row"><input type="checkbox" name={name} defaultChecked={Boolean(access?.[name as keyof typeof access])} /> {label}</label>)}</div><SubmitButton variant="secondary" pendingText="Speichert …">Rechte speichern</SubmitButton></ReliableActionForm>; })}</div></details>
    </section>)}</div>

    <section className="surface mt-6 overflow-hidden">
      <div className="border-b border-white/[0.07] p-6"><p className="eyebrow">Einzelfreigaben</p><h2 className="mt-2 text-xl font-semibold">Dokumentzugriffe</h2><p className="mt-2 text-sm text-[#858b90]">„Kategorie“ erbt die Leserechte der Kategorie. „Eingeschränkt“ verlangt zusätzlich mindestens eine hier gesetzte Rolle; Owner hat immer Zugriff.</p></div>
      <div className="divide-y divide-white/[0.07]">{documents.map((document) => {
        const selected = new Set(document.roleAccess.filter((access) => access.canView).map((access) => access.roleId));
        return <ReliableActionForm key={document.id} action={saveInternalDocumentAccessAction} className="grid gap-4 p-5 xl:grid-cols-[minmax(220px,.8fr)_180px_1.4fr_auto] xl:items-center">
          <input type="hidden" name="documentId" value={document.id} />
          <div className="min-w-0"><p className="truncate font-semibold">{document.title}</p><p className="mt-1 text-xs text-[#6f7579]">{document.category.title} · Version {document.revisions[0]?.version || 0}</p></div>
          <label className="field-label">Zugriffsmodus<select className="field !min-h-10 !py-2" name="accessMode" defaultValue={document.accessMode}><option value="CATEGORY">Kategorie</option><option value="RESTRICTED">Eingeschränkt</option></select></label>
          <div className="flex flex-wrap gap-3">{assignableRoles.map((role) => <label key={role.id} className="choice-row"><input type="checkbox" name="roleIds" value={role.id} defaultChecked={selected.has(role.id)} /> {role.name}</label>)}</div>
          <SubmitButton variant="secondary">Freigabe speichern</SubmitButton>
        </ReliableActionForm>;
      })}{!documents.length && <p className="p-8 text-sm text-[#777d81]">Noch keine internen Dokumente vorhanden.</p>}</div>
    </section>
  </PortalShell>;
}
