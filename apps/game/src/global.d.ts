import type { ReplayLog } from '@ffp/sim';

/** Test hook, installed in dev and e2e builds only (see debug.ts). */
export interface FfpDebugHook {
  frame(): number;
  body(id: number): { x: number; z: number } | undefined;
  hash(): number;
  runReplay(log: ReplayLog): number;
}

declare global {
  interface Window {
    __ffp?: FfpDebugHook;
  }
}
