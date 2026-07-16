import { submitApplicationAction } from "@/app/actions/player";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  let application: { status: string; staffNote: string | null; submittedAt: Date | null } | null = null;
  try {
    application = await prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, staffNote: true, submittedAt: true },
    });
  } catch {}
  const active = application && ["SUBMITTED", "UNDER_REVIEW"].includes(application.status);
  return (
    <PortalShell role={user.role} title="Whitelist-Bewerbung" description="Zeige uns, wie du glaubwürdige Geschichten nach Liberty County bringst.">
      {application && (
        <section className="surface mb-5 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs text-[#777d81]">Letzte Bewerbung {application.submittedAt ? "· " + formatDateTime(application.submittedAt) : ""}</p>
            <div className="mt-3"><StatusBadge status={application.status} /></div>
            {application.staffNote && <p className="mt-4 max-w-xl text-sm leading-6 text-[#a3a8ab]"><strong className="text-white">Rückmeldung:</strong> {application.staffNote}</p>}
          </div>
        </section>
      )}
      {!active && (
        <form action={submitApplicationAction} className="surface p-6 md:p-8">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold">Deine Bewerbung</h2>
            <p className="mt-2 text-sm leading-6 text-[#858b90]">Nimm dir Zeit für konkrete, selbst formulierte Antworten. Qualität ist wichtiger als Länge.</p>
          </div>
          {query.error && <div className="mt-5 rounded-xl bg-[#ef6f6c]/10 p-4 text-sm text-[#f28d8a]">{query.error === "existing" ? "Es wird bereits eine Bewerbung geprüft." : "Bitte beantworte alle Fragen ausführlich."}</div>}
          {query.submitted && <div className="mt-5 rounded-xl bg-[#57c98c]/10 p-4 text-sm text-[#75d7a3]">Deine Bewerbung wurde eingereicht.</div>}
          <div className="mt-7 grid gap-6">
            <label className="field-label">Warum möchtest du Teil von DRP werden?
              <textarea className="field" name="motivation" required minLength={80} maxLength={4000} />
            </label>
            <label className="field-label">Welche Roleplay-Erfahrung bringst du mit?
              <textarea className="field" name="experience" required minLength={40} maxLength={3000} />
            </label>
            <label className="field-label">Ein Spieler provoziert eine unrealistische Verfolgung. Wie reagierst du?
              <textarea className="field" name="scenario" required minLength={80} maxLength={4000} />
            </label>
            <div><SubmitButton>Bewerbung verbindlich einreichen</SubmitButton></div>
          </div>
        </form>
      )}
    </PortalShell>
  );
}
