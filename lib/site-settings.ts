import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";

export type HomepageDepartment = { code: string; name: string; copy: string };

export const defaultDepartments: HomepageDepartment[] = [
  { code: "POLIZEI", name: "Polizei Deutschland", copy: "Sorge mit klaren Einsatzstrukturen, Ermittlungen und bürgernahem Roleplay für Sicherheit." },
  { code: "FEUERWEHR", name: "Berufsfeuerwehr Deutschland", copy: "Rette Leben, bekämpfe Brände und koordiniere Feuerwehr- und Rettungsdiensteinsätze." },
  { code: "MOVEBERLIN", name: "MoveBerlin", copy: "Halte als Stadtwerke- und Infrastrukturdienst Straßen, Versorgung und Verkehr am Laufen." },
];

export async function getHomepageSettings() {
  try {
    const [departmentSetting, linkSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "homepage.departments" } }),
      prisma.siteSetting.findUnique({ where: { key: "public.links" } }),
    ]);
    const stored = Array.isArray(departmentSetting?.value) ? departmentSetting.value : [];
    const departments = defaultDepartments.map((fallback, index) => {
      const item = stored[index];
      if (!item || typeof item !== "object" || Array.isArray(item)) return fallback;
      const value = item as Record<string, unknown>;
      return {
        code: typeof value.code === "string" ? value.code : fallback.code,
        name: typeof value.name === "string" ? value.name : fallback.name,
        copy: typeof value.copy === "string" ? value.copy : fallback.copy,
      };
    });
    const rawLinks =
      linkSetting?.value && typeof linkSetting.value === "object" && !Array.isArray(linkSetting.value)
        ? (linkSetting.value as Record<string, unknown>)
        : {};
    return {
      departments,
      discordUrl: typeof rawLinks.discordUrl === "string" ? rawLinks.discordUrl : siteConfig.discordUrl,
      robloxUrl: typeof rawLinks.robloxUrl === "string" ? rawLinks.robloxUrl : siteConfig.robloxUrl,
    };
  } catch {
    return {
      departments: defaultDepartments,
      discordUrl: siteConfig.discordUrl,
      robloxUrl: siteConfig.robloxUrl,
    };
  }
}