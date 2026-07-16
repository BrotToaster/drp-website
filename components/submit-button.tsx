"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={"button button-" + variant}
    >
      {pending ? "Wird gespeichert …" : children}
    </button>
  );
}
