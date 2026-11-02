import fs from "node:fs/promises";
import sharp from "sharp";

const month = new Date().getUTCMonth();
const season = month === 11 || month <= 1 ? "snow" : month <= 4 ? "spring" : month <= 7 ? "summer" : "fall";
await fs.mkdir("public/maps", { recursive: true });
const results = [];
for (const [variant, width, file] of [["blank", 2048, "liberty-county.webp"], ["postals", 3072, "liberty-county-postals.webp"]]) {
  const source = `https://api.erlc.gg/maps/${season}_${variant}.png`;
  const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Kartenabruf fehlgeschlagen (${response.status}). Bestehende Dateien bleiben erhalten.`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > 40_000_000) throw new Error("Kartendatei ist unerwartet groß."); chunks.push(chunk); }
  const image = await sharp(Buffer.concat(chunks)).resize({ width, withoutEnlargement: true }).webp({ quality: variant === "postals" ? 88 : 82, effort: 5 }).toBuffer();
  results.push({ source, file: `public/maps/${file}`, bytes: image.length, image });
}
// Validate both images before replacing either public asset.
for (const item of results) await fs.writeFile(item.file, item.image);
await fs.writeFile("data/map-assets.json", JSON.stringify({ updatedAt: new Date().toISOString(), season, assets: results.map(item => ({ source: item.source, file: item.file, bytes: item.bytes })) }, null, 2) + "\n");
console.log("Öffentliche ER:LC-Karten aktualisiert. Bei einem Produktionsbetrieb anschließend neu bauen und bereitstellen.");
