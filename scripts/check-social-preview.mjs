import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { load } from "cheerio";
import sharp from "sharp";

const origin = process.argv[2] || "http://localhost:3000";
const userAgent = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
const reports = [];
for (const route of ["/", "/regelwerk", "/news/willkommen-bei-drp"]) {
  const response = await fetch(new URL(route, origin), { headers: { "user-agent": userAgent } });
  assert.equal(response.status, 200);
  const html = await response.text();
  const $ = load(html);
  const meta = key => $(`head meta[property="${key}"],head meta[name="${key}"]`).attr("content");
  const image = meta("og:image");
  assert.ok(image, `${route}: image missing in server-rendered head`);
  assert.match(image, /^https?:\/\//);
  assert.equal(new URL(image).pathname, "/brand/drp-share-v2.png");
  assert.equal(meta("og:image:width"), "1200");
  assert.equal(meta("og:image:height"), "630");
  assert.equal(meta("og:image:type"), "image/png");
  assert.equal(meta("theme-color"), "#0071e3");
  assert.equal(meta("twitter:card"), "summary_large_image");
  assert.ok(meta("og:image:alt"));
  assert.ok(meta("og:title"));
  assert.ok(meta("og:description"));
  assert.equal($("meta[property='og:image']").length, 1, "ambiguous image gallery");
  const imageResponse = await fetch(image, { headers: { "user-agent": userAgent } });
  assert.equal(imageResponse.status, 200);
  assert.match(imageResponse.headers.get("content-type") || "", /^image\/png/);
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const info = await sharp(bytes).metadata();
  assert.equal(info.width, 1200); assert.equal(info.height, 630);
  assert.ok(bytes.length < 500_000, "preview image exceeds the local size budget");
  reports.push({ route, title: meta("og:title"), description: meta("og:description"), image, bytes: bytes.length });
}
await fs.mkdir("logs", { recursive: true });
await fs.writeFile("logs/social-preview-check.json", JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
