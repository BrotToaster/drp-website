"use client";

import { useState } from "react";

export function WeeklyCopyPanel({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };
  return <div className="weekly-preview"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Discord-Vorschau</p><p className="mt-2 text-xs text-[#858b90]">Der Bot veröffentlicht nichts automatisch.</p></div><button type="button" className="button button-primary" onClick={() => void copy()}>{copied ? "Kopiert ✓" : "Discord-Text kopieren"}</button></div><pre className="mt-5 whitespace-pre-wrap text-xs leading-6 text-[#c7cacb]">{text}</pre></div>;
}
