import { deleteHomepageRoleCardAction, saveHomepageRoleCardAction, savePublicLinksAction } from "@/app/actions/portal-v4";
import { MediaUploader } from "@/components/media-uploader";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { getHomepageSettings } from "@/lib/site-settings";
import { groupHomepageCards } from "@/lib/homepage-factions";
import { ContentImage } from "@/components/content-image";

export const dynamic = "force-dynamic";

export default async function WebsiteAdminPage() {
  const { authorization } = await requirePermission("site.manage");
  const [cards, linkSetting, homepage] = await Promise.all([
    prisma.homepageRoleCard.findMany({ include: { image: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.siteSetting.findUnique({ where: { key: "public.links" } }),
    getHomepageSettings(),
  ]);
  const grouped = groupHomepageCards(cards, homepage.factions);
  const links = linkSetting?.value && typeof linkSetting.value === "object" && !Array.isArray(linkSetting.value) ? linkSetting.value as { discordUrl?: string; robloxUrl?: string; discordSupportUrl?: string; melonlyUrl?: string } : {};
  const fields = (card?: (typeof cards)[number], faction?: (typeof grouped.factions)[number]) => <>
    {card && <input type="hidden" name="id" value={card.id} />}
    {faction && <input type="hidden" name="factionCode" value={faction.code} />}
    <div className="grid gap-4 md:grid-cols-[180px_1fr]"><label className="field-label">Kürzel<input className="field" name="code" defaultValue={faction?.code || card?.code} placeholder="z. B. JUSTIZ" maxLength={24} readOnly={Boolean(faction)} required /></label><label className="field-label">Titel<input className="field" name="title" defaultValue={card?.title || faction?.name} maxLength={100} required /></label></div>
    <label className="field-label">Beschreibung<textarea className="field min-h-28" name="description" defaultValue={card?.description ?? faction?.copy} maxLength={800} required={!faction} placeholder="Stelle Aufgaben, Alltag und Einstieg in diese Fraktion vor." /></label>
    <div><p className="mb-2 text-sm font-semibold">Kartenbild</p><MediaUploader inputName="imageId" single imagesOnly initialAssets={card?.image ? [{ id: card.image.id, url: card.image.secureUrl, kind: card.image.kind, name: card.image.originalName }] : []} /></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="field-label">Optionaler HTTPS-Link<input className="field" type="url" name="targetUrl" defaultValue={card?.targetUrl || ""} /></label><label className="field-label">Buttontext<input className="field" name="linkLabel" defaultValue={card?.linkLabel || ""} placeholder="Mehr erfahren" /></label></div>
    <div className="grid gap-3 sm:grid-cols-[150px_1fr]"><label className="field-label">Sortierung<input className="field" type="number" min="0" max="10000" name="sortOrder" defaultValue={card?.sortOrder ?? faction?.sortOrder ?? 0} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={card?.visible ?? true} /> Öffentlich sichtbar</label></div>
    <SubmitButton variant="secondary">{faction ? "Vorstellung speichern" : "Rollenkarte speichern"}</SubmitButton>
  </>;

  return (
    <PortalShell authorization={authorization} title="Startseite & Fraktionen" description="Fraktionsvorstellungen, zusätzliche Rollenkarten und öffentliche Links verwalten." section="admin">
      <section className="mb-10" aria-labelledby="faction-editors-title"><h2 id="faction-editors-title" className="text-xl font-semibold">Hauptfraktionen</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">Logo und Vorstellung erscheinen gemeinsam auf der Startseite. Du kannst Texte, zusätzliche Bilder und Verlinkungen pflegen oder einzelne Fraktionen ausblenden.</p><div className="mt-5 grid gap-3">{grouped.factions.map(faction => <details key={faction.code} className="surface p-5" data-faction-editor={faction.code}><summary className="faction-editor-summary"><ContentImage src={faction.logo} alt="" width={64} height={64} sizes="48px" /><span><strong>{faction.name}</strong><span>{!faction.visible ? "Ausgeblendet" : faction.copy ? "Vorstellung vorhanden" : "Beschreibung ergänzen"}</span></span><span aria-hidden="true">+</span></summary><ReliableActionForm action={saveHomepageRoleCardAction} className="mt-6 grid gap-4 border-t border-[var(--line)] pt-6">{fields(faction.card, faction)}</ReliableActionForm></details>)}</div></section>
      <section className="mb-10" aria-labelledby="additional-cards-title"><h2 id="additional-cards-title" className="mb-4 text-xl font-semibold">Zusätzliche Rollenkarten</h2>
      <details className="surface mb-5 p-6"><summary className="cursor-pointer font-semibold text-[var(--accent-ink)]">Neue Rollenkarte hinzufügen</summary><ReliableActionForm action={saveHomepageRoleCardAction} resetOnSuccess className="mt-6 grid gap-4">{fields()}</ReliableActionForm></details>
      <div className="grid gap-4">{grouped.extraCards.map((card) => <details key={card.id} className="surface p-6"><summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-4"><div><span className="badge badge-gold">{card.code}</span><h3 className="mt-2 text-lg font-semibold">{card.title}</h3></div><span className="text-xs text-[var(--muted)]">{card.visible ? "Sichtbar" : "Versteckt"} · Position {card.sortOrder}</span></div></summary><ReliableActionForm action={saveHomepageRoleCardAction} className="mt-6 grid gap-4 border-t border-[var(--line)] pt-6">{fields(card)}</ReliableActionForm><ReliableActionForm action={deleteHomepageRoleCardAction} className="mt-3"><input type="hidden" name="id" value={card.id} /><SubmitButton variant="danger" pendingText="Wird gelöscht …">Rollenkarte löschen</SubmitButton></ReliableActionForm></details>)}</div></section>
      <section className="surface p-6"><p className="eyebrow">Verknüpfungen</p><h2 className="mt-2 text-xl font-semibold">Öffentliche Links & Übergaben</h2><p className="mt-2 text-sm text-[var(--muted)]">Community-Support bleibt auf Discord; Aktivität, Bewerbungen und Moderationsmaßnahmen bleiben in Melonly.</p><ReliableActionForm action={savePublicLinksAction} className="mt-5 grid gap-4 md:grid-cols-2"><label className="field-label">Discord-Einladung<input className="field" name="discordUrl" type="url" defaultValue={links.discordUrl || siteConfig.discordUrl} required /></label><label className="field-label">Discord-Support / Tickets<input className="field" name="discordSupportUrl" type="url" defaultValue={links.discordSupportUrl || links.discordUrl || siteConfig.discordUrl} required /></label><label className="field-label">Roblox-Beitrittslink<input className="field" name="robloxUrl" type="url" defaultValue={links.robloxUrl || siteConfig.robloxUrl} required /></label><label className="field-label">Melonly-Portal<input className="field" name="melonlyUrl" type="url" defaultValue={links.melonlyUrl || "https://melonly.xyz/dashboard"} required /></label><div className="md:col-span-2"><SubmitButton>Links speichern</SubmitButton></div></ReliableActionForm></section>
    </PortalShell>
  );
}
