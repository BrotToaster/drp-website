"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "primary",
  pendingText = "Wird gespeichert …",
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  pendingText?: string;
  name?: string;
  value?: string;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);
  const [refreshing, startRefresh] = useTransition();
  const { pending } = useFormStatus();
  useEffect(() => {
    if (pending) {
      submitted.current = true;
      return;
    }
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
      name={name}
      value={value}
      disabled={busy}
      aria-disabled={busy}
      className={"button button-" + variant}
    >
      {busy && <span className="submit-spinner" aria-hidden="true" />}
      <span aria-live="polite">{busy ? (refreshing ? "Ansicht wird aktualisiert …" : pendingText) : children}</span>
    </button>
  );
}
