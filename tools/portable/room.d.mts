import type { IncomingMessage, ServerResponse } from 'node:http';
export const ROOM_FIRST_PORT: number;
export const ROOM_LAST_PORT: number;
export const ROOM_API: string;
export const ROOM_PATH: string;
export const MAX_MESSAGE: number;
export const ROOM_TTL_MS: number;
export const CODE_ALPHABET: string;
export const CODE_LENGTH: number;
export function roomCode(pick?: (n: number) => number): string;
export function normaliseCode(text: unknown): string;
export function lanAddresses(
  ifaces?: Record<
    string,
    { address: string; family: string | number; internal: boolean }[] | undefined
  >,
): string[];
export function acceptKey(key: string): string;
export function encodeFrame(payload: string | Buffer, opcode?: number): Buffer;
export class FrameReader {
  constructor(max?: number, requireMask?: boolean);
  push(chunk: Buffer): { fin: boolean; opcode: number; payload: Buffer }[];
}
export interface RoomStatus {
  open: boolean;
  port: number | null;
  code?: string;
  addresses?: string[];
  guest?: boolean;
  token?: string;
}
export interface RoomService {
  open(): Promise<RoomStatus>;
  status(withToken?: boolean): RoomStatus;
  closeRoom(code?: string | null): void;
  close(): Promise<void>;
  handleApi(req: IncomingMessage, res: ServerResponse): void;
}
export function createRoomService(o?: {
  host?: string;
  port?: number;
  first?: number;
  last?: number;
  log?: (line: string) => void;
  now?: () => number;
  addresses?: () => string[];
}): RoomService;
