import { deleteHomepageRoleCardAction, saveHomepageRoleCardAction, savePublicLinksAction } from "@/app/actions/portal-v4";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function WebsiteAdminPage() {
  const { authorization } = await requirePermission("site.manage");
  const [cards, linkSetting] = await Promise.all([
    prisma.homepageRoleCard.findMany({ include: { image: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.siteSetting.findUnique({ where: { key: "public.links" } }),
  ]);
  const links = linkSetting?.value && typeof linkSetting.value === "object" && !Array.isArray(linkSetting.value) ? linkSetting.value as { discordUrl?: string; robloxUrl?: string } : {};
  const fields = (card?: (typeof cards)[number]) => <>
    {card && <input type="hidden" name="id" value={card.id} />}
    <div className="grid gap-4 md:grid-cols-[160px_1fr]"><label className="field-label">Kürzel<input className="field" name="code" defaultValue={card?.code} placeholder="z. B. JUSTIZ" required /></label><label className="field-label">Titel<input className="field" name="title" defaultValue={card?.title} required /></label></div>
    <label className="field-label">Beschreibung<textarea className="field min-h-28" name="description" defaultValue={card?.description} required /></label>
    <div><p className="mb-2 text-sm font-semibold">Kartenbild</p><MediaUploader inputName="imageId" single imagesOnly initialAssets={card?.image ? [{ id: card.image.id, url: card.image.secureUrl, kind: card.image.kind, name: card.image.originalName }] : []} /></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="field-label">Optionaler HTTPS-Link<input className="field" type="url" name="targetUrl" defaultValue={card?.targetUrl || ""} /></label><label className="field-label">Buttontext<input className="field" name="linkLabel" defaultValue={card?.linkLabel || ""} placeholder="Mehr erfahren" /></label></div>
    <div className="grid gap-3 sm:grid-cols-[150px_1fr]"><label className="field-label">Sortierung<input className="field" type="number" min="0" name="sortOrder" defaultValue={card?.sortOrder || 0} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={card?.visible ?? true} /> Öffentlich sichtbar</label></div>
    <SubmitButton variant="secondary">Rollenkarte speichern</SubmitButton>
  </>;

  return (
    <PortalShell authorization={authorization} title="Startseite & Rollenkarten" description="Rollenbereiche, Bilder, Verlinkungen und öffentliche Einstiegslinks verwalten." section="admin">
      <details className="surface mb-5 p-6"><summary className="cursor-pointer font-semibold text-[#efc76e]">Neue Rollenkarte hinzufügen</summary><ReliableActionForm action={saveHomepageRoleCardAction} resetOnSuccess className="mt-6 grid gap-4">{fields()}</ReliableActionForm></details>
      <section className="mb-6 grid gap-4">{cards.map((card) => <details key={card.id} className="surface p-6"><summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-4"><div><span className="badge badge-gold">{card.code}</span><h2 className="mt-2 text-lg font-semibold">{card.title}</h2></div><span className="text-xs text-[#777d81]">{card.visible ? "Sichtbar" : "Versteckt"} · Position {card.sortOrder}</span></div></summary><ReliableActionForm action={saveHomepageRoleCardAction} className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6">{fields(card)}</ReliableActionForm><ReliableActionForm action={deleteHomepageRoleCardAction} className="mt-3"><input type="hidden" name="id" value={card.id} /><SubmitButton variant="danger" pendingText="Wird gelöscht …">Rollenkarte löschen</SubmitButton></ReliableActionForm></details>)}</section>
      <section className="surface p-6"><h2 className="text-xl font-semibold">Öffentliche Links</h2><ReliableActionForm action={savePublicLinksAction} className="mt-5 grid gap-4 md:grid-cols-2"><label className="field-label">Discord-Einladung<input className="field" name="discordUrl" type="url" defaultValue={links.discordUrl || siteConfig.discordUrl} required /></label><label className="field-label">Roblox-Beitrittslink<input className="field" name="robloxUrl" type="url" defaultValue={links.robloxUrl || siteConfig.robloxUrl} required /></label><div className="md:col-span-2"><SubmitButton>Links speichern</SubmitButton></div></ReliableActionForm></section>
    </PortalShell>
  );
}
