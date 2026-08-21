import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { cloudinaryConfigured } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

type IntegrationStatus = {
  name: string;
  configured: boolean;
  date?: Date | null;
  staleAfterMs?: number;
  failed?: boolean;
};

export default async function IntegrationsPage() {
  const { authorization } = await requirePermission("integrations.view");
  const [lastRoleSync, lastMemberSync, lastMelonlySync, lastJobRun, erlcState] = await Promise.all([
    prisma.botSyncReceipt.findFirst({ where: { kind: "DISCORD_ROLES" }, orderBy: { createdAt: "desc" } }),
    prisma.botSyncReceipt.findFirst({ where: { kind: "DISCORD_MEMBERS" }, orderBy: { createdAt: "desc" } }),
    prisma.melonlyMember.findFirst({ orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }),
    prisma.scheduledJobRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.erlcServerState.findUnique({ where: { id: "primary" } }),
  ]);
  const now = Date.now();
  const statusFor = (configured: boolean, syncedAt: Date | null | undefined, staleAfterMs?: number, failed = false) => {
    if (!configured) return { label: "Nicht konfiguriert", tone: "offline" as const };
    if (failed) return { label: "Fehler", tone: "danger" as const };
    if (syncedAt && staleAfterMs && now - syncedAt.getTime() > staleAfterMs) return { label: "Veraltet", tone: "stale" as const };
    if (staleAfterMs && !syncedAt) return { label: "Noch kein Abgleich", tone: "stale" as const };
    return { label: syncedAt ? "Aktuell" : "Konfiguriert", tone: "ready" as const };
  };
  const integrations: IntegrationStatus[] = [
    { name: "Discord-Mitglieder", configured: Boolean(process.env.BOT_INGEST_TOKEN), date: lastMemberSync?.createdAt, staleAfterMs: 2 * 60 * 60 * 1000 },
    { name: "Discord-Rollensync", configured: Boolean(process.env.BOT_INGEST_TOKEN), date: lastRoleSync?.createdAt, staleAfterMs: 2 * 60 * 60 * 1000 },
    { name: "ER:LC v2", configured: Boolean(process.env.ERLC_SERVER_KEY), date: erlcState?.lastSuccessfulAt, staleAfterMs: 10 * 60 * 1000, failed: Boolean(erlcState?.errorMessage) },
    { name: "Cloudinary", configured: cloudinaryConfigured },
    { name: "Melonly", configured: Boolean(process.env.MELONLY_API_TOKEN), date: lastMelonlySync?.lastSyncedAt, staleAfterMs: 2 * 60 * 60 * 1000 },
    { name: "Railway-Cronjob", configured: Boolean(lastJobRun), date: lastJobRun?.finishedAt || lastJobRun?.startedAt, staleAfterMs: 2 * 60 * 60 * 1000, failed: lastJobRun?.status === "FAILED" || (lastJobRun?.status === "RUNNING" && now - lastJobRun.startedAt.getTime() > 15 * 60 * 1000) },
  ];
  return (
    <PortalShell authorization={authorization} title="Integrationsstatus" description="Nur Statusinformationen – Geheimnisse werden weder angezeigt noch in der Datenbank gespeichert." section="admin">
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => {
          const status = statusFor(integration.configured, integration.date, integration.staleAfterMs, integration.failed);
          return <div key={integration.name} className={`surface p-6 integration-state integration-state-${status.tone}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{integration.name}</h2>
              <span className={"status-dot" + (status.tone === "ready" ? "" : " offline")} />
            </div>
            <p className="mt-4 text-sm text-[#777d81]"><strong className="text-current">{status.label}</strong>{integration.date ? " · letzter Abgleich " + formatDateTime(integration.date) : ""}</p>
            {integration.name === "Railway-Cronjob" && lastJobRun?.error && <p className="mt-2 line-clamp-2 text-xs text-[#f28d8a]">{lastJobRun.error}</p>}
          </div>
        })}
      </div>
    </PortalShell>
  );
}
