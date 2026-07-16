export type ErLcPlayer = {
  Team?: string;
  Player?: string;
  Callsign?: string;
  Permission?: string;
  WantedStars?: number;
};

export type ErLcServerResponse = {
  Name?: string;
  CurrentPlayers?: number;
  MaxPlayers?: number;
  JoinKey?: string;
  Players?: ErLcPlayer[];
  Queue?: number[];
  Staff?: Record<string, Record<string, string>>;
  JoinLogs?: Array<{ Join: boolean; Timestamp: number; Player: string }>;
  CommandLogs?: Array<{ Player: string; Timestamp: number; Command: string }>;
  ModCalls?: Array<{ Caller: string; Moderator: string; Timestamp: number }>;
};

export type PublicServerStatus = {
  online: boolean;
  name: string;
  players: number | null;
  maxPlayers: number | null;
  queue: number | null;
  updatedAt: string;
  source: "live" | "demo" | "unavailable";
};

const unavailableStatus = (): PublicServerStatus => ({
  online: false,
  name: "DRP Private Server",
  players: null,
  maxPlayers: null,
  queue: null,
  updatedAt: new Date().toISOString(),
  source: "unavailable",
});

export function transformPublicStatus(
  data: ErLcServerResponse,
  source: PublicServerStatus["source"] = "live",
): PublicServerStatus {
  const players = typeof data.CurrentPlayers === "number" ? data.CurrentPlayers : 0;
  const maxPlayers = typeof data.MaxPlayers === "number" ? data.MaxPlayers : null;
  return {
    online: true,
    name: data.Name || "DRP Private Server",
    players,
    maxPlayers,
    queue: Array.isArray(data.Queue) ? data.Queue.length : 0,
    updatedAt: new Date().toISOString(),
    source,
  };
}

export const demoServerDetails: ErLcServerResponse = {
  Name: "DRP | Deutsches Roleplay",
  CurrentPlayers: 27,
  MaxPlayers: 40,
  JoinKey: "DRP2026",
  Queue: [120011, 120012],
  Players: [
    { Team: "Sheriff", Player: "DemoOfficer:1001", Callsign: "1-S-12", Permission: "Server Moderator" },
    { Team: "Civilian", Player: "LibertyCitizen:1002", Callsign: "", Permission: "Normal" },
    { Team: "Fire", Player: "MedicWest:1003", Callsign: "M-21", Permission: "Normal" },
  ],
  Staff: { Admins: { "1001": "DemoOfficer" }, Mods: {}, Helpers: {} },
  JoinLogs: [{ Join: true, Timestamp: Math.floor(Date.now() / 1000) - 120, Player: "LibertyCitizen:1002" }],
  CommandLogs: [{ Player: "DemoOfficer:1001", Timestamp: Math.floor(Date.now() / 1000) - 300, Command: ":h Willkommen bei DRP" }],
  ModCalls: [],
};

function canUseDemo() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEMO_MODE !== "false";
}

export async function getServerDetails(sensitive = false): Promise<{
  status: PublicServerStatus;
  details: ErLcServerResponse;
}> {
  const serverKey = process.env.ERLC_SERVER_KEY;

  if (!serverKey) {
    if (canUseDemo()) {
      return { status: transformPublicStatus(demoServerDetails, "demo"), details: demoServerDetails };
    }
    return { status: unavailableStatus(), details: {} };
  }

  const url = new URL("https://api.erlc.gg/v2/server");
  url.searchParams.set("Queue", "true");
  if (sensitive) {
    ["Players", "Staff", "JoinLogs", "CommandLogs", "ModCalls"].forEach((key) =>
      url.searchParams.set(key, "true"),
    );
  }

  try {
    const response = await fetch(url, {
      headers: { "server-key": serverKey },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("ER:LC API returned " + response.status);
    const details = (await response.json()) as ErLcServerResponse;
    return { status: transformPublicStatus(details), details };
  } catch {
    if (canUseDemo()) {
      return { status: transformPublicStatus(demoServerDetails, "demo"), details: demoServerDetails };
    }
    return { status: unavailableStatus(), details: {} };
  }
}

export async function getPublicServerStatus() {
  return (await getServerDetails(false)).status;
}
