import { saveSiteSettingsAction } from "@/app/actions/admin";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type Department = { code: string; name: string; copy: string };
const defaults: Department[] = [
  { code: "POLIZEI", name: "Polizei Deutschland", copy: "Sorge mit klaren Einsatzstrukturen, Ermittlungen und bürgernahem Roleplay für Sicherheit." },
  { code: "FEUERWEHR", name: "Berufsfeuerwehr Deutschland", copy: "Rette Leben, bekämpfe Brände und koordiniere Feuerwehr- und Rettungsdiensteinsätze." },
  { code: "MOVEBERLIN", name: "MoveBerlin", copy: "Halte als Stadtwerke- und Infrastrukturdienst Straßen, Versorgung und Verkehr am Laufen." },
];

export default async function WebsiteAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { authorization } = await requirePermission("site.manage");
  const query = await searchParams;
  const [departmentSetting, linkSetting] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "homepage.departments" } }),
    prisma.siteSetting.findUnique({ where: { key: "public.links" } }),
  ]);
  const stored = Array.isArray(departmentSetting?.value) ? departmentSetting.value : [];
  const departments = defaults.map((fallback, index) => {
    const item = stored[index];
    return item && typeof item === "object" ? { ...fallback, ...(item as Department) } : fallback;
  });
  const links = linkSetting?.value && typeof linkSetting.value === "object" && !Array.isArray(linkSetting.value)
    ? linkSetting.value as { discordUrl?: string; robloxUrl?: string }
    : {};

  return (
    <PortalShell authorization={authorization} title="Website-Inhalte" description="Rollenkarten und öffentliche Links ohne Codeänderung verwalten." section="admin">
      {query.saved && <p className="mb-5 rounded-xl bg-[#57c98c]/10 p-4 text-sm text-[#75d7a3]">Website-Einstellungen wurden gespeichert.</p>}
      <form action={saveSiteSettingsAction} className="grid gap-5">
        <section className="surface p-6">
          <h2 className="text-xl font-semibold">Startseiten-Rollenkarten</h2>
          <div className="mt-5 grid gap-5">
            {[
              ["Polizei", "policeName", "policeCopy", departments[0]],
              ["Feuerwehr", "fireName", "fireCopy", departments[1]],
              ["MoveBerlin", "moveName", "moveCopy", departments[2]],
            ].map(([label, nameKey, copyKey, department]) => (
              <fieldset key={String(label)} className="grid gap-3 rounded-xl border border-white/[0.07] p-4 md:grid-cols-[240px_1fr]">
                <legend className="px-2 text-sm font-semibold text-[#efc76e]">{String(label)}</legend>
                <input className="field" name={String(nameKey)} defaultValue={(department as Department).name} />
                <textarea className="field !min-h-20" name={String(copyKey)} defaultValue={(department as Department).copy} />
              </fieldset>
            ))}
          </div>
        </section>
        <section className="surface p-6">
          <h2 className="text-xl font-semibold">Öffentliche Links</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="field-label">Discord-Einladung<input className="field" name="discordUrl" type="url" defaultValue={links.discordUrl || siteConfig.discordUrl} /></label>
            <label className="field-label">Roblox-Beitrittslink<input className="field" name="robloxUrl" type="url" defaultValue={links.robloxUrl || siteConfig.robloxUrl} /></label>
          </div>
        </section>
        <SubmitButton>Website-Einstellungen speichern</SubmitButton>
      </form>
    </PortalShell>
  );
}