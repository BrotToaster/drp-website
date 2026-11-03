import fs from "node:fs/promises";
import sharp from "sharp";

const source = "data/brand-source";
await fs.mkdir(source, { recursive: true });
for (const [name, original] of [["logo.png", "public/drp-logo.png"], ["banner.png", "public/brand/drp-system-social.png"], ["base.png", "public/brand/drp-system-base.png"]]) {
  try { await fs.access(`${source}/${name}`); } catch { await fs.copyFile(original, `${source}/${name}`); }
}
await sharp(`${source}/logo.png`).resize(96, 96).png({ palette: true, quality: 95 }).toFile("public/drp-logo.png");
await sharp(`${source}/logo.png`).resize(192, 192).png({ palette: true }).toFile("public/icon.png");
await sharp(`${source}/logo.png`).resize(180, 180).png({ palette: true }).toFile("public/apple-icon.png");
const png = await sharp(`${source}/logo.png`).resize(32, 32).png().toBuffer();
const ico = Buffer.alloc(22); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); ico[6] = 32; ico[7] = 32; ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
await fs.writeFile("public/favicon.ico", Buffer.concat([ico, png]));
const banner = await sharp(`${source}/banner.png`).resize({ width: 1080 }).toBuffer();
const labels = Buffer.from('<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><text x="60" y="108" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#f3f4f5">Deutschland Roleplay</text><text x="60" y="550" font-family="Arial,sans-serif" font-size="27" fill="#bec4c9">Regelwerk · Serverstatus · Community</text><rect x="60" y="580" width="1080" height="3" fill="#f2c14e"/></svg>');
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#090b0d" } }).composite([{ input: banner, left: 60, top: 190 }, { input: labels }]).png({ palette: true, quality: 95 }).toFile("public/brand/drp-system-social.png");
await sharp(`${source}/base.png`).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toFile("public/brand/drp-system-base.webp");
for (const file of ["public/drp-logo.png", "public/brand/drp-system-social.png", "public/brand/drp-system-base.webp"]) console.log(`${file}: ${(await fs.stat(file)).size} Bytes`);
