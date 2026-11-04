export function crlf(text: string): string;
export function lf(text: string): string;
export function entryName(prefix: string, base: string, file: string): string;
export function assemble(o: {
  version: string;
  gameDir: string;
  outDir: string;
  portableDir?: string;
  noticeText?: string;
}): { stage: string; zipPath: string; names: string[] };
export const BUNDLED: string[];
export function notices(packages?: string[], find?: (name: string) => string): string;
