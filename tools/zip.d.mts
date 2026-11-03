export interface ZipEntry {
  name: string;
  data: Buffer | Uint8Array;
  mode?: number;
}
export interface ZipRecord {
  name: string;
  method: number;
  size: number;
  mode: number;
  start: number;
}
export function buildZip(entries: ZipEntry[]): Buffer;
export function readZip(zip: Buffer): ZipRecord[];
