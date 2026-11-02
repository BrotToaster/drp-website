"use client";

import { useEffect } from "react";

export function NativeActionForms() {
  useEffect(() => {
    const reset = () => {
      for (const form of document.querySelectorAll<HTMLFormElement>('form[data-submitting="true"]')) {
        delete form.dataset.submitting;
        form.removeAttribute("aria-busy");
        form.querySelectorAll('[data-native-submitter="true"]').forEach(input => input.remove());
      }
    };
    reset();
    const submit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || event.defaultPrevented) return;
      // These are progressive HTML forms generated from server functions. Let
      // the browser perform their POST and follow redirects, so an RSC router
      // transition cannot keep a completed save or redirect suspended.
      // Client-controlled forms have no $ACTION_ID/$ACTION_REF field and keep
      // their inline validation, upload state and success feedback.
      if (!form.querySelector('input[name^="$ACTION_ID_"], input[name^="$ACTION_REF_"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (form.dataset.submitting === "true") return;
      form.dataset.submitting = "true";
      form.setAttribute("aria-busy", "true");
      const button = event.submitter;
      if ((button instanceof HTMLButtonElement || button instanceof HTMLInputElement) && button.name) {
        const value = document.createElement("input");
        value.type = "hidden";
        value.name = button.name;
        value.value = button.value;
        value.dataset.nativeSubmitter = "true";
        form.append(value);
      }
      HTMLFormElement.prototype.submit.call(form);
    };
    document.addEventListener("submit", submit, true);
    window.addEventListener("pageshow", reset);
    return () => {
      document.removeEventListener("submit", submit, true);
      window.removeEventListener("pageshow", reset);
    };
  }, []);
  return null;
}
