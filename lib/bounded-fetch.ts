import { assertExternalServicesAllowed } from "./preview-mode";

export async function fetchImportBytes(value: string, allowedHosts: string[], maxBytes = 25_000_000) {
  assertExternalServicesAllowed();
  let url = new URL(value);
  for (let attempt = 0; attempt < 5; attempt++) {
    if (url.protocol !== "https:" || url.username || url.password || !allowedHosts.some(host => host.startsWith("*.") ? url.hostname.endsWith(host.slice(1)) : url.hostname === host)) throw new Error("Nicht erlaubte Importquelle.");
    const response = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(30000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Ungültige Importweiterleitung.");
      url = new URL(location, url); continue;
    }
    if (!response.ok || !response.body) throw new Error("Importquelle ist derzeit nicht verfügbar.");
    if (Number(response.headers.get("content-length")) > maxBytes) { await response.body.cancel(); throw new Error("Importdatei ist zu groß."); }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        size += chunk.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new Error("Importdatei ist zu groß."); }
        chunks.push(chunk);
      }
    } finally { reader.releaseLock(); }
    return Buffer.concat(chunks);
  }
  throw new Error("Zu viele Importweiterleitungen.");
}
