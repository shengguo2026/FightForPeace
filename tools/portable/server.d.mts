import type { Server } from 'node:http';
import type { RoomService } from './room.mjs';
export const FIRST_PORT: number;
export const LAST_PORT: number;
export const HOST: string;
export const ID_PATH: string;
export const SAVES_PATH: string;
export const RECORD_NAME: RegExp;
export const MAX_RECORD_BYTES: number;
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
  /** Folder for the M10 save API; without it the API is off. */
  saves?: string;
  /** M12 LAN room service; without it /__ffp/room is off. */
  rooms?: RoomService;
}): Promise<{ server: Server; port: number; url: string }>;
export function parseArgs(
  argv: string[],
  env?: Record<string, string | undefined>,
): { port: number | undefined; open: boolean };
export function openBrowser(url: string): void;
