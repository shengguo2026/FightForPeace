// Minimal zip writer (deflate, Node built-ins only) for `pnpm release`. Entry names always
// use "/" whatever the OS, and Unix permissions are stored so start.sh stays executable.
import { crc32, deflateRawSync } from 'node:zlib';

/** DOS date/time of 1980-01-01 00:00, so the same inputs give the same zip bytes. */
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

/**
 * @param {{ name: string, data: Buffer | Uint8Array, mode?: number }[]} entries
 *   name: path inside the zip with "/" separators; mode: Unix permissions (default 0o644)
 * @returns {Buffer}
 */
export function buildZip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    if (e.name.includes('\\')) throw new Error(`zip entry names use "/": ${e.name}`);
    const name = Buffer.from(e.name, 'utf8');
    const data = Buffer.from(e.data);
    const packed = deflateRawSync(data, { level: 9 });
    const stored = packed.length >= data.length;
    const body = stored ? data : packed;
    const crc = crc32(data);
    const method = stored ? 0 : 8;
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4); // version needed
    head.writeUInt16LE(0x0800, 6); // UTF-8 names
    head.writeUInt16LE(method, 8);
    head.writeUInt16LE(DOS_TIME, 10);
    head.writeUInt16LE(DOS_DATE, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(name.length, 26);
    head.writeUInt16LE(0, 28);
    local.push(head, name, body);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE((3 << 8) | 20, 4); // made by Unix, so the permission bits are read
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30); // extra
    dir.writeUInt16LE(0, 32); // comment
    dir.writeUInt16LE(0, 34); // disk
    dir.writeUInt16LE(0, 36); // internal attributes
    dir.writeUInt32LE((((0o100000 | (e.mode ?? 0o644)) << 16) >>> 0) >>> 0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);
    offset += head.length + name.length + body.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

/**
 * Reads a zip's central directory (for tests and checks): names, permissions, data.
 * @param {Buffer} zip
 */
export function readZip(zip) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(end + 10);
  let p = zip.readUInt32LE(end + 16);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extra = zip.readUInt16LE(p + 30);
    const comment = zip.readUInt16LE(p + 32);
    const attrs = zip.readUInt32LE(p + 38);
    const at = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const localName = zip.readUInt16LE(at + 26);
    const localExtra = zip.readUInt16LE(at + 28);
    out.push({
      name,
      method,
      size,
      mode: (attrs >>> 16) & 0o777,
      start: at + 30 + localName + localExtra,
    });
    p += 46 + nameLen + extra + comment;
  }
  return out;
}
