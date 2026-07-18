import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/ui";
import { getLegalSettings, getRetentionSettings, legalDetailsComplete } from "@/lib/legal-settings";

export const metadata: Metadata = { title: "Datenschutz" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const [legal, retention] = await Promise.all([getLegalSettings(), getRetentionSettings()]);
  if (!legal.privacyPublished || !legalDetailsComplete(legal)) notFound();
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Datenschutzerklärung." copy="Informationen nach Schweizer DSG und – soweit anwendbar – DSGVO." />
      <section className="section-space pt-12">
        <div className="container-shell max-w-4xl">
          <article className="surface space-y-9 p-7 text-sm leading-7 text-[#9da3a8] md:p-10">
            <section><h2 className="text-xl font-semibold text-white">1. Verantwortlicher und Kontakt</h2><p className="mt-3">{legal.operatorName}, {legal.addressLine}, {legal.postalCode} {legal.city}, {legal.country}. Kontakt: <a className="text-[#efc76e]" href={"mailto:" + legal.contactEmail}>{legal.contactEmail}</a>.</p></section>
            <section><h2 className="text-xl font-semibold text-white">2. Zwecke und Rechtsgrundlagen</h2><p className="mt-3">Wir verarbeiten Daten, um Anmeldung und Kontoverknüpfung, Serverzugang, Regelbestätigungen, Support-Tickets, Rollen und Berechtigungen, Missbrauchsschutz, Auditierung sowie den sicheren Betrieb des Portals bereitzustellen. Soweit die DSGVO gilt, stützen wir dies je nach Vorgang auf Vertrag bzw. vorvertragliche Maßnahmen, berechtigte Interessen an einem sicheren Communitybetrieb und gegebenenfalls Einwilligung.</p></section>
            <section><h2 className="text-xl font-semibold text-white">3. Anmeldung, Cookies und Profile</h2><p className="mt-3">Auth.js setzt technisch notwendige, HTTP-only geschützte Sitzungs-, OAuth-State- und PKCE-Cookies. Discord liefert über „identify“ ID, Benutzername, Anzeigename und Avatar. Roblox liefert über „openid profile“ ID, Benutzername, Anzeigename und Profilbild. Passwörter und E-Mail-Adressen werden nicht angefordert. Profildaten werden bei Anmeldung, manueller Aktualisierung oder Discord-Bot-Abgleich erneuert.</p></section>
            <section><h2 className="text-xl font-semibold text-white">4. Weitere Daten</h2><p className="mt-3">Gespeichert werden Ticketinhalte und Nachrichten, Regelbestätigungen, Rollen und deren Quellen, redaktionelle Inhalte, Medienmetadaten, öffentliche Statusmeldungen sowie Audit-Logs privilegierter Aktionen. Der Discord-Bot kann Mitglieder-, Rollen- und Synchronisierungsdaten über einen geschützten Endpunkt übertragen. ER:LC wird nur serverseitig zur Statusanzeige ausgelesen.</p></section>
            <section><h2 className="text-xl font-semibold text-white">5. Empfänger und Auftragsverarbeiter</h2><p className="mt-3">Für Hosting und Auslieferung nutzen wir Netlify, für die Datenbank den bei Netlify konfigurierten PostgreSQL-Dienst, für Medien Cloudinary sowie für Authentifizierung Discord und Roblox. Je nach Anbieter können technische Daten wie IP-Adresse, Browserinformationen, Zeitstempel und angeforderte URL verarbeitet werden.</p></section>
            <section><h2 className="text-xl font-semibold text-white">6. Auslandübermittlungen</h2><p className="mt-3">Netlify, Discord, Roblox und Cloudinary können Daten außerhalb der Schweiz oder des EWR, insbesondere in den USA, verarbeiten. Übermittlungen erfolgen nach den jeweils anwendbaren gesetzlichen Garantien der Anbieter, etwa Angemessenheitsbeschlüssen oder Standardvertragsklauseln. Weitere Informationen enthalten die Datenschutzhinweise der jeweiligen Anbieter.</p></section>
            <section><h2 className="text-xl font-semibold text-white">7. Aufbewahrung und Löschung</h2><p className="mt-3">Geschlossene Tickets werden grundsätzlich spätestens nach {retention.closedTicketDays} Tagen gelöscht, Audit-Logs nach {retention.auditLogDays} Tagen und nicht mehr benötigte Discord-Mitgliedssnapshots nach {retention.discordSnapshotDays} Tagen. Kürzere Löschungen sind möglich, soweit keine Sicherheits-, Nachweis- oder Rechtsgründe entgegenstehen. Kontodaten bleiben bis zur Löschung des DRP-Kontos oder bis zur Ersetzung einer Verknüpfung erhalten.</p></section>
            <section><h2 className="text-xl font-semibold text-white">8. Rechte betroffener Personen</h2><p className="mt-3">Du kannst im gesetzlichen Umfang Auskunft, Berichtigung, Löschung, Einschränkung, Datenherausgabe bzw. Übertragbarkeit sowie Widerspruch verlangen und eine Einwilligung für die Zukunft widerrufen. In der Schweiz kannst du dich an den EDÖB wenden; im Anwendungsbereich der DSGVO an eine zuständige Datenschutzaufsichtsbehörde.</p></section>
            <section><h2 className="text-xl font-semibold text-white">9. Minderjährige und Sicherheit</h2><p className="mt-3">Das Portal erhebt bewusst kein Geburtsdatum und führt keine automatische Altersprüfung oder Elternfreigabe durch. Datenübertragungen werden verschlüsselt; Berechtigungen werden serverseitig geprüft, Geheimnisse nicht an den Browser ausgegeben und privilegierte Änderungen protokolliert. Ein vollständiger Schutz vor allen Risiken kann technisch nicht garantiert werden.</p></section>
            <section><h2 className="text-xl font-semibold text-white">10. Änderungen</h2><p className="mt-3">Diese Erklärung wird angepasst, wenn sich Dienste, Zwecke oder Rechtslage ändern. Stand: {legal.lastReviewedAt ? new Date(legal.lastReviewedAt).toLocaleDateString("de-CH") : "nicht angegeben"}.</p></section>
          </article>
        </div>
      </section>
    </>
  );
}
