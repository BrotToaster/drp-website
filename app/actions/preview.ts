"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { hostedPreviewEnabled } from "@/lib/preview-mode";
import { prisma } from "@/lib/prisma";
import { resetPreviewDatabase } from "@/prisma/preview-seed.mjs";
import type { ActionResult } from "@/lib/action-result";
import { cleanupPreview } from "@/lib/preview-maintenance";

export async function previewLoginAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!hostedPreviewEnabled()) return { ok: false, message: "Testzugang ist ausgeschaltet." };
  try {
    await signIn("preview", { role: String(formData.get("role") || ""), password: String(formData.get("password") || ""), redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, message: "Testrolle oder Passwort stimmt nicht. Nach mehreren Fehlversuchen bitte zehn Minuten warten." };
    throw error;
  }
  return { ok: true, message: "Angemeldet." };
}

export async function managePreviewAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!hostedPreviewEnabled() || session?.user?.id !== "preview-admin") return { ok: false, message: "Nur die Vorschauverwaltung darf diese Aktion ausführen." };
  try {
    if (formData.get("operation") === "reset") {
      if (formData.get("confirmation") !== "TESTDATEN") return { ok: false, message: "Zum Zurücksetzen TESTDATEN eingeben." };
      await resetPreviewDatabase(prisma, process.env.DRP_PREVIEW_DATABASE_ID);
    } else if (formData.get("operation") === "cleanup") await cleanupPreview();
    else return { ok: false, message: "Unbekannte Aktion." };
    revalidatePath("/", "layout");
    return { ok: true, message: formData.get("operation") === "reset" ? "Die ursprünglichen Testdaten sind wiederhergestellt." : "Der interne Bereinigungslauf ist abgeschlossen." };
  } catch { return { ok: false, message: "Aktion abgebrochen. Vorschaukonfiguration und Datenbankkennung prüfen." }; }
}
