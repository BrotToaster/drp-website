"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
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
  const [state, setState] = useState<ActionResult>(initialActionResult);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    submitting.current = true;
    setPending(true);
    try {
      // Keep completion independent of the router transition that revalidatePath
      // starts. In production that transition can outlive the completed mutation.
      setState(ensureMutationId(await action(state, formData)));
    } catch {
      setState(ensureMutationId({ ok: false, code: "SERVER", message: "Die Anfrage konnte nicht abgeschlossen werden. Prüfe den aktuellen Stand, bevor du erneut speicherst." }));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
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
    <form ref={formRef} method="post" onSubmit={submit} className={className} data-reliable-action="true" aria-busy={pending}>
      <FormRuntimeProvider submitting={pending}>
        <fieldset disabled={pending} className="contents">{children}</fieldset>
      </FormRuntimeProvider>
      {state.message && !state.ok && (
        <p className={"rounded-xl px-4 py-3 text-sm " + (state.ok ? "bg-[#57c98c]/10 text-[var(--success-ink)]" : "bg-[#ef6f6c]/10 text-[var(--danger-ink)]")} role={state.ok ? "status" : "alert"} aria-live="polite">
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
