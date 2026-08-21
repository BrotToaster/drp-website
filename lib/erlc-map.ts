import "server-only";
import { prisma } from "@/lib/prisma";

const MAPS_URL = "https://api.erlc.gg/maps";
const FALLBACK_MAP = "https://api.erlc.gg/maps/fall_blank.png";

function chooseMap(urls: string[], postals = false) {
  const valid = urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && parsed.hostname === "api.erlc.gg" && parsed.pathname.startsWith("/maps/");
    } catch {
      return false;
    }
  });
  const candidates = valid.filter((url) => postals === url.toLowerCase().includes("postal"));
  const month = new Date().getUTCMonth();
  const winter = month === 11 || month <= 1;
  return candidates.find((url) => winter ? /snow|winter/i.test(url) : !/snow|winter/i.test(url))
    || candidates[0]
    || FALLBACK_MAP;
}

export async function getOfficialErlcMapUrl({ postals = false }: { postals?: boolean } = {}) {
  let stored: string | null = null;
  let storedPostal: string | null = null;
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "erlc.map-cache" } });
    const value = setting?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const url = (value as Record<string, unknown>).url;
      const postalUrl = (value as Record<string, unknown>).postalUrl;
      if (typeof url === "string") stored = url;
      if (typeof postalUrl === "string") storedPostal = postalUrl;
    }
  } catch {
    // The official fallback still keeps the public page usable before the DB is ready.
  }

  try {
    const response = await fetch(MAPS_URL, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return (postals ? storedPostal : stored) || FALLBACK_MAP;
    const body = await response.json() as { maps?: unknown };
    const maps = Array.isArray(body.maps) ? body.maps.filter((item): item is string => typeof item === "string") : [];
    const url = chooseMap(maps);
    const postalUrl = chooseMap(maps, true);
    if (url !== stored || postalUrl !== storedPostal) {
      await prisma.siteSetting.upsert({
        where: { key: "erlc.map-cache" },
        update: { value: { url, postalUrl, checkedAt: new Date().toISOString() } },
        create: { key: "erlc.map-cache", value: { url, postalUrl, checkedAt: new Date().toISOString() } },
      }).catch(() => undefined);
    }
    return postals ? postalUrl : url;
  } catch {
    return (postals ? storedPostal : stored) || FALLBACK_MAP;
  }
}
