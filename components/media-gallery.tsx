import type { MediaView } from "@/lib/demo-data";

export function MediaGallery({ media }: { media: MediaView[] }) {
  if (!media.length) return null;
  return (
    <section className="mt-14 border-t border-white/[0.08] pt-10" aria-labelledby="news-media">
      <div className="mb-6">
        <p className="eyebrow">Medien</p>
        <h2 id="news-media" className="mt-2 text-2xl font-semibold">Dateien zu diesem Beitrag</h2>
      </div>
      <div className="grid gap-5">
        {media.map((asset) => (
          <figure key={asset.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0e10]">
            {asset.kind === "IMAGE" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.caption || asset.name} loading="lazy" className="max-h-[620px] w-full object-contain" />
            )}
            {asset.kind === "AUDIO" && (
              <div className="p-5"><audio controls preload="metadata" className="w-full" aria-label={asset.caption || asset.name}><source src={asset.url} /></audio></div>
            )}
            {asset.kind === "VIDEO" && (
              <video controls preload="metadata" className="max-h-[620px] w-full bg-black" aria-label={asset.caption || asset.name}><source src={asset.url} /></video>
            )}
            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] p-4 text-xs text-[#858b90]">
              <span>{asset.caption || asset.name}</span>
              <a href={asset.url} target="_blank" rel="noreferrer" className="font-semibold text-[#efc76e] hover:text-white">Original öffnen ↗</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
