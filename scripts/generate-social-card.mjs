import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagePath = path.join(root, "public/brand/drp-share-v2.png");
const provenance = "Original code-rendered DRP social card. Sources: existing user-provided DRP logo (data/brand-source/logo.png, original creator undocumented); official ER:LC map https://api.erlc.gg/maps/fall_blank.png (public/maps/liberty-county.webp, source data/map-assets.json); locally hosted Inter. Layout and copy: scripts/generate-social-card.mjs. No AI-generated imagery.";

async function dataUrl(relative, type) {
  return `data:${type};base64,${(await fs.readFile(path.join(root, relative))).toString("base64")}`;
}

// Preserve the source alongside the raster, including when it is regenerated.
function withProvenance(png) {
  const data = Buffer.from(`impeccable:prompt\0${provenance}`, "utf8");
  const type = Buffer.from("tEXt");
  const body = Buffer.concat([type, data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length); body.copy(chunk, 4);
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4);
  return Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
}

const [logo, map, font] = await Promise.all([
  dataUrl("data/brand-source/logo.png", "image/png"),
  dataUrl("public/maps/liberty-county.webp", "image/webp"),
  dataUrl("node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "font/woff2"),
]);
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url("${font}") format("woff2");font-weight:100 900;font-display:block}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f5f5f7;font-family:Inter,sans-serif;color:#1d1d1f}
.card{position:relative;width:1200px;height:630px;background:#fff}
.brand{position:absolute;left:64px;top:48px;display:flex;align-items:center;gap:16px}.brand img{width:66px;height:66px;object-fit:contain}.brand strong{display:block;font-size:23px;font-weight:650;letter-spacing:-.02em}.brand span{display:block;margin-top:4px;color:#626269;font-size:16px}
h1{position:absolute;left:64px;top:211px;margin:0;font-size:62px;line-height:1.1;letter-spacing:-.04em;font-weight:650;z-index:2}h1 span{color:#0066cc}
.copy{position:absolute;left:67px;top:385px;margin:0;max-width:610px;font-size:23px;line-height:1.5;color:#626269}
.features{position:absolute;left:67px;bottom:55px;margin:0;font-size:18px;color:#626269;letter-spacing:-.01em}
.map{position:absolute;left:750px;right:0;top:0;bottom:0;overflow:hidden;background:#f5f5f7}.map img{position:absolute;inset:40px auto auto 36px;width:490px;height:550px;object-fit:cover;object-position:51% 46%;border-radius:20px;filter:saturate(.76) contrast(1.02)}
</style><div class="card"><div class="brand"><img src="${logo}" alt=""><div><strong>Deutschland Roleplay</strong><span>DRP Community</span></div></div><h1>Dein Einsatz.<br><span>Deine Geschichte.</span></h1><p class="copy">Deutsches Roleplay<br>in Emergency Response: Liberty County.</p><p class="features">Regelwerk &nbsp;·&nbsp; News &nbsp;·&nbsp; Serverstatus</p><div class="map"><img src="${map}" alt=""></div></div></html>`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const screenshot = await page.screenshot({ type: "png" });
  const png = await sharp(screenshot).png({ compressionLevel: 9 }).toBuffer();
  await fs.mkdir(path.dirname(imagePath), { recursive: true });
  await fs.writeFile(imagePath, withProvenance(png));
  console.log(`${path.relative(root, imagePath)}: 1200 x 630, ${(await fs.stat(imagePath)).size} bytes`);
} finally { await browser.close(); }
