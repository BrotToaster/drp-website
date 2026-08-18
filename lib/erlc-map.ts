import "server-only";
import { prisma } from "@/lib/prisma";

const MAPS_URL = "https://api.erlc.gg/maps";
const FALLBACK_MAP = "https://api.erlc.gg/maps/fall_blank.png";

function chooseMap(urls: string[]) {
  const valid = urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && parsed.hostname === "api.erlc.gg" && parsed.pathname.startsWith("/maps/");
    } catch {
      return false;
    }
  });
  const withoutPostals = valid.filter((url) => !url.toLowerCase().includes("postal"));
  const month = new Date().getUTCMonth();
  const winter = month === 11 || month <= 1;
  return withoutPostals.find((url) => winter ? /snow|winter/i.test(url) : !/snow|winter/i.test(url))
    || withoutPostals[0]
    || FALLBACK_MAP;
}

export async function getOfficialErlcMapUrl() {
  let stored: string | null = null;
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "erlc.map-cache" } });
    const value = setting?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const url = (value as Record<string, unknown>).url;
      if (typeof url === "string") stored = url;
    }
  } catch {
    // The official fallback still keeps the public page usable before the DB is ready.
  }

  try {
    const response = await fetch(MAPS_URL, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return stored || FALLBACK_MAP;
    const body = await response.json() as { maps?: unknown };
    const url = chooseMap(Array.isArray(body.maps) ? body.maps.filter((item): item is string => typeof item === "string") : []);
    if (url !== stored) {
      await prisma.siteSetting.upsert({
        where: { key: "erlc.map-cache" },
        update: { value: { url, checkedAt: new Date().toISOString() } },
        create: { key: "erlc.map-cache", value: { url, checkedAt: new Date().toISOString() } },
      }).catch(() => undefined);
    }
    return url;
  } catch {
    return stored || FALLBACK_MAP;
  }
}
