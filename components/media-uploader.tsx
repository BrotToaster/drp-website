"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormRuntime } from "@/components/form-runtime-context";

type Asset = { id: string; url: string; kind: "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT"; name?: string; caption?: string | null };
type UploadPhase = "SIGNING" | "UPLOADING" | "PROCESSING" | "DONE" | "ERROR" | "CANCELLED";
type UploadTask = { id: string; file: File; phase: UploadPhase; progress: number; loaded: number; error?: string };
type CloudUploadResponse = { public_id?: string; secure_url?: string; resource_type?: string; bytes?: number; width?: number; height?: number; duration?: number; version?: number; signature?: string; error?: { message?: string } };

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function uploadMimeType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.toLocaleLowerCase("en").split(".").pop();
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
}

const phaseLabel: Record<UploadPhase, string> = {
  SIGNING: "Signatur wird angefordert",
  UPLOADING: "Datei wird übertragen",
  PROCESSING: "Datei wird verarbeitet",
  DONE: "Abgeschlossen",
  ERROR: "Fehlgeschlagen",
  CANCELLED: "Abgebrochen",
};

export function MediaUploader({ inputName = "mediaIds", captionInputName = "mediaCaptions", initialAssets = [], single = false, label, imagesOnly = false, internal = false, documentsOnly = false }: { inputName?: string; captionInputName?: string; initialAssets?: Asset[]; single?: boolean; label?: string; imagesOnly?: boolean; internal?: boolean; documentsOnly?: boolean }) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const token = useId();
  const { setUploadBusy } = useFormRuntime();
  const active = tasks.some((task) => ["SIGNING", "UPLOADING", "PROCESSING"].includes(task.phase));

  useEffect(() => {
    setUploadBusy(token, active);
    return () => setUploadBusy(token, false);
  }, [active, setUploadBusy, token]);

  const updateTask = (id: string, update: Partial<UploadTask>) => setTasks((current) => current.map((task) => task.id === id ? { ...task, ...update } : task));

  const transfer = (id: string, url: string, body: FormData) => new Promise<CloudUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    requests.current.set(id, xhr);
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) updateTask(id, { phase: "UPLOADING", progress: Math.round((event.loaded / event.total) * 100), loaded: event.loaded });
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Cloudinary-Upload."));
    xhr.onabort = () => reject(new DOMException("Upload abgebrochen", "AbortError"));
    xhr.onload = () => { const response = (xhr.response || {}) as CloudUploadResponse; if (xhr.status >= 200 && xhr.status < 300) resolve(response); else reject(new Error(response.error?.message || `Cloudinary antwortete mit HTTP ${xhr.status}.`)); };
    xhr.send(body);
  }).finally(() => requests.current.delete(id));

  const runUpload = async (task: UploadTask) => {
    const { id, file } = task;
    const mimeType = uploadMimeType(file);
    updateTask(id, { phase: "SIGNING", progress: 0, loaded: 0, error: undefined });
    try {
      const signResponse = await fetch("/api/media/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, mimeType, bytes: file.size, scope: internal ? "internal" : "public" }) });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(`Signatur: ${signed.error || "Upload nicht erlaubt."}`);
      const body = new FormData();
      body.append("file", file); body.append("api_key", signed.apiKey); body.append("timestamp", String(signed.timestamp)); body.append("folder", signed.folder); body.append("type", signed.deliveryType); body.append("signature", signed.signature);
      const cloud = await transfer(id, `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`, body);
      updateTask(id, { phase: "PROCESSING", progress: 100, loaded: file.size });
      const completeResponse = await fetch("/api/media/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicId: cloud.public_id, secureUrl: cloud.secure_url, resourceType: cloud.resource_type, kind: signed.kind, mimeType, originalName: file.name, bytes: cloud.bytes, width: cloud.width, height: cloud.height, duration: cloud.duration, version: cloud.version, signature: cloud.signature, deliveryType: signed.deliveryType }) });
      const complete = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(`Verarbeitung: ${complete.error || "Upload konnte nicht bestätigt werden."}`);
      const asset: Asset = { id: complete.id, url: complete.url, kind: complete.kind, name: file.name, caption: "" };
      setAssets((current) => single ? [asset] : [...current, asset]);
      updateTask(id, { phase: "DONE", progress: 100, loaded: file.size });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") updateTask(id, { phase: "CANCELLED", error: "Upload wurde abgebrochen." });
      else updateTask(id, { phase: "ERROR", error: error instanceof Error ? error.message : "Upload fehlgeschlagen." });
    }
  };

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, phase: "SIGNING" as const, progress: 0, loaded: 0 }));
    setTasks((current) => [...current.filter((task) => task.phase !== "DONE"), ...next]);
    void Promise.allSettled(next.map(runUpload));
  };

  const move = (index: number, direction: -1 | 1) => setAssets((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const copy = [...current]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy;
  });
  const aggregate = useMemo(() => {
    const relevant = tasks.filter((task) => task.phase !== "CANCELLED");
    return relevant.length ? Math.round(relevant.reduce((sum, task) => sum + task.progress, 0) / relevant.length) : 0;
  }, [tasks]);
  const ids = single ? assets[0]?.id || "" : JSON.stringify(assets.map((asset) => asset.id));
  const captions = JSON.stringify(Object.fromEntries(assets.map((asset) => [asset.id, asset.caption || ""])));

  return <div className="grid gap-3">
    <input type="hidden" name={inputName} value={ids} />{!single && <input type="hidden" name={captionInputName} value={captions} />}
    <label className="button button-secondary w-fit">{label || (single ? documentsOnly ? "Quelldatei hochladen" : "Bild hochladen" : "Medien hinzufügen")}<input className="sr-only" type="file" multiple={!single} accept={documentsOnly ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : imagesOnly ? "image/jpeg,image/png,image/webp,image/gif" : `image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,video/mp4,video/webm,video/quicktime${internal ? ",application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : ""}`} onChange={(event) => { upload(event.target.files); event.currentTarget.value = ""; }} /></label>
    <p className="text-xs text-[#777d81]">{documentsOnly ? "DOCX oder XLSX bis 25 MB" : <>Bilder bis 10 MB · Audio bis 25 MB · Video bis 100 MB{internal ? " · PDF, DOCX oder XLSX bis 25 MB" : ""}</>}</p>
    {tasks.length > 0 && <div className="upload-panel" aria-live="polite"><div className="flex items-center justify-between gap-3"><strong className="text-sm">Gesamtfortschritt</strong><span className="text-xs text-[#efc76e]">{aggregate} %</span></div><progress className="upload-progress" max="100" value={aggregate} aria-label="Gesamtfortschritt der Uploads" /><div className="mt-3 grid gap-2">{tasks.map((task) => <div key={task.id} className="upload-row"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{task.file.name}</p><p className={"text-xs " + (task.phase === "ERROR" ? "text-[#f28d8a]" : "text-[#858b90]")}>{task.error || phaseLabel[task.phase]} · {formatBytes(task.loaded)} / {formatBytes(task.file.size)}</p></div><span className="text-xs text-[#efc76e]">{task.progress} %</span></div><progress className="upload-progress" max="100" value={task.progress} aria-label={`Uploadfortschritt ${task.file.name}`} aria-valuetext={`${task.progress} Prozent, ${phaseLabel[task.phase]}`} /><div className="mt-2 flex gap-3">{["SIGNING", "UPLOADING", "PROCESSING"].includes(task.phase) && <button type="button" className="text-xs text-[#f28d8a]" onClick={() => requests.current.get(task.id)?.abort()}>Abbrechen</button>}{["ERROR", "CANCELLED"].includes(task.phase) && <button type="button" className="text-xs text-[#efc76e]" onClick={() => void runUpload(task)}>Erneut versuchen</button>}{!["SIGNING", "UPLOADING", "PROCESSING"].includes(task.phase) && <button type="button" className="text-xs text-[#858b90]" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}>Entfernen</button>}</div></div>)}</div></div>}
    {assets.length > 0 && <div className="grid gap-2">{assets.map((asset, index) => <div key={asset.id} className="grid gap-3 rounded-xl border border-white/[0.07] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="badge">{asset.kind}</span><div className="min-w-0"><p className="truncate text-xs">{asset.name || asset.url}</p>{!single && <input className="field mt-2 !min-h-9 !py-2 text-xs" value={asset.caption || ""} maxLength={240} placeholder="Optionale Bild- oder Medienbeschriftung" onChange={(event) => setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, caption: event.target.value } : item))} />}</div><div className="flex items-center gap-2">{!single && <button type="button" className="text-xs text-[#9da3a8] disabled:opacity-30" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Nach oben">↑</button>}{!single && <button type="button" className="text-xs text-[#9da3a8] disabled:opacity-30" disabled={index === assets.length - 1} onClick={() => move(index, 1)} aria-label="Nach unten">↓</button>}<button type="button" className="text-xs text-[#f28d8a]" onClick={() => setAssets((current) => current.filter((item) => item.id !== asset.id))}>Entfernen</button></div></div>)}</div>}
  </div>;
}
