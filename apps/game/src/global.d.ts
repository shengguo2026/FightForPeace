import type { ReplayLog } from '@ffp/sim';
import type { PadSnapshot, SlotState } from '@ffp/platform';

export interface DebugBody {
  x: number;
  z: number;
  y: number;
  state: number;
  facing: number;
  attackKind: number;
  action: string | null;
  category: string | null;
  stateFrame: number;
  hero: string | null;
  meter: number;
  health: number;
  combo: { open: boolean; hits: number; damage: number; scale: number };
}

/** Test hook, installed in dev and e2e builds only (see debug.ts). */
export interface FfpDebugHook {
  frame(): number;
  body(id: number): DebugBody | undefined;
  hero(slot: number): DebugBody | undefined;
  /** Puts a player's hero next to the first dummy (offsets in pixels) and faces it. */
  place(slot: number, dx: number, dz: number): void;
  hash(): number;
  runReplay(log: ReplayLog): number;
  /** Replaces real gamepads with these virtual ones from now on. */
  fakePads(pads: (PadSnapshot | null)[]): void;
  paused(): boolean;
  slots(): SlotState[];
}

declare global {
  interface Window {
    __ffp?: FfpDebugHook;
  }
}
