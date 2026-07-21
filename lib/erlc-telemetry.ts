import { Prisma } from "@prisma/client";
import { demoServerDetails, type ErLcServerResponse } from "@/lib/erlc";
import { prisma } from "@/lib/prisma";

type DetailedResponse = ErLcServerResponse & {
  KillLogs?: unknown[];
  EmergencyCalls?: unknown[];
  Vehicles?: unknown[];
};

const STATE_ID = "primary";
const LEASE_MS = 30_000;

function demoAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEMO_MODE !== "false";
}

function countStaff(staff: DetailedResponse["Staff"]) {
  if (!staff || typeof staff !== "object") return 0;
  return Object.values(staff).reduce(
    (total, group) => total + (group && typeof group === "object" ? Object.keys(group).length : 0),
    0,
  );
}

function cleanDetails(details: DetailedResponse): Prisma.InputJsonValue {
  const safe = { ...details };
  delete safe.JoinKey;
  return JSON.parse(JSON.stringify(safe)) as Prisma.InputJsonValue;
}

async function fetchServer(detailed: boolean): Promise<DetailedResponse> {
  if (!process.env.ERLC_SERVER_KEY) {
    if (demoAllowed()) return demoServerDetails;
    throw new Error("ERLC_SERVER_KEY fehlt.");
  }
  const url = new URL("https://api.erlc.gg/v2/server");
  url.searchParams.set("Queue", "true");
  if (detailed) {
    for (const key of [
      "Players",
      "Staff",
      "JoinLogs",
      "KillLogs",
      "CommandLogs",
      "ModCalls",
      "EmergencyCalls",
      "Vehicles",
    ]) {
      url.searchParams.set(key, "true");
    }
  }
  const response = await fetch(url, {
    headers: { "server-key": process.env.ERLC_SERVER_KEY },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`ER:LC antwortete mit HTTP ${response.status}.`);
  return (await response.json()) as DetailedResponse;
}

export async function refreshErlcTelemetry() {
  const now = new Date();
  await prisma.erlcServerState.upsert({
    where: { id: STATE_ID },
    create: { id: STATE_ID },
    update: {},
  });
  const lease = await prisma.erlcServerState.updateMany({
    where: {
      id: STATE_ID,
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    data: { leaseUntil: new Date(now.getTime() + LEASE_MS) },
  });
  if (!lease.count) {
    return { ok: false as const, busy: true as const, state: await prisma.erlcServerState.findUnique({ where: { id: STATE_ID } }) };
  }

  try {
    const base = await fetchServer(false);
    const players = Math.max(0, Number(base.CurrentPlayers) || 0);
    const details = players > 0 ? await fetchServer(true) : base;
    const queueCount = Array.isArray(details.Queue) ? details.Queue.length : 0;
    const staffCount = countStaff(details.Staff);
    const vehicleCount = Array.isArray(details.Vehicles) ? details.Vehicles.length : 0;
    const emergencyCount = Array.isArray(details.EmergencyCalls) ? details.EmergencyCalls.length : 0;
    const modCallCount = Array.isArray(details.ModCalls) ? details.ModCalls.length : 0;
    const source = demoAllowed() && !process.env.ERLC_SERVER_KEY ? "demo" : "live";

    const [state] = await prisma.$transaction([
      prisma.erlcServerState.update({
        where: { id: STATE_ID },
        data: {
          online: true,
          source,
          name: details.Name || "DRP Private Server",
          currentPlayers: players,
          maxPlayers: typeof details.MaxPlayers === "number" ? details.MaxPlayers : null,
          queueCount,
          staffCount,
          vehicleCount,
          emergencyCount,
          modCallCount,
          currentDetails: players > 0 ? cleanDetails(details) : Prisma.JsonNull,
          checkedAt: now,
          lastSuccessfulAt: now,
          errorMessage: null,
          leaseUntil: null,
        },
      }),
      prisma.erlcMetricSnapshot.create({
        data: {
          players,
          maxPlayers: typeof details.MaxPlayers === "number" ? details.MaxPlayers : null,
          queueCount,
          staffCount,
          vehicleCount,
          emergencyCount,
          modCallCount,
          capturedAt: now,
        },
      }),
      prisma.statusService.updateMany({
        where: { key: "erlc" },
        data: { lastStatus: "OPERATIONAL", lastCheckedAt: now, lastMessage: null },
      }),
    ]);
    return { ok: true as const, busy: false as const, state };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ER:LC konnte nicht geprüft werden.";
    const state = await prisma.erlcServerState.update({
      where: { id: STATE_ID },
      data: { checkedAt: now, errorMessage: message, source: "unavailable", leaseUntil: null },
    });
    await prisma.statusService.updateMany({
      where: { key: "erlc" },
      data: { lastStatus: "UNKNOWN", lastCheckedAt: now, lastMessage: "Letzte Prüfung fehlgeschlagen." },
    });
    return { ok: false as const, busy: false as const, state, error: message };
  }
}

export async function getStoredErlcTelemetry() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [state, snapshots] = await Promise.all([
    prisma.erlcServerState.findUnique({ where: { id: STATE_ID } }),
    prisma.erlcMetricSnapshot.findMany({
      where: { capturedAt: { gte: since } },
      orderBy: { capturedAt: "asc" },
      take: 288,
    }),
  ]);
  return { state, snapshots };
}

export async function cleanupErlcTelemetry(days = 30) {
  return prisma.erlcMetricSnapshot.deleteMany({
    where: { capturedAt: { lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
  });
}
