import { commonErrors } from "./common-errors";
import { securityHeaders } from "./security-policy";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
// Middleware failures must work without React, a database or downloaded scripts.
export function gatewayErrorResponse(request: Request, status: 401 | 503, extraHeaders: Record<string, string> = {}) {
  const content = status === 401
    ? { title: "Geschützte Entscheidungsvorschau.", message: "Öffne die Vorschau mit den Zugangsdaten des Betreibers. Der Benutzername im Passwortdialog lautet drp." }
    : { title: commonErrors[503].title, message: "Die Entscheidungsvorschau ist noch nicht freigeschaltet oder vorübergehend nicht verfügbar. Bitte wende dich an den Betreiber." };
  const headers = new Headers({ "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", ...extraHeaders });
  for (const header of securityHeaders()) headers.set(header.key, header.value);
  if (new URL(request.url).pathname.startsWith("/api/")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
    return new Response(JSON.stringify({ error: content.message, code: status }), { status, headers });
  }
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(content.title)} | DRP</title><link rel="icon" href="/favicon.ico"><style>body{margin:0;background:#faf8f4;color:#28251f;font:16px/1.65 system-ui,sans-serif}main{max-width:760px;margin:12vh auto;padding:32px 24px}strong{color:#864a28;font-size:clamp(64px,12vw,110px);line-height:1}h1{font-size:clamp(30px,5vw,46px);line-height:1.15;letter-spacing:-.03em}p{max-width:65ch;color:#6e645a}a{display:inline-flex;min-height:44px;align-items:center;color:#864a28;text-underline-offset:4px;margin:12px 24px 0 0}a:focus-visible{outline:3px solid #864a28;outline-offset:4px}@media(prefers-color-scheme:dark){body{background:#242320;color:#f9f6f0}strong,a{color:#e3b58d}p{color:#c3b9ab}}</style></head><body><main><p>DRP · Deutschland Roleplay</p><strong>${status}</strong><h1>${escapeHtml(content.title)}</h1><p>${escapeHtml(content.message)}</p><nav aria-label="Nächste Schritte"><a href="/">Erneut öffnen</a><a href="/datenschutz">Datenschutz und Kontakt</a></nav></main></body></html>`, { status, headers });
}
