import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { archiveInternalDocumentAction, restoreDocumentRevisionAction, saveInternalDocumentAction } from "@/app/actions/documents";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { RichContent } from "@/components/rich-content";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { contentNodeSchema, emptyContent } from "@/lib/content";
import { canAccessDocumentCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Internes Dokument", robots: { index: false, follow: false } };

export default async function InternalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { authorization } = await requirePermission("documents.access");
  const { slug } = await params;
  const document = await prisma.internalDocument.findUnique({
    where: { slug },
    include: { category: true, revisions: { include: { editor: { select: { name: true } }, media: { include: { media: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { version: "desc" } } },
  });
  if (!document || !canAccessDocumentCategory(authorization, document.categoryId, "canView")) notFound();
  const latest = document.revisions[0];
  if (!latest) notFound();
  const parsed = contentNodeSchema.safeParse(latest.content);
  const content = parsed.success ? parsed.data : emptyContent;
  const canEdit = canAccessDocumentCategory(authorization, document.categoryId, "canEdit") || canAccessDocumentCategory(authorization, document.categoryId, "canManage");
  const canManage = canAccessDocumentCategory(authorization, document.categoryId, "canManage");
  const categories = canEdit ? await prisma.internalDocumentCategory.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }) : [];
  const assets = latest.media.map((item) => ({ id: item.media.id, url: `/api/media/internal/${item.media.id}`, kind: item.media.kind, name: item.media.originalName, caption: item.caption }));

  return <PortalShell authorization={authorization} title={document.title} description={`${document.category.title} · Version ${latest.version} · ${formatDateTime(latest.createdAt)}`} section="staff">
    {document.archivedAt && <p className="mb-5 rounded-xl bg-[#efc76e]/10 p-4 text-sm text-[#efc76e]">Dieses Dokument ist archiviert.</p>}
    <article className="surface p-6 md:p-8"><RichContent content={content} />
      {assets.length > 0 && <section className="mt-10 border-t border-white/[0.07] pt-6"><h2 className="text-lg font-semibold">Geschützte Anhänge</h2><div className="mt-4 grid gap-3">{assets.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/[0.08] p-4 hover:border-[#d6aa4c]/35"><span><strong className="text-sm">{asset.caption || asset.name}</strong><span className="ml-2 text-xs text-[#777d81]">{asset.kind}</span></span><span className="text-[#efc76e]">Öffnen ↗</span></a>)}</div></section>}
    </article>

    {canEdit && <details className="surface mt-6 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Dokument bearbeiten</summary><ReliableActionForm action={saveInternalDocumentAction} className="mt-6 grid gap-4"><input type="hidden" name="id" value={document.id} /><div className="grid gap-4 md:grid-cols-2"><label className="field-label">Titel<input className="field" name="title" defaultValue={document.title} required /></label><label className="field-label">Kategorie<select className="field" name="categoryId" defaultValue={document.categoryId}>{categories.filter((category) => canAccessDocumentCategory(authorization, category.id, "canCreate") || category.id === document.categoryId || canAccessDocumentCategory(authorization, category.id, "canManage")).map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label></div><label className="field-label">Kurzbeschreibung<textarea className="field min-h-20" name="summary" defaultValue={document.summary || ""} /></label><label className="field-label">Inhalt<RichTextEditor initialContent={content} /></label><MediaUploader internal initialAssets={assets} /><SubmitButton pendingText="Neue Version wird gespeichert …">Neue Version speichern</SubmitButton></ReliableActionForm></details>}

    <details className="surface mt-6 p-6"><summary className="cursor-pointer font-semibold">Versionsverlauf</summary><div className="mt-5 grid gap-3">{document.revisions.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] p-4"><div><p className="text-sm font-semibold">Version {revision.version}</p><p className="mt-1 text-xs text-[#777d81]">{formatDateTime(revision.createdAt)} · {revision.editor?.name || "System"}</p></div>{canEdit && revision.id !== latest.id && <ReliableActionForm action={restoreDocumentRevisionAction}><input type="hidden" name="revisionId" value={revision.id} /><SubmitButton variant="secondary" pendingText="Wird wiederhergestellt …">Wiederherstellen</SubmitButton></ReliableActionForm>}</div>)}</div></details>

    {canManage && <ReliableActionForm action={archiveInternalDocumentAction} className="mt-6"><input type="hidden" name="id" value={document.id} /><input type="hidden" name="archived" value={document.archivedAt ? "false" : "true"} />{document.archivedAt ? <SubmitButton variant="secondary">Dokument wiederherstellen</SubmitButton> : <ConfirmSubmitButton message="Dieses Dokument archivieren?">Dokument archivieren</ConfirmSubmitButton>}</ReliableActionForm>}
  </PortalShell>;
}
