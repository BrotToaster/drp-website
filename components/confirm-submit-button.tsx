"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  children,
  message,
  className = "button button-danger",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);
  const [refreshing, startRefresh] = useTransition();
  const { pending } = useFormStatus();
  useEffect(() => {
    if (pending) { submitted.current = true; return; }
    if (!submitted.current) return;
    submitted.current = false;
    if (buttonRef.current?.closest("form")?.dataset.reliableAction === "true") return;
    startRefresh(() => router.refresh());
  }, [pending, router]);
  const busy = pending || refreshing;
  return (
    <button
      ref={buttonRef}
      type="submit"
      className={className}
      disabled={busy}
      aria-disabled={busy}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {busy && <span className="submit-spinner" aria-hidden="true" />}
      <span aria-live="polite">{busy ? (refreshing ? "Ansicht wird aktualisiert …" : "Wird gelöscht …") : children}</span>
    </button>
  );
}
