import { deleteNewsAction, saveNewsAction, withdrawNewsAction } from "@/app/actions/staff";
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

export default async function StaffNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { authorization } = await requirePermission("news.view");
  const query = await searchParams;
  const posts = await prisma.newsPost.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      thumbnail: true,
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
  const canCreate = hasPermission(authorization, "news.create");
  const canEdit = hasPermission(authorization, "news.edit");
  const canPublish = hasPermission(authorization, "news.publish");
  const canDelete = hasPermission(authorization, "news.delete");

  const fields = (post?: typeof posts[number]) => {
    const revision = post?.revisions[0];
    const parsed = contentNodeSchema.safeParse(revision?.content);
    const initial = parsed.success ? parsed.data : emptyContent;
    const assets = revision?.media.map((item) => ({
      id: item.media.id,
      url: item.media.secureUrl,
      kind: item.media.kind,
      name: item.media.originalName,
    })) || [];
    const thumbnail = post?.thumbnail
      ? [{ id: post.thumbnail.id, url: post.thumbnail.secureUrl, kind: post.thumbnail.kind, name: post.thumbnail.originalName }]
      : [];
    return (
      <>
        {post && <input type="hidden" name="postId" value={post.id} />}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field-label">Titel<input className="field" name="title" defaultValue={post?.title} required /></label>
          <label className="field-label">Label<input className="field" name="coverLabel" defaultValue={post?.coverLabel || ""} placeholder="Update" /></label>
        </div>
        <label className="field-label">Kurzbeschreibung<textarea className="field !min-h-24" name="excerpt" defaultValue={post?.excerpt} required minLength={20} maxLength={320} /></label>
        <RichTextEditor initialContent={initial} />
        <div className="grid gap-5 lg:grid-cols-2">
          <div><p className="mb-2 text-sm font-semibold">Thumbnail</p><MediaUploader inputName="thumbnailId" single initialAssets={thumbnail} /></div>
          <div><p className="mb-2 text-sm font-semibold">Weitere Medien</p><MediaUploader initialAssets={assets} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SubmitButton variant="secondary" name="intent" value="draft">Entwurf speichern</SubmitButton>
          {canPublish && <SubmitButton name="intent" value="publish">Veröffentlichen</SubmitButton>}
        </div>
      </>
    );
  };

  return (
    <PortalShell authorization={authorization} title="News" description="Rich-Text-Beiträge mit Thumbnail und Medien erstellen und versioniert veröffentlichen." section="staff">
      {(query.error || query.saved) && (
        <p role={query.error ? "alert" : "status"} className={"mb-5 rounded-xl p-4 text-sm " + (query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]")}>
          {query.error ? "Der Beitrag konnte nicht gespeichert werden." : "Der Beitrag wurde gespeichert."}
        </p>
      )}
      {canCreate && (
        <details className="surface mb-5 p-6">
          <summary className="cursor-pointer font-semibold text-[#efc76e]">Neuen News-Beitrag erstellen</summary>
          <form action={saveNewsAction} className="mt-6 grid gap-4">{fields()}</form>
        </details>
      )}
      <div className="grid gap-4">
        {posts.map((post) => {
          const revision = post.revisions[0];
          return (
            <details key={post.id} className="surface p-6">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{post.title}</h2>
                    <p className="mt-2 text-xs text-[#777d81]">
                      Zuletzt bearbeitet {formatDateTime(revision?.updatedAt || post.updatedAt)}
                      {revision?.editor ? " von " + revision.editor.name : ""}
                      {post.editedAt ? " · Bearbeitet nach Veröffentlichung" : ""}
                    </p>
                  </div>
                  <span className={"badge " + (post.published ? "badge-gold" : "")}>{post.published ? "Veröffentlicht" : "Entwurf"}</span>
                </div>
              </summary>
              {canEdit && <form action={saveNewsAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6">{fields(post)}</form>}
              <div className="mt-4 flex flex-wrap gap-2">
                {canPublish && post.published && (
                  <form action={withdrawNewsAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <SubmitButton variant="secondary">Zurückziehen</SubmitButton>
                  </form>
                )}
                {canDelete && (
                  <form action={deleteNewsAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <ConfirmSubmitButton message="Diesen News-Beitrag und alle Versionen wirklich löschen?">Löschen</ConfirmSubmitButton>
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