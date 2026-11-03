type JsonRequestResult = { ok: true; value: unknown } | { ok: false; status: 400 | 413 | 415; message: string };
export async function readJsonRequest(request: Request, maxBytes = 65_536): Promise<JsonRequestResult> {
  if (!/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) return { ok: false, status: 415, message: "JSON-Inhalt erwartet." };
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) return { ok: false, status: /^\d+$/.test(length) ? 413 : 400, message: "Ungültige oder zu große Anfrage." };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, message: "Die Anfrage ist leer." };
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return { ok: false, status: 413, message: "Die Anfrage ist zu groß." }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch { return { ok: false, status: 400, message: "Die JSON-Anfrage ist unvollständig oder ungültig." }; }
  finally { reader.releaseLock(); }
}
