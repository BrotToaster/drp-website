import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { LegalNotice } from "@/components/legal-notice";
import { getLegalSettings } from "@/lib/legal-settings";
import { publicMetadata } from "@/lib/metadata";

export const metadata = publicMetadata("Nutzungsregeln", "Regeln für Konten, Inhalte und Support im kostenlosen DRP-Communityportal.", "/nutzungsbedingungen");
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const legal = await getLegalSettings();
  return <><PageIntro eyebrow="Das Portal nutzen" title="Klare Regeln für ein faires Miteinander." copy="Diese Hinweise betreffen das kostenlose Website-Portal. Die Spielregeln stehen gesondert im Regelwerk." /><section className="section-space pt-12"><div className="container-shell max-w-4xl"><LegalNotice legal={legal} /><article className="surface legal-copy p-7 md:p-10">
    <section><h2>Das Angebot</h2><p>DRP stellt Informationen, ein Nutzerkonto, Regelbestätigungen und Kontaktmöglichkeiten bereit. Das Portal ist kostenlos. Es gibt keinen Shop und keine Spendenfunktion. Ein bestimmter Spielplatz, eine Teamrolle oder eine jederzeitige Verfügbarkeit wird durch die Registrierung nicht zugesagt.</p></section>
    <section><h2>Dein Konto und dein Gastlink</h2><p>Verknüpfe nur Discord- und Roblox-Konten, die du selbst nutzen darfst. Schütze deine Zugänge und den privaten Link zu einem Gastticket. Melde einen vermuteten Fremdzugriff über den <Link href="/kontakt">Website-Kontakt</Link>. Für externe Plattformen gelten deren eigene Nutzungs- und Altersvorgaben.</p></section>
    <section><h2>Umgang und Inhalte</h2><p>Behandle andere respektvoll. Unzulässig sind insbesondere rechtswidrige Inhalte, Drohungen, Diskriminierung, Spam, Identitätsmissbrauch und das Veröffentlichen fremder persönlicher Daten ohne Berechtigung. Lade nur Inhalte hoch, für die du die erforderlichen Rechte hast. Deine Rechte an eigenen Inhalten bleiben bei dir; das Portal verarbeitet sie zur von dir gewählten Veröffentlichung oder internen Bearbeitung.</p></section>
    <section><h2>Support und Moderation</h2><p>Der Website-Kontakt ist für Fragen zum Portal und technische Anliegen vorgesehen. Spielsupport, Reports und Bewerbungen werden über die dafür benannten Communitywege bearbeitet. Bei Missbrauch kann das Team Inhalte prüfen und erforderliche, verhältnismäßige Zugriffsbeschränkungen vornehmen. Bei Rückfragen oder einer aus deiner Sicht falschen Entscheidung kannst du dich an den Betreiber wenden.</p></section>
    <section><h2>Spielregeln, Datenschutz und Änderungen</h2><p>Für das Roleplay gilt das <Link href="/regelwerk">Serverregelwerk</Link>. Wie personenbezogene Daten verarbeitet werden, steht in der <Link href="/datenschutz">Datenschutzerklärung</Link>. Funktions- oder Regeländerungen werden an den jeweils betroffenen Stellen erläutert. Gesetzliche Ansprüche werden durch diese Hinweise nicht eingeschränkt.</p></section>
    <p>Stand: 15. Oktober 2026. <Link href="/datenschutz#verantwortlicher">Betreiber und Kontakt</Link></p>
  </article></div></section></>;
}
