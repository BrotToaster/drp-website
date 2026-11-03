// Adapted from Magic UI's Interactive Hover Button, discovered via 21st.dev.
// Uses a native link, one readable label and a CSS-only fill. See THIRD_PARTY_NOTICES.md.
import type { ComponentPropsWithoutRef } from "react";

export function InteractiveLink({ children, className = "", ...props }: ComponentPropsWithoutRef<"a">) {
  return <a {...props} className={`button button-primary drp-action-link ${className}`}>
    <span>{children}</span>
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
  </a>;
}
