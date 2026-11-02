import type { MediaView } from "@/lib/demo-data";
import { ContentImage } from "@/components/content-image";
import { createElement } from "react";

export function MediaGallery({ media, headingId = "news-media", title = "Dateien zu diesem Beitrag", headingLevel = 2 }: { media: MediaView[]; headingId?: string; title?: string; headingLevel?: 2 | 5 }) {
  if (!media.length) return null;
  return (
    <section className="mt-14 border-t border-[var(--line)] pt-10" aria-labelledby={headingId}>
      <div className="mb-6">
        {createElement(`h${headingLevel}`, { id: headingId, className: "text-xl font-semibold" }, title)}
      </div>
      <div className="grid gap-5">
        {media.map((asset) => (
          <figure key={asset.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
            {asset.kind === "IMAGE" && (
              <ContentImage src={asset.url} alt={asset.caption || asset.name} className="h-auto max-h-[620px] w-full object-contain" />
            )}
            {asset.kind === "AUDIO" && (
              <div className="p-5"><audio controls preload="none" className="w-full" aria-label={asset.caption || asset.name}><source src={asset.url} /></audio></div>
            )}
            {asset.kind === "VIDEO" && (
              <video controls preload="none" className="max-h-[620px] w-full bg-black" aria-label={asset.caption || asset.name}><source src={asset.url} /></video>
            )}
            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] p-4 text-xs text-[var(--muted)]">
              <span>{asset.caption || asset.name}</span>
              <a href={asset.url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent-ink)] hover:text-[var(--text)]">Original öffnen ↗</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
