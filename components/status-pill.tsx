import { getPublicServerStatus } from "@/lib/erlc";

export async function StatusPill() {
  const status = await getPublicServerStatus();
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-xs font-semibold text-[#ced0d0]">
      <span className={"status-dot" + (status.online ? "" : " offline")} />
      <span>{status.online ? "Server online" : "Status nicht verfügbar"}</span>
      {status.players !== null && (
        <>
          <span className="h-3 w-px bg-white/10" />
          <span className="text-[#efc76e]">
            {status.players}/{status.maxPlayers || "–"}
          </span>
        </>
      )}
    </div>
  );
}
