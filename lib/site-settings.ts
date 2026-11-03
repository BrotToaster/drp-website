import { isPublicImage } from "./public-media";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { groupHomepageCards } from "./homepage-factions";
import { communityFactions } from "./community-assets";

export type HomepageDepartment = {
  code: string;
  name: string;
  copy: string;
  imageUrl?: string | null;
  targetUrl?: string | null;
  linkLabel?: string | null;
};

export const defaultDepartments: HomepageDepartment[] = communityFactions.slice(0, 3).map(({ code, name, copy }) => ({ code, name, copy }));

export const getHomepageSettings = cache(async function getHomepageSettings() {
  try {
    const [cards, departmentSetting, linkSetting] = await Promise.all([
      prisma.homepageRoleCard.findMany({ include: { image: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.siteSetting.findUnique({ where: { key: "homepage.departments" } }),
      prisma.siteSetting.findUnique({ where: { key: "public.links" } }),
    ]);
    const stored = Array.isArray(departmentSetting?.value) ? departmentSetting.value : [];
    const legacy = defaultDepartments.map((fallback, index) => {
      const item = stored[index];
      if (!item || typeof item !== "object" || Array.isArray(item)) return fallback;
      const value = item as Record<string, unknown>;
      return {
        code: typeof value.code === "string" ? value.code : fallback.code,
        name: typeof value.name === "string" ? value.name : fallback.name,
        copy: typeof value.copy === "string" ? value.copy : fallback.copy,
      };
    });
    const grouped = groupHomepageCards(cards, legacy);
    const factions = grouped.factions.filter(faction => faction.visible).map(({ card, ...faction }) => ({
      ...faction,
      imageUrl: isPublicImage(card?.image) ? card!.image!.secureUrl : null,
      targetUrl: card?.targetUrl ?? null,
      linkLabel: card?.linkLabel ?? null,
    }));
    const departments: HomepageDepartment[] = grouped.extraCards.filter(card => card.visible).map((card) => ({
      code: card.code,
      name: card.title,
      copy: card.description,
      imageUrl: isPublicImage(card.image) ? card.image!.secureUrl : null,
      targetUrl: card.targetUrl,
      linkLabel: card.linkLabel,
    }));
    const rawLinks = linkSetting?.value && typeof linkSetting.value === "object" && !Array.isArray(linkSetting.value)
      ? linkSetting.value as Record<string, unknown> : {};
    return {
      departments,
      factions,
      discordUrl: typeof rawLinks.discordUrl === "string" ? rawLinks.discordUrl : siteConfig.discordUrl,
      robloxUrl: typeof rawLinks.robloxUrl === "string" ? rawLinks.robloxUrl : siteConfig.robloxUrl,
      discordSupportUrl: typeof rawLinks.discordSupportUrl === "string" ? rawLinks.discordSupportUrl : (typeof rawLinks.discordUrl === "string" ? rawLinks.discordUrl : siteConfig.discordUrl),
      melonlyUrl: typeof rawLinks.melonlyUrl === "string" ? rawLinks.melonlyUrl : "https://melonly.xyz/dashboard",
    };
  } catch {
    return { departments: [] as HomepageDepartment[], factions: groupHomepageCards([]).factions.map(({ code, logo, name, copy, visible, sortOrder }) => ({ code, logo, name, copy, visible, sortOrder, imageUrl: null, targetUrl: null, linkLabel: null })), discordUrl: siteConfig.discordUrl, robloxUrl: siteConfig.robloxUrl, discordSupportUrl: siteConfig.discordUrl, melonlyUrl: "https://melonly.xyz/dashboard" };
  }
});
