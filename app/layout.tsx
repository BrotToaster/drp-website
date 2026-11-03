import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
import "./apple.css";
import "./appearance.css";
import "./reading.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { NavigationProgress } from "@/components/navigation-progress";
import { PublicChrome } from "@/components/route-chrome";
import { RouteMotion } from "@/components/route-motion";
import { siteConfig } from "@/lib/site";
import { getLegalSettings, legalPublicationReady } from "@/lib/legal-settings";
import { indexingRequested, siteOrigin } from "@/lib/site-origin";
import { socialImage } from "@/lib/metadata";
import { NativeActionForms } from "@/components/native-action-forms";
import { appearanceBootScript } from "@/lib/appearance";
import { SiteScroll } from "@/components/site-scroll";
import { hostedPreviewEnabled } from "@/lib/preview-mode";
import { PreviewNotice } from "@/components/preview-notice";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#8b4f2c", colorScheme: "light dark" };

export async function generateMetadata(): Promise<Metadata> {
  const legal = await getLegalSettings();
  const index = indexingRequested() && legalPublicationReady(legal);
  return {
    metadataBase: siteOrigin(),
    title: { default: "DRP – Deutschland Roleplay", template: "%s | DRP" },
    description: siteConfig.description,
    icons: { icon: [{ url: "/favicon.ico", sizes: "32x32" }, { url: "/icon.png", type: "image/png", sizes: "192x192" }], apple: "/apple-icon.png" },
    openGraph: { title: "DRP – Deutschland Roleplay", description: siteConfig.description, images: [socialImage], locale: "de_DE", type: "website", siteName: "Deutschland Roleplay" },
    twitter: { card: "summary_large_image", images: [socialImage.url] },
    robots: { index, follow: index },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" data-hosted-preview={hostedPreviewEnabled() ? "true" : undefined} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: appearanceBootScript }} /></head>
      <body>
        {hostedPreviewEnabled() && <PreviewNotice />}
        {process.env.NODE_ENV === "production" && <NativeActionForms />}
        <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
        <Suspense fallback={null}>
          <NavigationProgress />
          <RouteMotion />
          <SiteScroll />
        </Suspense>
        <PublicChrome><Header /></PublicChrome>
        <main id="main-content">{children}</main>
        <PublicChrome><Footer /></PublicChrome>
      </body>
    </html>
  );
}
