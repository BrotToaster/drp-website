import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

function sha1(input: string) {
  return createHash("sha1").update(input).digest("hex");
}

function signature(params: Record<string, string | number>) {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) throw new Error("Cloudinary ist nicht konfiguriert.");
  const serialized = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return sha1(serialized + secret);
}

export function createCloudinaryUploadSignature(resourceType: "image" | "video" | "raw") {
  if (!cloudinaryConfigured) throw new Error("Cloudinary ist nicht konfiguriert.");
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "drp-content";
  return {
    timestamp,
    folder,
    signature: signature({ folder, timestamp }),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    resourceType,
  };
}

export function verifyCloudinaryUpload(publicId: string, version: number, supplied: string) {
  const expected = signature({ public_id: publicId, version });
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function deleteCloudinaryAsset(publicId: string, resourceType: string) {
  if (!cloudinaryConfigured) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: process.env.CLOUDINARY_API_KEY!,
    signature: signature({ public_id: publicId, timestamp }),
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
    { method: "POST", body },
  );
  if (!response.ok) throw new Error("Cloudinary-Datei konnte nicht gelöscht werden.");
}