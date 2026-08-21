import type { ErLcPlayer } from "@/lib/erlc";

export const ERLC_MAP_SIZE = 3121;

export type ErlcLivePlayer = {
  robloxUserId: string;
  username: string;
  team: string;
  callsign?: string;
  wantedStars: number;
  location: {
    x: number;
    z: number;
    postalCode?: string;
    streetName?: string;
    buildingNumber?: string;
  };
};

export type ErlcLiveMapSnapshot = {
  status: "live" | "stale" | "offline";
  fetchedAt: string;
  retryAfterMs?: number;
  mapUrl: string;
  players: ErlcLivePlayer[];
};

export function parseErlcPlayerIdentity(value: string | undefined) {
  const input = (value || "").trim();
  const match = input.match(/^(.+):(\d+)$/);
  return match
    ? { username: match[1], robloxUserId: match[2] }
    : { username: input || "Unbekannt", robloxUserId: "" };
}

export function toLivePlayer(player: ErLcPlayer): ErlcLivePlayer | null {
  const x = player.Location?.LocationX;
  const z = player.Location?.LocationZ;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const identity = parseErlcPlayerIdentity(player.Player);
  return {
    ...identity,
    team: player.Team || "Unbekannt",
    callsign: player.Callsign || undefined,
    wantedStars: Math.max(0, Number(player.WantedStars) || 0),
    location: {
      x: Number(x),
      z: Number(z),
      postalCode: player.Location?.PostalCode || undefined,
      streetName: player.Location?.StreetName || undefined,
      buildingNumber: player.Location?.BuildingNumber || undefined,
    },
  };
}

export function projectErlcLocation(x: number, z: number) {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const center = ERLC_MAP_SIZE / 2;
  return {
    left: clamp(((center + x) / ERLC_MAP_SIZE) * 100),
    top: clamp(((center + z) / ERLC_MAP_SIZE) * 100),
  };
}

export function parseRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export function parseRateLimitReset(value: string | null, now = Date.now()) {
  if (!value) return null;
  const epochSeconds = Number(value);
  if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) return null;
  return Math.max(0, Math.ceil(epochSeconds * 1000 - now));
}

export function resolveErlcBackoff(
  values: { retryAfter?: string | null; reset?: string | null; bodyRetryAfter?: unknown },
  now = Date.now(),
  fallbackMs = 15_000,
) {
  const fromHeader = parseRetryAfter(values.retryAfter || null, now);
  if (fromHeader !== null) return fromHeader;
  const fromBody = Number(values.bodyRetryAfter);
  if (Number.isFinite(fromBody) && fromBody >= 0) return Math.ceil(fromBody * 1000);
  return parseRateLimitReset(values.reset || null, now) ?? fallbackMs;
}
