"use client";
import { ErrorScreen } from "@/components/error-screen";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen code="500" retry={reset} digest={error.digest} />;
}
