"use client";

import { useActionState } from "react";
import { previewLoginAction } from "@/app/actions/preview";
import { SubmitButton } from "./submit-button";
import type { ActionResult } from "@/lib/action-result";

const initial: ActionResult = { ok: true, message: "" };
export function PreviewLogin() {
  const [state, action] = useActionState(previewLoginAction, initial);
  return <section className="container-shell preview-login-shell"><div className="surface preview-login">
    <h1>DRP ausprobieren.</h1>
    <p>Wähle deinen Testzugang. Alle Konten und Inhalte dieser Vorschau sind Beispieldaten.</p>
    <form action={action} data-intro="account">
      <label className="field-label">Testrolle<select className="field" name="role"><option value="member">Mitglied</option><option value="staff">Team</option><option value="admin">Administration</option></select></label>
      <label className="field-label">Passwort für diese Testrolle<input className="field" type="password" name="password" autoComplete="current-password" required minLength={20} maxLength={256}/></label>
      {!state.ok && <p role="alert" className="form-error">{state.message}</p>}
      <SubmitButton variant="primary" pendingText="Testkonto wird geöffnet …">Testkonto öffnen</SubmitButton>
    </form>
    <p className="preview-login-help">Die Zugangsdaten bekommst du vom Betreiber. Echte Discord- und Roblox-Konten werden hier nicht verbunden.</p>
  </div></section>;
}
