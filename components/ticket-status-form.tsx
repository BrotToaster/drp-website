"use client";

import type { TicketStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { updateTicketStatusAction } from "@/app/actions/staff";
import { initialActionResult } from "@/lib/action-result";

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
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTicketStatusAction, initialActionResult);
  useEffect(() => {
    if (state.message) router.refresh();
  }, [router, state]);

  const nextStates = transitions[status];
  if (!nextStates.length) return <span className="text-xs text-[#666c70]">Abgeschlossen</span>;
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="expectedStatus" value={status} />
      <div className="flex items-center gap-2">
        <select name="status" className="field !min-h-9 !w-auto !py-1.5 text-xs" disabled={pending}>
          {nextStates.map((next) => <option key={next} value={next}>{labels[next]}</option>)}
        </select>
        <button className="button button-secondary !min-h-9 !px-3 !text-xs" disabled={pending}>
          {pending ? <><span className="submit-spinner" /> Aktualisiert …</> : "Setzen"}
        </button>
      </div>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={"max-w-64 text-xs " + (state.ok ? "text-[#75d7a3]" : "text-[#f28d8a]")}>
          {state.message}
        </p>
      )}
    </form>
  );
}