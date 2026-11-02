import type { Metadata } from "next";

export const socialImage = {
  url: "/brand/drp-share-v2.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Deutschland Roleplay – Dein Einsatz. Deine Geschichte. Mit DRP-Logo und Karte von Liberty County.",
};

export const homeShareDescription = "Deutsches Roleplay in Liberty County. Berufe, Events und eine Community mit klaren Regeln. Finde deinen Einstieg bei DRP.";

export function publicMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "DRP · Deutschland Roleplay", locale: "de_DE", type: "website", images: [socialImage] },
    twitter: { card: "summary_large_image", title, description, images: [{ url: socialImage.url, alt: socialImage.alt }] },
  };
}
