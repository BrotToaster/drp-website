import type { MediaView } from "@/lib/demo-data";

export function MediaGallery({ media }: { media: MediaView[] }) {
  if (!media.length) return null;
  return (
    <div className="media-gallery">
      {media.map((asset) => (
        <figure key={asset.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
          {asset.kind === "IMAGE" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={asset.caption || asset.name} loading="lazy" className="max-h-[520px] w-full object-contain" />
          )}
          {asset.kind === "AUDIO" && (
            <audio controls preload="metadata" className="w-full" aria-label={asset.caption || asset.name}>
              <source src={asset.url} />
            </audio>
          )}
          {asset.kind === "VIDEO" && (
            <video controls preload="metadata" className="max-h-[520px] w-full" aria-label={asset.caption || asset.name}>
              <source src={asset.url} />
            </video>
          )}
          <figcaption className="p-3 text-xs text-[#777d81]">{asset.caption || asset.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}