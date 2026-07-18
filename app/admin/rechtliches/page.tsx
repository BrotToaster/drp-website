import { saveLegalSettingsAction } from "@/app/actions/admin-content";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { getLegalSettings, getRetentionSettings, legalDetailsComplete } from "@/lib/legal-settings";

export const dynamic = "force-dynamic";

export default async function LegalAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { authorization } = await requirePermission("legal.manage");
  const [legal, retention, query] = await Promise.all([getLegalSettings(), getRetentionSettings(), searchParams]);
  const complete = legalDetailsComplete(legal);
  return (
    <PortalShell authorization={authorization} title="Rechtliches" description="Betreiberangaben, Sichtbarkeit und Aufbewahrungsfristen zentral pflegen." section="admin">
      <div className="mb-5 rounded-xl border border-[#d6aa4c]/25 bg-[#d6aa4c]/[0.07] p-4 text-sm leading-6 text-[#d8c18e]">
        Eine Netlify-Subdomain befreit nicht automatisch von Informationspflichten. Diese technische Vorlage ersetzt keine abschließende Prüfung durch eine schweizerische Rechtsberatung.
      </div>
      {!legal.noAgeVerificationAcknowledged && <p className="mb-5 rounded-xl bg-[#ef6f6c]/10 p-4 text-sm text-[#f28d8a]">Das Restrisiko des bewusst gewählten Modells ohne Altersprüfung wurde noch nicht bestätigt.</p>}
      {query.error && <p role="alert" className="mb-5 rounded-xl bg-[#ef6f6c]/10 p-4 text-sm text-[#f28d8a]">{query.error === "incomplete" ? "Datenschutz kann erst mit vollständigem Namen, Schweizer Adresse und Kontakt-E-Mail veröffentlicht werden." : "Bitte prüfe die Eingaben."}</p>}
      {query.saved && <p role="status" className="mb-5 rounded-xl bg-[#57c98c]/10 p-4 text-sm text-[#75d7a3]">Rechtliche Einstellungen wurden gespeichert.</p>}
      <form action={saveLegalSettingsAction} className="surface grid gap-6 p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field-label">Betreibername<input className="field" name="operatorName" defaultValue={legal.operatorName} /></label>
          <label className="field-label">Kontakt-E-Mail<input className="field" type="email" name="contactEmail" defaultValue={legal.contactEmail} /></label>
          <label className="field-label md:col-span-2">Schweizer Straße und Hausnummer<input className="field" name="addressLine" defaultValue={legal.addressLine} /></label>
          <label className="field-label">Postleitzahl<input className="field" name="postalCode" defaultValue={legal.postalCode} /></label>
          <label className="field-label">Ort<input className="field" name="city" defaultValue={legal.city} /></label>
          <label className="field-label">Land<input className="field" name="country" defaultValue={legal.country} /></label>
          <label className="field-label">Spenden<select className="field" name="donations" defaultValue={legal.donations}><option value="NONE">Keine Spenden</option><option value="VOLUNTARY">Freiwillige Spenden, kein Shop</option></select></label>
        </div>
        <div className="grid gap-3 border-y border-white/[0.07] py-5">
          <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="imprintEnabled" defaultChecked={legal.imprintEnabled} /><span><strong>Impressum veröffentlichen</strong><br /><span className="text-[#777d81]">Deaktiviert Route und Footer-Link.</span></span></label>
          <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="privacyPublished" defaultChecked={legal.privacyPublished} disabled={!complete} /><span><strong>Datenschutzerklärung veröffentlichen</strong><br /><span className="text-[#777d81]">{complete ? "Betreiberangaben sind vollständig." : "Gesperrt, bis Name, Adresse und E-Mail vollständig sind."}</span></span></label>
          <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="noAgeVerificationAcknowledged" defaultChecked={legal.noAgeVerificationAcknowledged} /><span><strong>Restrisiko ohne Altersprüfung ist bekannt</strong><br /><span className="text-[#777d81]">Es werden weder Geburtsdatum noch Elternfreigabe erhoben.</span></span></label>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Aufbewahrungsfristen</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="field-label">Geschlossene Tickets (Tage)<input className="field" type="number" min="30" max="3650" name="closedTicketDays" defaultValue={retention.closedTicketDays} /></label>
            <label className="field-label">Audit-Logs (Tage)<input className="field" type="number" min="90" max="3650" name="auditLogDays" defaultValue={retention.auditLogDays} /></label>
            <label className="field-label">Discord-Snapshots (Tage)<input className="field" type="number" min="1" max="365" name="discordSnapshotDays" defaultValue={retention.discordSnapshotDays} /></label>
          </div>
        </div>
        <div><SubmitButton>Rechtliches speichern</SubmitButton></div>
      </form>
    </PortalShell>
  );
}
