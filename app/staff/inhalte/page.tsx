import { createNewsAction, createRuleAction } from "@/app/actions/staff";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const user = await requireRole("ADMIN");
  const query = await searchParams;
  let counts = { rules: 0, news: 0 };
  try {
    const [rules, news] = await Promise.all([prisma.rule.count(), prisma.newsPost.count()]);
    counts = { rules, news };
  } catch {}
  return (
    <PortalShell role={user.role} title="Inhalte" description="Regelwerk und Neuigkeiten direkt aus dem Staff-Panel veröffentlichen." staff>
      {(query.error || query.created) && (
        <div className={"mb-5 rounded-xl border p-4 text-sm " + (query.error ? "border-[#ef6f6c]/25 bg-[#ef6f6c]/10 text-[#f28d8a]" : "border-[#57c98c]/25 bg-[#57c98c]/10 text-[#75d7a3]")}>
          {query.error ? "Der Inhalt konnte nicht gespeichert werden. Bitte prüfe alle Felder." : "Der Inhalt wurde veröffentlicht."}
        </div>
      )}
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="surface p-5"><p className="text-xs text-[#777d81]">Regeln</p><p className="mt-2 text-3xl font-semibold">{counts.rules}</p></div>
        <div className="surface p-5"><p className="text-xs text-[#777d81]">News-Beiträge</p><p className="mt-2 text-3xl font-semibold">{counts.news}</p></div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <form action={createRuleAction} className="surface p-6">
          <span className="badge badge-gold">Regelwerk</span>
          <h2 className="mt-5 text-xl font-semibold">Neue Regel</h2>
          <div className="mt-6 grid gap-4">
            <label className="field-label">Titel<input className="field" name="title" required /></label>
            <label className="field-label">Kategorie<input className="field" name="category" required placeholder="z. B. Roleplay" /></label>
            <label className="field-label">Regeltext<textarea className="field" name="content" required minLength={20} /></label>
            <div><SubmitButton>Regel veröffentlichen</SubmitButton></div>
          </div>
        </form>
        <form action={createNewsAction} className="surface p-6">
          <span className="badge badge-gold">Journal</span>
          <h2 className="mt-5 text-xl font-semibold">Neue Meldung</h2>
          <div className="mt-6 grid gap-4">
            <label className="field-label">Titel<input className="field" name="title" required /></label>
            <label className="field-label">Label<input className="field" name="coverLabel" placeholder="Update" /></label>
            <label className="field-label">Kurzbeschreibung<textarea className="field !min-h-24" name="excerpt" required minLength={20} maxLength={240} /></label>
            <label className="field-label">Inhalt<textarea className="field" name="content" required minLength={40} /></label>
            <div><SubmitButton>Meldung veröffentlichen</SubmitButton></div>
          </div>
        </form>
      </div>
    </PortalShell>
  );
}
