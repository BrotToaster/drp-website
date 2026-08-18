import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { cloudinaryConfigured } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { authorization } = await requirePermission("integrations.view");
  const [lastRoleSync, lastMemberSync, lastMelonlySync, lastJobRun] = await Promise.all([
    prisma.botSyncReceipt.findFirst({ where: { kind: "DISCORD_ROLES" }, orderBy: { createdAt: "desc" } }),
    prisma.botSyncReceipt.findFirst({ where: { kind: "DISCORD_MEMBERS" }, orderBy: { createdAt: "desc" } }),
    prisma.melonlyMember.findFirst({ orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }),
    prisma.scheduledJobRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  const integrations = [
    ["Discord-Bot", Boolean(process.env.BOT_INGEST_TOKEN), lastMemberSync?.createdAt],
    ["Discord-Rollensync", Boolean(lastRoleSync), lastRoleSync?.createdAt],
    ["ER:LC v2", Boolean(process.env.ERLC_SERVER_KEY), null],
    ["Cloudinary", cloudinaryConfigured, null],
    ["Melonly", Boolean(process.env.MELONLY_API_TOKEN), lastMelonlySync?.lastSyncedAt],
    ["Railway-Cronjob", Boolean(lastJobRun), lastJobRun?.finishedAt || lastJobRun?.startedAt],
  ] as const;
  return (
    <PortalShell authorization={authorization} title="Integrationsstatus" description="Nur Statusinformationen – Geheimnisse werden weder angezeigt noch in der Datenbank gespeichert." section="admin">
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map(([name, active, date]) => (
          <div key={name} className="surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{name}</h2>
              <span className={"status-dot" + (active ? "" : " offline")} />
            </div>
            <p className="mt-4 text-sm text-[#777d81]">{active ? "Konfiguriert" : "Nicht konfiguriert"}{date ? " · letzter Abgleich " + date.toLocaleString("de-DE") : ""}</p>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
