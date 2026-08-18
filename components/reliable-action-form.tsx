"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { initialActionResult } from "@/lib/action-result";

export function ReliableActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (previous: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handledState = useRef<ActionResult | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [state, formAction] = useActionState(action, initialActionResult);
  useEffect(() => {
    if (!state.message || handledState.current === state) return;
    handledState.current = state;
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      const navigateTo = (state.data as { navigateTo?: string } | undefined)?.navigateTo;
      startRefresh(() => {
        if (navigateTo) router.push(navigateTo);
        else router.refresh();
      });
    }
  }, [state, resetOnSuccess, router, startRefresh]);
  return (
    <form ref={formRef} action={formAction} className={className} data-reliable-action="true">
      <fieldset disabled={refreshing} className="contents">
        {children}
      </fieldset>
      {state.message && (
        <p className={"rounded-xl px-4 py-3 text-sm " + (state.ok ? "bg-[#57c98c]/10 text-[#75d7a3]" : "bg-[#ef6f6c]/10 text-[#f28d8a]")} role={state.ok ? "status" : "alert"} aria-live="polite">
          {state.message}
        </p>
      )}
      {state.message && (
        <div className={"mutation-toast " + (state.ok ? "mutation-toast-success" : "mutation-toast-error")} role={state.ok ? "status" : "alert"} aria-live="polite">
          {refreshing ? "Ansicht wird aktualisiert …" : state.message}
        </div>
      )}
    </form>
  );
}
