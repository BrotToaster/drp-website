"use client";

import { useActionState, useEffect, useRef } from "react";
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
  const [state, formAction] = useActionState(action, initialActionResult);
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      router.refresh();
    }
  }, [state, resetOnSuccess, router]);
  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state.message && (
        <p className={"rounded-xl px-4 py-3 text-sm " + (state.ok ? "bg-[#57c98c]/10 text-[#75d7a3]" : "bg-[#ef6f6c]/10 text-[#f28d8a]")} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
