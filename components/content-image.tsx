import Image from "next/image";
import { optimizableImage } from "@/lib/image-source";

export function ContentImage({ src, alt, width = 1200, height = 800, fill = false, sizes = "(max-width: 768px) 100vw, 960px", className, priority = false }: { src: string; alt: string; width?: number; height?: number; fill?: boolean; sizes?: string; className?: string; priority?: boolean }) {
  if (src.startsWith("/api/media/internal/") && !src.startsWith("//")) {
    // The authenticated endpoint needs the visitor's cookies and must bypass the shared image cache.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={className} />;
  }
  if (!optimizableImage(src)) {
    if (!alt) return null;
    try { if (new URL(src).protocol !== "https:") return null; } catch { return null; }
    return <a className="external-image-link" href={src} target="_blank" rel="noreferrer noopener">{alt ? `${alt} – Bild beim Anbieter öffnen` : "Bild beim Anbieter öffnen"} ↗</a>;
  }
  return <Image src={src} alt={alt} {...(fill ? { fill: true } : { width, height })} sizes={sizes} className={className} priority={priority} />;
}
