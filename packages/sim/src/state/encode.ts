/**
 * Canonical little-endian byte writer. World state is encoded field by field in a fixed
 * order, so the same state always produces the same bytes (and therefore the same hash).
 * Values that do not fit their slot throw instead of silently wrapping.
 */
export class ByteWriter {
  private buf: Uint8Array;
  private view: DataView;
  private len = 0;

  constructor(initialCapacity = 256) {
    this.buf = new Uint8Array(Math.max(1, initialCapacity));
    this.view = new DataView(this.buf.buffer);
  }

  private reserve(n: number): void {
    if (this.len + n <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < this.len + n) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
    this.view = new DataView(next.buffer);
  }

  u8(v: number): void {
    if (!Number.isInteger(v) || v < 0 || v > 0xff) throw new RangeError(`u8 out of range: ${v}`);
    this.reserve(1);
    this.view.setUint8(this.len, v);
    this.len += 1;
  }

  i32(v: number): void {
    if (!Number.isInteger(v) || v < -0x8000_0000 || v > 0x7fff_ffff) {
      throw new RangeError(`i32 out of range: ${v}`);
    }
    this.reserve(4);
    this.view.setInt32(this.len, v, true);
    this.len += 4;
  }

  u32(v: number): void {
    if (!Number.isInteger(v) || v < 0 || v > 0xffff_ffff) {
      throw new RangeError(`u32 out of range: ${v}`);
    }
    this.reserve(4);
    this.view.setUint32(this.len, v, true);
    this.len += 4;
  }

  /** A copy of the bytes written so far. */
  bytes(): Uint8Array {
    return this.buf.slice(0, this.len);
  }
}
