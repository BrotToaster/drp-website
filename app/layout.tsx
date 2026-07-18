import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { NavigationProgress } from "@/components/navigation-progress";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://drpg.netlify.app"),
  title: { default: "DRP – Deutschland Roleplay", template: "%s | DRP" },
  description: siteConfig.description,
  icons: { icon: "/drp-logo.png", apple: "/drp-logo.png" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
