import { reviewApplicationAction } from "@/app/actions/staff";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function StaffApplicationsPage() {
  const user = await requireRole("MODERATOR");
  let applications: Array<{
    id: string; status: string; answers: unknown; submittedAt: Date | null; staffNote: string | null;
    user: { name: string; robloxName: string | null };
  }> = [];
  try {
    applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, robloxName: true } } },
    });
  } catch {}
  return (
    <PortalShell role={user.role} title="Bewerbungen" description="Whitelist-Anträge fair, einheitlich und mit dokumentierter Rückmeldung prüfen." staff>
      <div className="grid gap-4">
        {applications.map((application) => {
          const answers = application.answers as Record<string, string>;
          return (
            <article key={application.id} className="surface p-6 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[#777d81]">{application.submittedAt ? formatDateTime(application.submittedAt) : "Entwurf"}</p>
                  <h2 className="mt-2 text-xl font-semibold">{application.user.robloxName || application.user.name}</h2>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <div className="mt-7 grid gap-5 lg:grid-cols-3">
                {[
                  ["Motivation", answers.motivation],
                  ["Erfahrung", answers.experience],
                  ["Szenario", answers.scenario],
                ].map(([label, copy]) => (
                  <div key={label} className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#efc76e]">{label}</p>
                    <p className="mt-3 text-sm leading-6 text-[#a0a5a8]">{copy || "–"}</p>
                  </div>
                ))}
              </div>
              <form action={reviewApplicationAction} className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input type="hidden" name="applicationId" value={application.id} />
                <input className="field" name="staffNote" defaultValue={application.staffNote || ""} placeholder="Rückmeldung an den Bewerber …" />
                <select className="field md:w-auto" name="status" defaultValue={application.status === "SUBMITTED" ? "UNDER_REVIEW" : application.status}>
                  <option value="UNDER_REVIEW">In Prüfung</option>
                  <option value="ACCEPTED">Annehmen</option>
                  <option value="REJECTED">Ablehnen</option>
                </select>
                <SubmitButton variant="secondary">Bewertung speichern</SubmitButton>
              </form>
            </article>
          );
        })}
        {!applications.length && <div className="surface p-12 text-center text-sm text-[#777d81]">Keine Bewerbungen vorhanden.</div>}
      </div>
    </PortalShell>
  );
}
