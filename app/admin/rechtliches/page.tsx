import Link from "next/link";
import { saveLegalSettingsAction } from "@/app/actions/admin-content";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";
import { requirePermission } from "@/lib/authz";
import { getLegalSettings, getRetentionSettings, hasSampleLegalDetails, legalDetailsComplete } from "@/lib/legal-settings";

export const dynamic = "force-dynamic";

export default async function LegalAdminPage() {
  const { authorization } = await requirePermission("legal.manage");
  const [legal, retention] = await Promise.all([getLegalSettings(), getRetentionSettings()]);
  const canReview = legalDetailsComplete(legal) && !hasSampleLegalDetails(legal);
  return <PortalShell authorization={authorization} title="Datenschutz" description="Betreiberangaben und Löschfristen für das kostenlose Communityportal." section="admin">
    <div className="legal-preview"><strong>{hasSampleLegalDetails(legal) ? "Musterangaben für den lokalen Test" : "Freigabe vor öffentlichem Betrieb"}</strong><p>Datenschutzerklärung und Nutzungsregeln sind jederzeit erreichbar. Echte Betreiberangaben, Hosting, Dienstleisterverträge und Löschkonzept müssen vor der öffentlichen Bereitstellung zusammenpassen. Vollständige Formularfelder allein sind keine rechtliche Prüfung.</p><p><Link href="/datenschutz">Datenschutz ansehen</Link> · <Link href="/nutzungsbedingungen">Nutzungsregeln ansehen</Link></p></div>
    <ReliableActionForm action={saveLegalSettingsAction} className="surface grid gap-6 p-6 md:p-8">
      
      <input type="hidden" name="noAgeVerificationAcknowledged" value="on" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field-label">Vollständiger Name oder Organisation<input className="field" name="operatorName" defaultValue={legal.operatorName} maxLength={200} required /></label>
        <label className="field-label">Kontakt-E-Mail<input className="field" type="email" name="contactEmail" defaultValue={legal.contactEmail} maxLength={254} required /></label>
        <label className="field-label md:col-span-2">Straße und Hausnummer (falls erforderlich)<input className="field" name="addressLine" defaultValue={legal.addressLine} maxLength={200} /></label>
        <label className="field-label">Postleitzahl<input className="field" name="postalCode" defaultValue={legal.postalCode} maxLength={20} /></label>
        <label className="field-label">Ort<input className="field" name="city" defaultValue={legal.city} maxLength={100} /></label>
        <label className="field-label">Tatsächliches Sitzland<input className="field" name="country" defaultValue={legal.country} maxLength={100} required /></label>
        <label className="field-label">Vertretungsberechtigte Person (falls zutreffend)<input className="field" name="representative" defaultValue={legal.representative} maxLength={200} /></label>
        <input type="hidden" name="donations" value="NONE" />
      </div>
      <div className="grid gap-4 border-y border-[var(--line)] py-5">
        <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="sampleDetails" defaultChecked={legal.sampleDetails} /><span><strong>Diese Angaben sind Musterangaben</strong><br /><span className="text-[var(--muted)]">Der Vorschauhinweis bleibt sichtbar; eine öffentliche Freigabe ist gesperrt.</span></span></label>
        <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="privacyPublished" defaultChecked={legal.privacyPublished} disabled={!canReview} /><span><strong>Echte Angaben und Datenschutzhinweise geprüft</strong><br /><span className="text-[var(--muted)]">{canReview ? "Nur nach Abgleich mit dem tatsächlichen Betrieb bestätigen." : "Zuerst echte Betreiberangaben speichern und die Musterkennzeichnung entfernen."}</span></span></label>
      </div>
      <section><h2 className="text-lg font-semibold">Automatische Aufbewahrungsfristen</h2><p className="mt-2 text-sm text-[var(--muted)]">Die Bereinigung läuft nur bei gestarteter Umgebung. Fristen für Teamdaten, Betriebsprotokolle und Sicherungen müssen zusätzlich im Löschkonzept festgelegt werden.</p><div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="field-label">Geschlossene Tickets (Tage)<input className="field" type="number" min="30" max="3650" name="closedTicketDays" defaultValue={retention.closedTicketDays} required /></label>
        <label className="field-label">Audit-Protokoll (Tage)<input className="field" type="number" min="90" max="3650" name="auditLogDays" defaultValue={retention.auditLogDays} required /></label>
        <label className="field-label">Discord-Snapshots (Tage)<input className="field" type="number" min="1" max="365" name="discordSnapshotDays" defaultValue={retention.discordSnapshotDays} required /></label>
      </div></section><div><SubmitButton>Rechtliches speichern</SubmitButton></div>
    </ReliableActionForm>
  </PortalShell>;
}
