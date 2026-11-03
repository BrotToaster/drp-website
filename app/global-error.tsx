"use client";
import { ErrorScreen } from "@/components/error-screen";
import { appearanceBootScript } from "@/lib/appearance";
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="de" suppressHydrationWarning><head><title>DRP ist gerade nicht erreichbar</title><meta name="robots" content="noindex,nofollow"/><script dangerouslySetInnerHTML={{ __html: appearanceBootScript }}/></head><body style={{ margin: 0 }}><ErrorScreen code="500" retry={reset} digest={error.digest} /></body></html>;
}
