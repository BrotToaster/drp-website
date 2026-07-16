"use client";

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
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-disabled={pending}
      className={"button button-" + variant}
    >
      {pending && <span className="submit-spinner" aria-hidden="true" />}
      <span aria-live="polite">{pending ? pendingText : children}</span>
    </button>
  );
}