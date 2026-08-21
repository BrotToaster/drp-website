import "server-only";
import { demoServerDetails, type ErLcServerResponse } from "@/lib/erlc";
import { getOfficialErlcMapUrl } from "@/lib/erlc-map";
import { resolveErlcBackoff, toLivePlayer, type ErlcLiveMapSnapshot, type ErlcLivePlayer } from "@/lib/erlc-location";

const CACHE_MS = 10_000;
const DEFAULT_RETRY_MS = 15_000;
const AUTH_FAILURE_RETRY_MS = 5 * 60_000;

let cached: { snapshot: ErlcLiveMapSnapshot; expiresAt: number } | null = null;
let inFlight: Promise<ErlcLiveMapSnapshot> | null = null;
let blockedUntil = 0;

function demoAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEMO_MODE !== "false";
}

async function offlineSnapshot(retryAfterMs = DEFAULT_RETRY_MS): Promise<ErlcLiveMapSnapshot> {
  return {
    status: "offline",
    fetchedAt: new Date().toISOString(),
    retryAfterMs,
    mapUrl: await getOfficialErlcMapUrl({ postals: true }),
    players: [],
  };
}

async function fetchSnapshot(): Promise<ErlcLiveMapSnapshot> {
  const mapUrlPromise = getOfficialErlcMapUrl({ postals: true });
  let details: ErLcServerResponse;
  if (!process.env.ERLC_SERVER_KEY) {
    if (!demoAllowed()) return offlineSnapshot();
    details = demoServerDetails;
  } else {
    const url = new URL("https://api.erlc.gg/v2/server");
    url.searchParams.set("Players", "true");
    const response = await fetch(url, {
      headers: { "server-key": process.env.ERLC_SERVER_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const body = response.status === 429
        ? await response.json().catch(() => ({})) as { retry_after?: unknown }
        : {};
      const retryAfterMs = resolveErlcBackoff({
        retryAfter: response.headers.get("retry-after"),
        reset: response.headers.get("x-ratelimit-reset"),
        bodyRetryAfter: body.retry_after,
      }, Date.now(), response.status === 403 ? AUTH_FAILURE_RETRY_MS : DEFAULT_RETRY_MS);
      blockedUntil = Date.now() + retryAfterMs;
      const error = new Error(`ER:LC antwortete mit HTTP ${response.status}.`) as Error & { retryAfterMs?: number };
      error.retryAfterMs = retryAfterMs;
      throw error;
    }
    const remaining = Number(response.headers.get("x-ratelimit-remaining"));
    if (Number.isFinite(remaining) && remaining <= 0) {
      blockedUntil = Date.now() + resolveErlcBackoff({ reset: response.headers.get("x-ratelimit-reset") });
    }
    details = await response.json() as ErLcServerResponse;
  }
  const snapshot: ErlcLiveMapSnapshot = {
    status: "live",
    fetchedAt: new Date().toISOString(),
    mapUrl: await mapUrlPromise,
    players: (details.Players || []).map(toLivePlayer).filter((player): player is ErlcLivePlayer => Boolean(player)),
  };
  cached = { snapshot, expiresAt: Date.now() + CACHE_MS };
  return snapshot;
}

export async function getErlcLiveMapSnapshot(): Promise<ErlcLiveMapSnapshot> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.snapshot;
  if (blockedUntil > now) {
    if (cached) return { ...cached.snapshot, status: "stale", retryAfterMs: blockedUntil - now };
    return offlineSnapshot(blockedUntil - now);
  }
  if (inFlight) return inFlight;
  const request: Promise<ErlcLiveMapSnapshot> = fetchSnapshot().catch(async (error: Error & { retryAfterMs?: number }): Promise<ErlcLiveMapSnapshot> => {
    const retryAfterMs = error.retryAfterMs || DEFAULT_RETRY_MS;
    if (cached) return { ...cached.snapshot, status: "stale" as const, retryAfterMs };
    return offlineSnapshot(retryAfterMs);
  }).finally(() => { inFlight = null; });
  inFlight = request;
  return request;
}
