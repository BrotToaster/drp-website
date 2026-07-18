import type { ServiceStatus, StatusSource } from "@prisma/client";
import { getPublicServerStatus } from "@/lib/erlc";
import { prisma } from "@/lib/prisma";

export type PublicStatusService = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  source: StatusSource;
  status: ServiceStatus;
  message: string | null;
  checkedAt: string | null;
};

export type PublicStatusUpdate = {
  id: string;
  serviceName: string;
  status: ServiceStatus;
  message: string | null;
  createdAt: string;
};

const severity: Record<ServiceStatus, number> = {
  OPERATIONAL: 0,
  MAINTENANCE: 1,
  DEGRADED: 2,
  PARTIAL_OUTAGE: 3,
  MAJOR_OUTAGE: 4,
  UNKNOWN: 5,
};

function mapIndicator(indicator: string): ServiceStatus {
  if (indicator === "none") return "OPERATIONAL";
  if (indicator === "minor") return "DEGRADED";
  if (indicator === "major") return "PARTIAL_OUTAGE";
  if (indicator === "critical") return "MAJOR_OUTAGE";
  if (indicator === "maintenance") return "MAINTENANCE";
  return "UNKNOWN";
}

async function platformStatus(url: string) {
  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    const body = await response.json() as { status?: { indicator?: string; description?: string } };
    return {
      status: mapIndicator(body.status?.indicator || "unknown"),
      message: body.status?.description || null,
      checkedAt: new Date(),
    };
  } catch {
    return null;
  }
}

async function automaticStatus(source: StatusSource) {
  if (source === "ERLC") {
    const server = await getPublicServerStatus();
    if (server.source === "unavailable") return null;
    return {
      status: server.online ? "OPERATIONAL" as const : "MAJOR_OUTAGE" as const,
      message: server.online
        ? `${server.players ?? "–"}/${server.maxPlayers ?? "–"} Spieler online`
        : "ER:LC Server nicht erreichbar",
      checkedAt: new Date(server.updatedAt),
    };
  }
  if (source === "DISCORD") return platformStatus("https://discordstatus.com/api/v2/status.json");
  if (source === "ROBLOX") return platformStatus("https://status.roblox.com/api/v2/status.json");
  return null;
}

export async function getPortalStatus() {
  try {
    const services = await prisma.statusService.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    const normalized = await Promise.all(services.map(async (service): Promise<PublicStatusService> => {
      if (service.source === "MANUAL") {
        return {
          id: service.id,
          key: service.key,
          name: service.name,
          description: service.description,
          source: service.source,
          status: service.manualStatus,
          message: service.lastMessage,
          checkedAt: (service.lastCheckedAt || service.updatedAt).toISOString(),
        };
      }
      const live = await automaticStatus(service.source);
      if (live) {
        await prisma.statusService.update({
          where: { id: service.id },
          data: { lastStatus: live.status, lastMessage: live.message, lastCheckedAt: live.checkedAt },
        }).catch(() => undefined);
      }
      return {
        id: service.id,
        key: service.key,
        name: service.name,
        description: service.description,
        source: service.source,
        status: live?.status || service.lastStatus || "UNKNOWN",
        message: live?.message || service.lastMessage,
        checkedAt: (live?.checkedAt || service.lastCheckedAt)?.toISOString() || null,
      };
    }));
    const updates = await prisma.statusUpdate.findMany({
      where: { public: true, service: { enabled: true } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { service: { select: { name: true } } },
    });
    const overall = normalized.reduce<ServiceStatus>(
      (current, item) => severity[item.status] > severity[current] ? item.status : current,
      "OPERATIONAL",
    );
    return {
      overall: normalized.length ? overall : "UNKNOWN" as ServiceStatus,
      checkedAt: new Date().toISOString(),
      services: normalized,
      updates: updates.map((item) => ({
        id: item.id,
        serviceName: item.service.name,
        status: item.status,
        message: item.message,
        createdAt: item.createdAt.toISOString(),
      })) satisfies PublicStatusUpdate[],
    };
  } catch {
    const erlc = await getPublicServerStatus();
    return {
      overall: erlc.online ? "OPERATIONAL" as ServiceStatus : "UNKNOWN" as ServiceStatus,
      checkedAt: erlc.updatedAt,
      services: [{
        id: "fallback-erlc",
        key: "erlc",
        name: "ER:LC Server",
        description: "Status des DRP Private Servers",
        source: "ERLC" as StatusSource,
        status: erlc.online ? "OPERATIONAL" as ServiceStatus : "UNKNOWN" as ServiceStatus,
        message: erlc.online ? `${erlc.players ?? "–"} Spieler online` : "Nicht verfügbar",
        checkedAt: erlc.updatedAt,
      }],
      updates: [] as PublicStatusUpdate[],
    };
  }
}

export const statusLabels: Record<ServiceStatus, string> = {
  OPERATIONAL: "Betriebsbereit",
  DEGRADED: "Eingeschränkt",
  PARTIAL_OUTAGE: "Teilausfall",
  MAJOR_OUTAGE: "Größere Störung",
  MAINTENANCE: "Wartung",
  UNKNOWN: "Nicht verfügbar",
};

export function statusColor(status: ServiceStatus) {
  if (status === "OPERATIONAL") return "text-[#75d7a3] bg-[#57c98c]/10 border-[#57c98c]/20";
  if (status === "MAINTENANCE") return "text-[#7fb0e8] bg-[#769fd4]/10 border-[#769fd4]/20";
  if (status === "DEGRADED") return "text-[#efc76e] bg-[#d6aa4c]/10 border-[#d6aa4c]/20";
  return "text-[#f28d8a] bg-[#ef6f6c]/10 border-[#ef6f6c]/20";
}
