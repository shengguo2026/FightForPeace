import type { ReplayLog } from '@ffp/sim';
import type { PadSnapshot, SlotState } from '@ffp/platform';

export interface DebugBody {
  x: number;
  z: number;
  y: number;
  state: number;
  facing: number;
}

/** Test hook, installed in dev and e2e builds only (see debug.ts). */
export interface FfpDebugHook {
  frame(): number;
  body(id: number): DebugBody | undefined;
  hero(slot: number): DebugBody | undefined;
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
