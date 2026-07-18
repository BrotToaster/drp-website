import { deleteRuleAction, saveRuleAction, withdrawRuleAction } from "@/app/actions/staff";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { contentNodeSchema, emptyContent } from "@/lib/content";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function StaffRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { authorization } = await requirePermission("rules.view");
  const query = await searchParams;
  const rules = await prisma.rule.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }],
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          editor: { select: { name: true } },
          media: { orderBy: { sortOrder: "asc" }, include: { media: true } },
        },
      },
    },
  });
  const canCreate = hasPermission(authorization, "rules.create");
  const canEdit = hasPermission(authorization, "rules.edit");
  const canPublish = hasPermission(authorization, "rules.publish");
  const canDelete = hasPermission(authorization, "rules.delete");

  return (
    <PortalShell
      authorization={authorization}
      title="Regelwerk"
      description="Versionierte Regeln als Entwurf speichern, bearbeiten, veröffentlichen oder zurückziehen."
      section="staff"
    >
      {(query.error || query.saved) && (
        <p role={query.error ? "alert" : "status"} className={"mb-5 rounded-xl p-4 text-sm " + (query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]")}>
          {query.error ? "Die Regel konnte nicht gespeichert werden." : "Die Regel wurde gespeichert."}
        </p>
      )}

      {canCreate && (
        <details className="surface mb-5 p-6">
          <summary className="cursor-pointer font-semibold text-[#efc76e]">Neue Regel erstellen</summary>
          <form action={saveRuleAction} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-[1fr_240px_120px]">
              <label className="field-label">Titel<input className="field" name="title" required /></label>
              <label className="field-label">Kategorie<input className="field" name="category" required /></label>
              <label className="field-label">Sortierung<input className="field" name="order" type="number" min="0" defaultValue={rules.length + 1} /></label>
            </div>
            <RichTextEditor initialContent={emptyContent} />
            <MediaUploader />
            <div className="flex flex-wrap gap-2">
              <SubmitButton variant="secondary" name="intent" value="draft">Entwurf speichern</SubmitButton>
              {canPublish && <SubmitButton name="intent" value="publish">Veröffentlichen</SubmitButton>}
            </div>
          </form>
        </details>
      )}

      <div className="grid gap-4">
        {rules.map((rule) => {
          const revision = rule.revisions[0];
          const parsed = contentNodeSchema.safeParse(revision?.content);
          const initial = parsed.success ? parsed.data : emptyContent;
          const assets = revision?.media.map((item) => ({
            id: item.media.id,
            url: item.media.secureUrl,
            kind: item.media.kind,
            name: item.media.originalName,
      caption: item.caption,
          })) || [];
          return (
            <details key={rule.id} className="surface p-6">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">{rule.category} · Position {rule.order}</p>
                    <h2 className="mt-2 text-lg font-semibold">{rule.title}</h2>
                    <p className="mt-2 text-xs text-[#777d81]">
                      Zuletzt bearbeitet {formatDateTime(revision?.updatedAt || rule.updatedAt)}
                      {revision?.editor ? " von " + revision.editor.name : ""} · {revision?.status || "Ohne Revision"}
                    </p>
                  </div>
                  <span className={"badge " + (rule.published ? "badge-gold" : "")}>Version {rule.version} · {rule.published ? "Online" : "Offline"}</span>
                </div>
              </summary>
              {canEdit && (
                <form action={saveRuleAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6">
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <div className="grid gap-4 md:grid-cols-[1fr_240px_120px]">
                    <label className="field-label">Titel<input className="field" name="title" defaultValue={rule.title} required /></label>
                    <label className="field-label">Kategorie<input className="field" name="category" defaultValue={rule.category} required /></label>
                    <label className="field-label">Sortierung<input className="field" name="order" type="number" min="0" defaultValue={rule.order} /></label>
                  </div>
                  <RichTextEditor initialContent={initial} />
                  <MediaUploader initialAssets={assets} />
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton variant="secondary" name="intent" value="draft">Neuen Entwurf speichern</SubmitButton>
                    {canPublish && <SubmitButton name="intent" value="publish">Als neue Version veröffentlichen</SubmitButton>}
                  </div>
                </form>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {canPublish && rule.published && (
                  <form action={withdrawRuleAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <SubmitButton variant="secondary">Zurückziehen</SubmitButton>
                  </form>
                )}
                {canDelete && (
                  <form action={deleteRuleAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <ConfirmSubmitButton message="Diese Regel und alle Versionen wirklich löschen?">Löschen</ConfirmSubmitButton>
                  </form>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </PortalShell>
  );
}