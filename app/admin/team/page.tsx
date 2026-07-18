import { deleteTeamMemberAction, saveTeamMemberAction } from "@/app/actions/management";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { authorization } = await requirePermission("team.manage");
  const query = await searchParams;
  const [profiles, users] = await Promise.all([
    prisma.staffProfile.findMany({ orderBy: [{ displayOrder: "asc" }, { displayName: "asc" }], include: { image: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, discordDisplayName: true, robloxDisplayName: true } }),
  ]);
  const fields = (profile?: typeof profiles[number]) => (
    <>
      {profile && <input type="hidden" name="id" value={profile.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field-label">Anzeigename<input className="field" name="displayName" defaultValue={profile?.displayName} required /></label>
        <label className="field-label">Optional verknüpfter Nutzer<select className="field" name="userId" defaultValue={profile?.userId || ""}><option value="">Kein Nutzer</option>{users.map((user) => <option key={user.id} value={user.id}>{user.discordDisplayName || user.robloxDisplayName || user.name}</option>)}</select></label>
        <label className="field-label">Funktion<input className="field" name="title" defaultValue={profile?.title} required /></label>
        <label className="field-label">Abteilung<input className="field" name="department" defaultValue={profile?.department} required /></label>
      </div>
      <label className="field-label">Biografie<textarea className="field min-h-28" name="bio" defaultValue={profile?.bio || ""} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field-label">Sortierung<input className="field" type="number" min="0" name="displayOrder" defaultValue={profile?.displayOrder || 0} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={profile?.visible ?? true} /> Öffentlich sichtbar</label>
      </div>
      <div><p className="mb-2 text-sm font-semibold">Kleines Profilbild</p><MediaUploader inputName="imageId" single imagesOnly initialAssets={profile?.image ? [{ id: profile.image.id, url: profile.image.secureUrl, kind: profile.image.kind, name: profile.image.originalName }] : []} /></div>
      <SubmitButton variant="secondary">Teammitglied speichern</SubmitButton>
    </>
  );
  return (
    <PortalShell authorization={authorization} title="Team" description="Registrierte und manuelle Teammitglieder mit Funktion, Reihenfolge und Bild pflegen." section="admin">
      {(query.error || query.saved) && <p className={"mb-5 rounded-xl p-4 text-sm " + (query.error ? "bg-[#ef6f6c]/10 text-[#f28d8a]" : "bg-[#57c98c]/10 text-[#75d7a3]")}>{query.error ? "Teammitglied konnte nicht gespeichert werden." : "Teammitglied wurde gespeichert."}</p>}
      <details className="surface mb-5 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Teammitglied hinzufügen</summary><form action={saveTeamMemberAction} className="mt-6 grid gap-4">{fields()}</form></details>
      <div className="grid gap-4">
        {profiles.map((profile) => <details key={profile.id} className="surface p-6"><summary className="cursor-pointer list-none"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">{profile.displayName}</h2><p className="mt-1 text-xs text-[#777d81]">{profile.department} · {profile.title}</p></div><span className={"badge " + (profile.visible ? "badge-gold" : "")}>{profile.visible ? "Sichtbar" : "Versteckt"}</span></div></summary><form action={saveTeamMemberAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6">{fields(profile)}</form><form action={deleteTeamMemberAction} className="mt-3"><input type="hidden" name="id" value={profile.id} /><ConfirmSubmitButton message="Dieses Teammitglied wirklich löschen?">Löschen</ConfirmSubmitButton></form></details>)}
      </div>
    </PortalShell>
  );
}
