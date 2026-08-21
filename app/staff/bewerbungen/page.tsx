import { MelonlyHandoff } from "@/components/melonly-handoff";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { getHomepageSettings } from "@/lib/site-settings";

export default async function StaffApplicationHandoffPage() {
  const { authorization } = await requirePermission("staff.access");
  const homepage = await getHomepageSettings();
  return <PortalShell authorization={authorization} title="Bewerbungen" description="Prüfung, Kommunikation und Entscheidungen bleiben zentral in Melonly." section="staff">
    <MelonlyHandoff title="Bewerbungen sicher in Melonly bearbeiten." description="Diese Seite dient als klarer Einstieg und erzeugt keine konkurrierenden Datensätze. Öffne Melonly für Listen, Details, Rückfragen und Entscheidungen." melonlyUrl={homepage.melonlyUrl} items={["Status, Prüfschritte und Entscheidungen werden ausschließlich in Melonly gepflegt.", "Das DRP-Portal kann künftig nur freigegebene Kennzahlen spiegeln.", "Verantwortlichkeiten und Audit-Verlauf bleiben an einer Stelle nachvollziehbar."]} />
  </PortalShell>;
}
