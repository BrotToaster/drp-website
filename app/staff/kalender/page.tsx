import { archiveCalendarEventAction, reviewCalendarEventAction, saveCalendarEventAction } from "@/app/actions/calendar";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CalendarLazy } from "@/components/calendar-lazy";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { dateTimeLocalValue } from "@/lib/calendar";
import { contentNodeSchema, emptyContent } from "@/lib/content";
import { canAccessCalendarCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function StaffCalendarPage({ searchParams }: { searchParams: Promise<{ newStart?: string; event?: string }> }) {
  const query = await searchParams;
  const { authorization } = await requirePermission("staff.access");
  const [categories, events] = await Promise.all([
    prisma.calendarCategory.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
    prisma.calendarEvent.findMany({ include: { category: true, revisions: { orderBy: { createdAt: "desc" }, include: { coverImage: true, editor: { select: { name: true } }, media: { orderBy: { sortOrder: "asc" }, include: { media: true } } } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  const usableCategories = categories.filter((category) => authorization.isOwner || authorization.calendarAccess.some((access) => access.categoryId === category.id && (access.canCreate || access.canManage)));
  const pending = events.flatMap((event) => event.revisions.filter((revision) => revision.status === "PENDING_REVIEW").map((revision) => ({ event, revision }))).filter(({ event }) => canAccessCalendarCategory(authorization, event.categoryId, "canPublish") || canAccessCalendarCategory(authorization, event.categoryId, "canManage"));
  const selectedStart = query.newStart ? new Date(query.newStart) : null;
  const selectedEnd = selectedStart && !Number.isNaN(selectedStart.getTime()) ? new Date(selectedStart.getTime() + 60 * 60 * 1000) : null;

  const fields = (event?: typeof events[number]) => {
    const revision = event?.revisions[0];
    const content = contentNodeSchema.safeParse(revision?.content);
    const cover = revision?.coverImage ? [{ id: revision.coverImage.id, url: revision.coverImage.secureUrl, kind: revision.coverImage.kind, name: revision.coverImage.originalName }] : [];
    const media = revision?.media.filter((item) => item.media.visibility === "PUBLIC" && item.media.kind !== "DOCUMENT").map((item) => ({ id: item.media.id, url: item.media.secureUrl, kind: item.media.kind as "IMAGE" | "AUDIO" | "VIDEO", name: item.media.originalName, caption: item.caption })) || [];
    return <>
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <div className="grid gap-4 md:grid-cols-2"><label className="field-label">Titel<input className="field" name="title" defaultValue={revision?.title || ""} required /></label><label className="field-label">Kategorie<select className="field" name="categoryId" defaultValue={event?.categoryId || usableCategories[0]?.id} required>{usableCategories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label></div>
      <label className="field-label">Kurzbeschreibung<textarea className="field min-h-24" name="summary" defaultValue={revision?.summary || ""} maxLength={500} /></label>
      <RichTextEditor initialContent={content.success ? content.data : emptyContent} />
      <div className="grid gap-4 md:grid-cols-2"><label className="field-label">Beginn<input className="field" type="datetime-local" name="startsAt" defaultValue={revision ? dateTimeLocalValue(revision.startsAt) : selectedStart && !Number.isNaN(selectedStart.getTime()) ? dateTimeLocalValue(selectedStart) : ""} required /></label><label className="field-label">Ende<input className="field" type="datetime-local" name="endsAt" defaultValue={revision ? dateTimeLocalValue(revision.endsAt) : selectedEnd ? dateTimeLocalValue(selectedEnd) : ""} required /></label><label className="field-label">Ort<input className="field" name="location" defaultValue={revision?.location || ""} /></label><label className="field-label">Externer HTTPS-Link<input className="field" type="url" name="externalUrl" defaultValue={revision?.externalUrl || ""} /></label></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allDay" defaultChecked={revision?.allDay} /> Ganztägiger Termin</label>
      <div className="grid gap-4 md:grid-cols-3"><label className="field-label">Wiederholung<select className="field" name="recurrenceFrequency" defaultValue={revision?.recurrenceFrequency || "NONE"}><option value="NONE">Keine</option><option value="DAILY">Täglich</option><option value="WEEKLY">Wöchentlich</option><option value="MONTHLY">Monatlich</option></select></label><label className="field-label">Alle … Intervalle<input className="field" type="number" min="1" max="52" name="recurrenceInterval" defaultValue={revision?.recurrenceInterval || 1} /></label><label className="field-label">Wiederholen bis<input className="field" type="datetime-local" name="recurrenceUntil" defaultValue={revision?.recurrenceUntil ? dateTimeLocalValue(revision.recurrenceUntil) : ""} /></label></div>
      <div className="grid gap-5 lg:grid-cols-2"><div><p className="mb-2 text-sm font-semibold">Titelbild</p><MediaUploader inputName="coverImageId" single imagesOnly initialAssets={cover} /></div><div><p className="mb-2 text-sm font-semibold">Medien</p><MediaUploader initialAssets={media} /></div></div>
      <div className="flex flex-wrap gap-2"><SubmitButton variant="secondary" name="intent" value="draft">Entwurf speichern</SubmitButton><SubmitButton name="intent" value="submit">Zur Prüfung einreichen</SubmitButton><SubmitButton variant="secondary" name="intent" value="publish">Direkt veröffentlichen</SubmitButton></div>
    </>;
  };

  return <PortalShell authorization={authorization} title="Kalender" description="Termine erstellen, wiederholen, prüfen und nach Kategorien veröffentlichen." section="staff">
    <section className="mb-7"><CalendarLazy staff categories={categories.map(({ id, title, color }) => ({ id, title, color }))} /></section>
    {usableCategories.length ? <details id="new-event" open={Boolean(query.newStart)} className="surface mb-6 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Neuen Termin erstellen</summary><ReliableActionForm action={saveCalendarEventAction} resetOnSuccess className="mt-6 grid gap-4">{fields()}</ReliableActionForm></details> : <p className="surface mb-6 p-5 text-sm text-[#9da3a8]">Dir wurde noch keine Kalenderkategorie zum Erstellen zugewiesen.</p>}
    {pending.length > 0 && <section className="mb-7"><h2 className="mb-4 text-xl font-semibold">Wartet auf Freigabe <span className="badge badge-gold ml-2">{pending.length}</span></h2><div className="grid gap-3">{pending.map(({ event, revision }) => <article key={revision.id} className="surface p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="badge">{event.category.title}</span><h3 className="mt-3 text-lg font-semibold">{revision.title}</h3><p className="mt-1 text-xs text-[#777d81]">{formatDateTime(revision.startsAt)} · eingereicht von {revision.editor?.name || "Unbekannt"}</p></div><ReliableActionForm action={reviewCalendarEventAction} className="flex flex-wrap gap-2"><input type="hidden" name="revisionId" value={revision.id} /><SubmitButton name="decision" value="approve">Freigeben</SubmitButton><SubmitButton name="decision" value="reject" variant="danger">Ablehnen</SubmitButton></ReliableActionForm></div></article>)}</div></section>}
    <section><h2 className="mb-4 text-xl font-semibold">Termine</h2><div className="grid gap-4">{events.map((event) => { const latest = event.revisions[0]; const canEdit = canAccessCalendarCategory(authorization, event.categoryId, "canManage") || (event.creatorId === authorization.userId && canAccessCalendarCategory(authorization, event.categoryId, "canEditOwn")); return <details id={`event-${event.id}`} open={query.event === event.id} key={event.id} className="surface p-6"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="badge">{event.category.title}</span><h3 className="mt-2 text-lg font-semibold">{latest?.title || "Termin ohne Version"}</h3></div><span className="text-xs text-[#777d81]">{event.archivedAt ? "Archiviert" : latest?.status === "PUBLISHED" ? "Veröffentlicht" : latest?.status === "PENDING_REVIEW" ? "In Prüfung" : "Entwurf"}</span></div></summary>{canEdit && latest && <ReliableActionForm action={saveCalendarEventAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6">{fields(event)}</ReliableActionForm>}{canAccessCalendarCategory(authorization, event.categoryId, "canManage") && <ReliableActionForm action={archiveCalendarEventAction} className="mt-4"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="archived" value={event.archivedAt ? "false" : "true"} /><ConfirmSubmitButton message={event.archivedAt ? "Termin wiederherstellen?" : "Termin wirklich archivieren?"}>{event.archivedAt ? "Wiederherstellen" : "Archivieren"}</ConfirmSubmitButton></ReliableActionForm>}</details>; })}</div></section>
  </PortalShell>;
}
