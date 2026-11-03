import type { Prisma } from "@prisma/client";
type MediaMetadata = { kind: string; visibility: string; deliveryType: string };
export function isPublicMedia(asset: MediaMetadata | null | undefined) {
  return !!asset && asset.visibility === "PUBLIC" && asset.deliveryType === "upload" && asset.kind !== "DOCUMENT";
}
export function isPublicImage(asset: MediaMetadata | null | undefined) { return isPublicMedia(asset) && asset?.kind === "IMAGE"; }
export async function publicMediaSelectionAllowed(db: Pick<Prisma.TransactionClient, "mediaAsset">, ids: string[], imageId?: string) {
  const selected = Array.from(new Set([...ids, ...(imageId ? [imageId] : [])]));
  if (!selected.length) return true;
  if (selected.length > 21) return false;
  const assets = await db.mediaAsset.findMany({ where: { id: { in: selected } }, select: { id: true, kind: true, visibility: true, deliveryType: true } });
  return assets.length === selected.length && assets.every(isPublicMedia) && (!imageId || isPublicImage(assets.find(asset => asset.id === imageId)));
}
