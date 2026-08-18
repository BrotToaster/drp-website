"use client";

import { useFormStatus } from "react-dom";
import { useFormRuntime } from "@/components/form-runtime-context";

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
  const { pending } = useFormStatus();
  const { uploadBusy } = useFormRuntime();
  const busy = pending || uploadBusy;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={busy}
      aria-disabled={busy}
      className={"button button-" + variant}
    >
      {busy && <span className="submit-spinner" aria-hidden="true" />}
      <span aria-live="polite">{busy ? (uploadBusy && !pending ? "Upload läuft …" : pendingText) : children}</span>
    </button>
  );
}
