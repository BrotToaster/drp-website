import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hostedPreviewEnabled } from "@/lib/preview-mode";
import { requirePermission } from "@/lib/authz";
import { managePreviewAction } from "@/app/actions/preview";
import { PortalShell } from "@/components/portal-shell";
import { ReliableActionForm } from "@/components/reliable-action-form";
import { SubmitButton } from "@/components/submit-button";

export default async function PreviewAdminPage() {
  if (!hostedPreviewEnabled() || (await auth())?.user?.id !== "preview-admin") notFound();
  const { authorization } = await requirePermission("admin.access");
  return <PortalShell authorization={authorization} title="Entscheidungsvorschau" description="Testdaten verwalten. Diese Aktionen erreichen keinen echten Communitybestand." section="admin">
    <section className="surface p-6"><h2 className="text-lg font-semibold">Beispielstand wiederherstellen</h2><p className="mt-3 mb-5">Damit werden alle Änderungen dieser Vorschau verworfen. Konten, Tickets, Regeln, Dokumente und Termine werden neu als Testdaten angelegt.</p>
      <ReliableActionForm action={managePreviewAction} className="grid gap-4"><input type="hidden" name="operation" value="reset"/><label className="field-label">Zur Bestätigung TESTDATEN eingeben<input className="field" name="confirmation" required pattern="TESTDATEN" autoComplete="off"/></label><SubmitButton variant="danger" pendingText="Testdaten werden wiederhergestellt …">Testdaten zurücksetzen</SubmitButton></ReliableActionForm>
    </section>
    <section className="surface p-6 mt-6"><h2 className="text-lg font-semibold">Internen Bereinigungslauf testen</h2><p className="mt-3 mb-5">Entfernt abgelaufene Zugriffslimits und alte Testprotokolle. Kein Discord-, Roblox-, Melonly- oder Cloudinary-Aufruf.</p><ReliableActionForm action={managePreviewAction}><input type="hidden" name="operation" value="cleanup"/><SubmitButton variant="secondary">Bereinigung ausführen</SubmitButton></ReliableActionForm></section>
  </PortalShell>;
}
