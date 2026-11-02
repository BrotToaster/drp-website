import { getPublicServerStatus } from "@/lib/erlc";

export async function StatusPill() {
  const status = await getPublicServerStatus();
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--muted)]">
      <span className={"status-dot" + (status.online ? "" : " offline")} />
      <span>{status.online ? "Server online" : "Status nicht verfügbar"}</span>
      {status.players !== null && (
        <>
          <span className="h-3 w-px bg-[var(--surface-soft)]" />
          <span className="text-[var(--accent-ink)]">
            {status.players}/{status.maxPlayers || "–"}
          </span>
        </>
      )}
    </div>
  );
}
