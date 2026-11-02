"use client";

import type { TicketStatus } from "@prisma/client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { updateTicketStatusAction } from "@/app/actions/staff";
import { ensureMutationId, initialActionResult, type ActionResult } from "@/lib/action-result";

const labels: Record<TicketStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  WAITING_USER: "Wartet auf Nutzer",
  RESOLVED: "Gelöst",
  CLOSED: "Geschlossen",
};

const transitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["WAITING_USER", "RESOLVED", "CLOSED"],
  WAITING_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

export function TicketStatusForm({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const previousStatus = useRef(status);
  const handledMutation = useRef<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, setState] = useState<ActionResult>(initialActionResult);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const formData = new FormData(event.currentTarget);
    previousStatus.current = currentStatus;
    submitting.current = true;
    setPending(true);
    try {
      setState(ensureMutationId(await updateTicketStatusAction(state, formData)));
    } catch {
      setState(ensureMutationId({ ok: false, code: "SERVER", message: "Der Status konnte nicht bestätigt werden. Lade das Ticket neu, bevor du es erneut änderst." }));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  useEffect(() => setCurrentStatus(status), [status]);
  useEffect(() => {
    if (!state.message || !state.mutationId || handledMutation.current === state.mutationId) return;
    handledMutation.current = state.mutationId;
    if (state.ok && state.data && typeof state.data === "object" && "status" in state.data) {
      setCurrentStatus(state.data.status as TicketStatus);
      setShowSuccess(true);
      const timeout = window.setTimeout(() => setShowSuccess(false), 4500);
      return () => window.clearTimeout(timeout);
    } else if (!state.ok) {
      setShowSuccess(false);
      setCurrentStatus(previousStatus.current);
    }
  }, [state]);

  const nextStates = transitions[currentStatus];
  if (!nextStates.length) return <span className="text-xs text-[var(--muted)]">Abgeschlossen</span>;
  return (
    <form
      method="post"
      className="grid gap-2"
      onSubmit={submit}
      aria-busy={pending}
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="expectedStatus" value={currentStatus} />
      <div className="flex items-center gap-2">
        <select name="status" className="field !min-h-9 !w-auto !py-1.5 text-xs" disabled={pending}>
          {nextStates.map((next) => <option key={next} value={next}>{labels[next]}</option>)}
        </select>
        <button className="button button-secondary !min-h-9 !px-3 !text-xs" disabled={pending}>
          {pending ? <><span className="submit-spinner" /> Wird aktualisiert …</> : "Setzen"}
        </button>
      </div>
      {state.message && !state.ok && <p role="alert" className="max-w-64 text-xs text-[var(--danger-ink)]">{state.message}</p>}
      {state.message && state.ok && showSuccess && <div className="mutation-toast mutation-toast-success" role="status" aria-live="polite">{state.message}</div>}
    </form>
  );
}
