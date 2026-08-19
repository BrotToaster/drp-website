import type { Metadata } from "next";
import Link from "next/link";
import { saveInternalDocumentAction } from "@/app/actions/documents";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { canAccessDocumentCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Interne Dokumente", robots: { index: false, follow: false } };

export default async function StaffDocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; archived?: string }> }) {
  const { authorization } = await requirePermission("documents.access");
  const query = await searchParams;
  const visibleIds = authorization.isOwner ? undefined : authorization.documentAccess.filter((item) => item.canView).map((item) => item.categoryId);
  const categories = await prisma.internalDocumentCategory.findMany({
    where: { ...(visibleIds ? { id: { in: visibleIds } } : {}), visible: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  const creatable = categories.filter((category) => canAccessDocumentCategory(authorization, category.id, "canCreate") || canAccessDocumentCategory(authorization, category.id, "canManage"));
  const q = (query.q || "").trim().toLocaleLowerCase("de");
  const documents = await prisma.internalDocument.findMany({
    where: {
      categoryId: { in: categories.map((category) => category.id) },
      ...(authorization.isOwner ? {} : { OR: [
        { accessMode: "CATEGORY" as const },
        { accessMode: "RESTRICTED" as const, roleAccess: { some: { roleId: { in: authorization.roleIds }, canView: true } } },
      ] }),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.archived === "1" ? { archivedAt: { not: null } } : { archivedAt: null }),
    },
    include: { category: true, revisions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  const filtered = documents.filter((document) => !q || document.title.toLocaleLowerCase("de").includes(q) || document.summary?.toLocaleLowerCase("de").includes(q) || document.revisions[0]?.searchText.includes(q));

  return (
    <PortalShell authorization={authorization} title="Interne Dokumente" description="Durchsuchbare Arbeitsunterlagen, Anleitungen und Dateien für das DRP-Team." section="staff">
      {creatable.length > 0 && <details className="surface mb-6 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Neues Dokument erstellen</summary>
        <ReliableActionForm action={saveInternalDocumentAction} resetOnSuccess className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2"><label className="field-label">Titel<input className="field" name="title" minLength={3} required /></label><label className="field-label">Kategorie<select className="field" name="categoryId" required>{creatable.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label></div>
          <label className="field-label">Kurzbeschreibung<textarea className="field min-h-20" name="summary" maxLength={500} /></label>
          <label className="field-label">Inhalt<RichTextEditor /></label>
          <div><p className="field-label mb-2">Geschützte Anhänge</p><MediaUploader internal /></div>
          <SubmitButton pendingText="Dokument wird erstellt …">Dokument erstellen</SubmitButton>
        </ReliableActionForm>
      </details>}

      <form action="/staff/dokumente" className="surface mb-6 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <label className="field-label">Suchen<input className="field" type="search" name="q" defaultValue={query.q} placeholder="Titel oder Inhalt" /></label>
        <label className="field-label">Kategorie<select className="field" name="category" defaultValue={query.category || ""}><option value="">Alle Kategorien</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.title}</option>)}</select></label>
        <button className="button button-secondary self-end" type="submit">Filtern</button>
      </form>
      <div className="mb-4 flex gap-2 text-xs"><Link className={!query.archived ? "badge badge-gold" : "badge"} href="/staff/dokumente">Aktiv</Link><Link className={query.archived === "1" ? "badge badge-gold" : "badge"} href="/staff/dokumente?archived=1">Archiv</Link></div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((document) => <Link key={document.id} href={`/staff/dokumente/${document.slug}`} className="surface surface-interactive min-w-0 p-6"><div className="flex items-center justify-between gap-3"><span className="badge badge-gold">{document.category.title}</span><span className="text-xs text-[#6f7579]">Version {document.revisions[0]?.version || 0}</span></div><h2 className="mt-5 break-words text-xl font-semibold">{document.title}</h2><p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[#8d9397]">{document.summary || "Keine Kurzbeschreibung vorhanden."}</p><p className="mt-5 text-xs text-[#656b70]">Aktualisiert {formatDateTime(document.updatedAt)}</p></Link>)}
        {!filtered.length && <div className="surface p-8 text-sm text-[#8d9397] md:col-span-2">Keine passenden Dokumente gefunden.</div>}
      </div>
    </PortalShell>
  );
}
