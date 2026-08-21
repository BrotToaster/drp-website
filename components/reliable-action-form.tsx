"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormRuntimeProvider } from "@/components/form-runtime-context";
import type { ActionResult } from "@/lib/action-result";
import { ensureMutationId, initialActionResult } from "@/lib/action-result";

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
  const handledMutation = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [, startRefresh] = useTransition();
  const normalizedAction = useCallback(async (previous: ActionResult, formData: FormData) => {
    return ensureMutationId(await action(previous, formData));
  }, [action]);
  const [state, formAction, pending] = useActionState(normalizedAction, initialActionResult);
  useEffect(() => {
    if (!state.message || !state.mutationId || handledMutation.current === state.mutationId) return;
    handledMutation.current = state.mutationId;
    setVisible(true);
    const hideToast = window.setTimeout(() => setVisible(false), state.ok ? 5500 : 9000);
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      const legacyTarget = (state.data as { navigateTo?: string } | undefined)?.navigateTo;
      const target = state.target || legacyTarget;
      if (target || state.refresh === "navigate") {
        const mutationId = state.mutationId || crypto.randomUUID();
        const url = new URL(target || window.location.href, window.location.href);
        url.searchParams.set("saved", mutationId);
        router.push(`${url.pathname}${url.search}${url.hash}`);
        const watchdog = window.setTimeout(() => window.location.assign(url.toString()), 8000);
        return () => { window.clearTimeout(watchdog); window.clearTimeout(hideToast); };
      }
      if (state.refresh === "soft") startRefresh(() => router.refresh());
    }
    return () => window.clearTimeout(hideToast);
  }, [state, resetOnSuccess, router, startRefresh]);
  return (
    <form ref={formRef} action={formAction} className={className} data-reliable-action="true">
      <FormRuntimeProvider>
        <fieldset disabled={pending} className="contents">{children}</fieldset>
      </FormRuntimeProvider>
      {state.message && !state.ok && (
        <p className={"rounded-xl px-4 py-3 text-sm " + (state.ok ? "bg-[#57c98c]/10 text-[#75d7a3]" : "bg-[#ef6f6c]/10 text-[#f28d8a]")} role={state.ok ? "status" : "alert"} aria-live="polite">
          {state.message}
        </p>
      )}
      {state.message && visible && (
        <div className={"mutation-toast " + (state.ok ? "mutation-toast-success" : "mutation-toast-error")} role={state.ok ? "status" : "alert"} aria-live="polite">
          {state.message}
        </div>
      )}
    </form>
  );
}
