import type { Server } from 'node:http';
export const FIRST_PORT: number;
export const LAST_PORT: number;
export const HOST: string;
export const ID_PATH: string;
export function mimeType(file: string): string;
export function resolveRequest(root: string, urlPath: string): string | null;
export function folderId(appDir: string): string;
export function startServer(o: {
  root: string;
  port?: number;
  host?: string;
  first?: number;
  last?: number;
  info?: Record<string, unknown>;
}): Promise<{ server: Server; port: number; url: string }>;
export function parseArgs(
  argv: string[],
  env?: Record<string, string | undefined>,
): { port: number | undefined; open: boolean };
export function openBrowser(url: string): void;
