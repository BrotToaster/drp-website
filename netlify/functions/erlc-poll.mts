import { refreshErlcTelemetry } from "../../lib/erlc-telemetry";

export default async function erlcPoll() {
  const result = await refreshErlcTelemetry();
  return new Response(
    JSON.stringify({
      ok: result.ok,
      busy: result.busy,
      checkedAt: result.state?.checkedAt,
      players: result.state?.currentPlayers,
    }),
    { headers: { "content-type": "application/json" } },
  );
}

export const config = {
  schedule: "*/5 * * * *",
};
