import { deflateRawSync } from "node:zlib";
import { expect, it } from "vitest";
import { assertOfficeArchiveLimits } from "@/lib/archive-limits";

function archive() {
  const body = Buffer.from("Testdatei");
  const compressed = deflateRawSync(body);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8, 8);
  const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(8, 10); directory.writeUInt32LE(compressed.length, 20); directory.writeUInt32LE(body.length, 24);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 10); end.writeUInt32LE(local.length + compressed.length, 16);
  return { buffer: Buffer.concat([local, compressed, directory, end]), directory: local.length + compressed.length };
}
it("akzeptiert begrenzte Office-ZIP-Strukturen", () => {
  expect(() => assertOfficeArchiveLimits(archive().buffer)).not.toThrow();
});
it("weist manipulierte Größen und unlesbare Archive ab", () => {
  const { buffer, directory } = archive(); buffer.writeUInt32LE(1, directory + 24);
  expect(() => assertOfficeArchiveLimits(buffer)).toThrow();
  expect(() => assertOfficeArchiveLimits(Buffer.from("kein Archiv"))).toThrow();
});
it("weist hohe Expansion und ZIP64 ohne Entpackversuch ab", () => {
  const { buffer, directory } = archive(); buffer.writeUInt32LE(0xffffffff, directory + 24);
  expect(() => assertOfficeArchiveLimits(buffer)).toThrow();
});
