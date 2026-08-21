"use client";

import { useActionState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { createGuestTicketAction } from "@/app/actions/guest-tickets";
import { ensureMutationId, type ActionResult } from "@/lib/action-result";

const initial: ActionResult<{ accessUrl: string }> = { ok: true, message: "" };

function GuestSubmit() {
  const { pending } = useFormStatus();
  return <button className="button button-primary" disabled={pending} type="submit">{pending ? "Ticket wird erstellt …" : "Sicheres Ticket erstellen"}</button>;
}

export function GuestTicketForm() {
  const normalizedAction = useCallback(async (previous: ActionResult<{ accessUrl: string }>, formData: FormData) => {
    return ensureMutationId(await createGuestTicketAction(previous, formData));
  }, []);
  const [state, action] = useActionState(normalizedAction, initial);
  if (state.ok && state.data?.accessUrl) {
    const url = typeof window === "undefined" ? state.data.accessUrl : new URL(state.data.accessUrl, window.location.origin).toString();
    return <div className="guest-ticket-success" role="status"><span className="badge badge-success">Ticket erstellt</span><h2>Dein sicherer Zugangslink</h2><p>{state.message}</p><div className="guest-access-link"><code>{url}</code><button type="button" onClick={() => navigator.clipboard.writeText(url)}>Kopieren</button></div><a className="button button-primary" href={state.data.accessUrl}>Ticket jetzt öffnen</a><small>Ohne diesen Link können wir den Gastzugang nicht wiederherstellen. Teile ihn mit niemandem.</small></div>;
  }
  return <form action={action} className="surface guest-ticket-form">
    <div><span className="eyebrow">Website-Kontakt</span><h2>Kontakt oder technische Frage</h2><p>Für Spielsupport, Reports, Appeals und Bewerbungen nutze bitte Discord beziehungsweise Melonly.</p></div>
    <div className="guest-form-grid">
      <label className="field-label">Dein Name<input className="field" name="displayName" minLength={2} maxLength={80} required autoComplete="name" /></label>
      <label className="field-label">Discord-Name <span>(optional)</span><input className="field" name="discordContact" maxLength={100} placeholder="name oder @name" /></label>
      <label className="field-label">Kategorie<select className="field" name="category" defaultValue="CONTACT"><option value="CONTACT">Kontaktaufnahme</option><option value="TECHNICAL">Technische Frage</option></select></label>
      <label className="field-label">Betreff<input className="field" name="subject" minLength={5} maxLength={100} required /></label>
      <label className="field-label guest-form-message">Nachricht<textarea className="field" name="message" minLength={20} maxLength={4000} required placeholder="Beschreibe dein Anliegen möglichst genau …" /></label>
      <label className="guest-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
    {!state.ok && <p className="form-error" role="alert">{state.message}</p>}
    <div className="guest-form-footer"><GuestSubmit /><p>Mit dem Absenden erhältst du einen privaten Zugriffslink. Es ist keine E-Mail-Adresse erforderlich.</p></div>
  </form>;
}
