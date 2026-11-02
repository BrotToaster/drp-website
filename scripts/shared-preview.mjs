import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hash = value => crypto.createHash("sha256").update(value).digest();
const hopHeaders = ["connection", "proxy-connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "proxy-authorization", "proxy-authenticate"];

/** @param {{origin: string, username: string, password: string, upstreamPort?: number}} config */
export function createPreviewProxy(config) {
  if (!/^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(config.origin)) throw new Error("Invalid preview origin");
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(config.username) || config.password.length < 18) throw new Error("Invalid preview credentials");
  const origin = new URL(config.origin);
  const expected = hash(`${config.username}:${config.password}`);
  return http.createServer((request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    if (!request.url?.startsWith("/") || request.url.startsWith("//")) { response.writeHead(400); return response.end(); }
    if (request.headers["x-forwarded-proto"] === "http") {
      response.writeHead(308, { Location: origin.origin + request.url }); return response.end();
    }
    const authorization = request.headers.authorization || "";
    const supplied = /^Basic /i.test(authorization) ? Buffer.from(authorization.slice(6), "base64").toString("utf8") : "";
    if (!crypto.timingSafeEqual(expected, hash(supplied))) {
      response.writeHead(401, { "WWW-Authenticate": 'Basic realm="DRP Vorschau", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" });
      return response.end("DRP-Vorschau: Bitte die mitgeteilten Zugangsdaten eingeben.");
    }
    const headers = { ...request.headers };
    for (const name of [...hopHeaders, "authorization", "forwarded", "cf-connecting-ip", "x-real-ip", "x-forwarded-for", "x-forwarded-port"]) delete headers[name];
    headers.host = origin.host;
    headers["x-forwarded-host"] = origin.host;
    headers["x-forwarded-proto"] = "https";
    const upstream = http.request({ hostname: "127.0.0.1", port: config.upstreamPort || 3000, method: request.method, path: request.url, headers, timeout: 30000 }, result => {
      for (const [name, value] of Object.entries(result.headers)) {
        if (value !== undefined && !hopHeaders.includes(name) && !["cache-control", "x-robots-tag"].includes(name)) response.setHeader(name, value);
      }
      const csp = result.headers["content-security-policy"];
      if (typeof csp === "string" && !csp.includes("upgrade-insecure-requests")) response.setHeader("Content-Security-Policy", csp + "; upgrade-insecure-requests");
      response.setHeader("Strict-Transport-Security", "max-age=3600");
      response.writeHead(result.statusCode || 502);
      result.pipe(response);
    });
    upstream.on("timeout", () => upstream.destroy(new Error("Origin timeout")));
    upstream.on("error", () => {
      if (response.headersSent) return response.destroy();
      response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Die lokale Vorschau ist gerade nicht erreichbar. Bitte den Betreiber bitten, den Vorschau-Start zu prüfen.");
    });
    request.on("aborted", () => upstream.destroy());
    response.on("close", () => { if (!response.writableEnded) upstream.destroy(); });
    request.pipe(upstream);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(fs.readFileSync(path.resolve(process.argv[2] || "runtime/share.config.json"), "utf8").replace(/^\uFEFF/, ""));
  const server = createPreviewProxy(config);
  server.listen(3418, "127.0.0.1", () => console.log("DRP-Vorschauzugang aktiv auf 127.0.0.1:3418."));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
}
