import { MelonlyHandoff } from "@/components/melonly-handoff";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { getHomepageSettings } from "@/lib/site-settings";

export default async function SanctionsHandoffPage() {
  const { authorization } = await requirePermission("staff.access");
  const homepage = await getHomepageSettings();
  return <PortalShell authorization={authorization} title="Moderationsmaßnahmen" description="Warnungen, Appeals und Sanktionen werden ausschließlich in Melonly geführt." section="staff">
    <MelonlyHandoff title="Moderation bleibt eine Melonly-Aufgabe." description="Öffne Melonly, um Ingame-Warns, Sanktionen, Appeals und deren Verlauf einzusehen oder zu bearbeiten. Das DRP-Portal legt bewusst keine lokale Spielerakte an." melonlyUrl={homepage.melonlyUrl} items={["Keine Sanktion und kein Warn wird in der Website dupliziert.", "Identitäten können im Betriebsbereich nur lesend zusammengeführt werden.", "Die bisherige DRP-URL bleibt als Übergabeseite erhalten."]} />
  </PortalShell>;
}
