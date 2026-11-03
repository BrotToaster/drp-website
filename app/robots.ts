import type { MetadataRoute } from "next";
import { getLegalSettings, legalPublicationReady } from "@/lib/legal-settings";
import { indexingRequested, siteOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!indexingRequested() || !legalPublicationReady(await getLegalSettings())) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/staff/", "/dashboard/", "/login", "/registrieren", "/kontakt/"] }, sitemap: new URL("/sitemap.xml", siteOrigin()).href };
}
