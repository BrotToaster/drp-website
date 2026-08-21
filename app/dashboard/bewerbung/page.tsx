import { MelonlyHandoff } from "@/components/melonly-handoff";
import { PortalShell } from "@/components/portal-shell";
import { ensureDbUser, getAuthorizationContext } from "@/lib/authz";
import { getHomepageSettings } from "@/lib/site-settings";

export default async function ApplicationHandoffPage() {
  const user = await ensureDbUser();
  const [authorization, homepage] = await Promise.all([getAuthorizationContext(user.id), getHomepageSettings()]);
  return <PortalShell authorization={authorization} title="Bewerbungen" description="Bewerbungen werden vollständig und nachvollziehbar in Melonly bearbeitet.">
    <MelonlyHandoff title="Deine Bewerbung lebt in Melonly." description="Erstelle neue Bewerbungen, prüfe deinen Bearbeitungsstand und beantworte Rückfragen direkt in Melonly. DRP speichert hier keine zweite Bewerbungskopie." melonlyUrl={homepage.melonlyUrl} items={["Melonly ist die führende Quelle für Bewerbung und Bearbeitungsstatus.", "Deine DRP-Anmeldung und bestehenden Portalbereiche bleiben unverändert.", "Fragen zur Community oder zum Spielsupport stellst du weiterhin über Discord."]} />
  </PortalShell>;
}
