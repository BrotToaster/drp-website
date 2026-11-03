import { inflateRawSync } from "node:zlib";
// DOCX/XLSX are ZIP containers. Bound actual expansion, including forged sizes.
export function assertOfficeArchiveLimits(buffer: Buffer) {
  if (buffer.length > 25_000_000) throw new Error("Office-Datei ist zu groß.");
  let end = -1;
  for (let position = buffer.length - 22; position >= Math.max(0, buffer.length - 65557); position--) {
    if (buffer.readUInt32LE(position) === 0x06054b50) { end = position; break; }
  }
  if (end < 0) throw new Error("Ungültiges Office-Archiv.");
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16), expanded = 0;
  if (count > 2500 || count === 65535) throw new Error("Zu viele Archiveinträge.");
  for (let index = 0; index < count; index++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Ungültiges Office-Archiv.");
    const size = buffer.readUInt32LE(offset + 24);
    const compressed = buffer.readUInt32LE(offset + 20);
    const local = buffer.readUInt32LE(offset + 42);
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50 || (buffer.readUInt16LE(local + 6) & 1)) throw new Error("Ungültiges oder verschlüsseltes Office-Archiv.");
    const begin = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (begin + compressed > buffer.length || size === 0xffffffff || expanded + size > 64_000_000) throw new Error("Entpackte Office-Datei ist zu groß.");
    const method = buffer.readUInt16LE(offset + 10);
    const data = buffer.subarray(begin, begin + compressed);
    const actual = method === 0 ? data.length : method === 8 ? inflateRawSync(data, { maxOutputLength: Math.max(1, 64_000_000 - expanded) }).length : -1;
    if (actual !== size) throw new Error("Office-Archiv enthält widersprüchliche Größenangaben.");
    expanded += actual;
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}
