"use client";

import { useState } from "react";

type Asset = { id: string; url: string; kind: "IMAGE" | "AUDIO" | "VIDEO"; name?: string };

export function MediaUploader({
  inputName = "mediaIds",
  initialAssets = [],
  single = false,
}: {
  inputName?: string;
  initialAssets?: Asset[];
  single?: boolean;
}) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setStatus("Upload läuft …");
    try {
      const uploaded: Asset[] = [];
      for (const file of Array.from(files)) {
        const signResponse = await fetch("/api/media/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: file.name, mimeType: file.type, bytes: file.size }),
        });
        const signed = await signResponse.json();
        if (!signResponse.ok) throw new Error(signed.error || "Upload nicht erlaubt.");

        const body = new FormData();
        body.append("file", file);
        body.append("api_key", signed.apiKey);
        body.append("timestamp", String(signed.timestamp));
        body.append("folder", signed.folder);
        body.append("signature", signed.signature);
        const cloudResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
          { method: "POST", body },
        );
        const cloud = await cloudResponse.json();
        if (!cloudResponse.ok) throw new Error(cloud.error?.message || "Cloudinary-Upload fehlgeschlagen.");

        const completeResponse = await fetch("/api/media/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            publicId: cloud.public_id,
            secureUrl: cloud.secure_url,
            resourceType: cloud.resource_type,
            kind: signed.kind,
            mimeType: file.type,
            originalName: file.name,
            bytes: cloud.bytes,
            width: cloud.width,
            height: cloud.height,
            duration: cloud.duration,
            version: cloud.version,
            signature: cloud.signature,
          }),
        });
        const complete = await completeResponse.json();
        if (!completeResponse.ok) throw new Error(complete.error || "Upload konnte nicht bestätigt werden.");
        uploaded.push({ id: complete.id, url: complete.url, kind: complete.kind, name: file.name });
      }
      setAssets((current) => (single ? uploaded.slice(-1) : [...current, ...uploaded]));
      setStatus("Upload abgeschlossen.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  };

  const ids = single ? assets[0]?.id || "" : JSON.stringify(assets.map((asset) => asset.id));
  return (
    <div className="grid gap-3">
      <input type="hidden" name={inputName} value={ids} />
      <label className="button button-secondary w-fit">
        {uploading ? "Wird hochgeladen …" : single ? "Thumbnail hochladen" : "Medien hinzufügen"}
        <input
          className="sr-only"
          type="file"
          multiple={!single}
          accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,video/mp4,video/webm,video/quicktime"
          disabled={uploading}
          onChange={(event) => upload(event.target.files)}
        />
      </label>
      <p className="text-xs text-[#777d81]">Bilder bis 10 MB · Audio bis 25 MB · Video bis 100 MB</p>
      <p aria-live="polite" className="text-xs text-[#efc76e]">{status}</p>
      {assets.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] p-3">
              <span className="badge">{asset.kind}</span>
              <span className="min-w-0 flex-1 truncate text-xs">{asset.name || asset.url}</span>
              <button type="button" className="text-xs text-[#f28d8a]" onClick={() => setAssets((current) => current.filter((item) => item.id !== asset.id))}>Entfernen</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}