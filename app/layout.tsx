import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { NavigationProgress } from "@/components/navigation-progress";
import { PublicChrome } from "@/components/route-chrome";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://drpg.up.railway.app"),
  title: { default: "DRP – Deutschland Roleplay", template: "%s | DRP" },
  description: siteConfig.description,
  icons: { icon: "/drp-logo.png", apple: "/drp-logo.png" },
  openGraph: { title: "DRP – Deutschland Roleplay", description: siteConfig.description, images: ["/brand/drp-system-social.png"], locale: "de_DE", type: "website" },
  twitter: { card: "summary_large_image", images: ["/brand/drp-system-social.png"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <PublicChrome><Header /></PublicChrome>
        <main>{children}</main>
        <PublicChrome><Footer /></PublicChrome>
      </body>
    </html>
  );
}
