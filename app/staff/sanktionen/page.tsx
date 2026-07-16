import { createSanctionAction, revokeSanctionAction } from "@/app/actions/staff";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/authz";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function SanctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const user = await requireRole("MODERATOR");
  const query = await searchParams;
  let sanctions: Array<{
    id: string; type: string; status: string; robloxName: string; reason: string;
    evidenceUrl: string | null; expiresAt: Date | null; createdAt: Date; issuer: { name: string };
  }> = [];
  try {
    sanctions = await prisma.sanction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { issuer: { select: { name: true } } },
    });
  } catch {}
  return (
    <PortalShell role={user.role} title="Sanktionen" description="Verwarnungen und Bans konsistent dokumentieren und revisionssicher verwalten." staff>
      <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createSanctionAction} className="surface h-fit p-6">
          <h2 className="text-xl font-semibold">Sanktion erfassen</h2>
          {query.error && <p className="mt-4 rounded-xl bg-[#ef6f6c]/10 p-3 text-sm text-[#f28d8a]">Bitte prüfe die Eingaben.</p>}
          {query.created && <p className="mt-4 rounded-xl bg-[#57c98c]/10 p-3 text-sm text-[#75d7a3]">Sanktion wurde protokolliert.</p>}
          <div className="mt-6 grid gap-4">
            <label className="field-label">Roblox-Name<input className="field" name="robloxName" required minLength={3} maxLength={20} /></label>
            <label className="field-label">Roblox User-ID <span className="font-normal text-[#686e72]">Optional</span><input className="field" name="robloxUserId" inputMode="numeric" /></label>
            <label className="field-label">Art<select className="field" name="type"><option value="WARNING">Verwarnung</option><option value="BAN">Ban</option></select></label>
            <label className="field-label">Grund<textarea className="field" name="reason" required minLength={10} maxLength={2000} /></label>
            <label className="field-label">Beweis-URL <span className="font-normal text-[#686e72]">Optional</span><input className="field" name="evidenceUrl" type="url" /></label>
            <label className="field-label">Ablaufdatum <span className="font-normal text-[#686e72]">Optional</span><input className="field" name="expiresAt" type="datetime-local" /></label>
            <div><SubmitButton>Sanktion speichern</SubmitButton></div>
          </div>
        </form>
        <section className="surface overflow-hidden">
          <div className="border-b border-white/[0.07] p-6"><h2 className="text-xl font-semibold">Sanktionsverlauf</h2></div>
          <div className="divide-y divide-white/[0.07]">
            {sanctions.map((sanction) => (
              <article key={sanction.id} className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold">{sanction.robloxName}</h3>
                  <StatusBadge status={sanction.type} />
                  <StatusBadge status={sanction.status} />
                  <span className="ml-auto text-xs text-[#686e72]">{formatDateTime(sanction.createdAt)}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#a0a5a8]">{sanction.reason}</p>
                <p className="mt-3 text-xs text-[#686e72]">Ausgestellt von {sanction.issuer.name}{sanction.expiresAt ? " · Bis " + formatDateTime(sanction.expiresAt) : ""}</p>
                {sanction.status === "ACTIVE" && hasMinimumRole(user.role, "ADMIN") && (
                  <form action={revokeSanctionAction} className="mt-4">
                    <input type="hidden" name="sanctionId" value={sanction.id} />
                    <SubmitButton variant="danger">Sanktion aufheben</SubmitButton>
                  </form>
                )}
              </article>
            ))}
            {!sanctions.length && <p className="p-10 text-center text-sm text-[#777d81]">Keine Sanktionen vorhanden.</p>}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
