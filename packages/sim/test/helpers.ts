import { ActionBit, DirBit } from '../src/input/bits';
import type { FrameInput, World } from '../src/world/types';
import { createWorld, heroOf, step, type WorldOptions } from '../src/world/world';

export const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

export function inp(p: Partial<FrameInput> = {}): FrameInput {
  return { ...idle, ...p };
}

/** A fresh press of a direction (as the keyboard would report it) while holding it. */
export function tapDir(dir: 'left' | 'right' | 'up' | 'down', extra: Partial<FrameInput> = {}) {
  const v = {
    left: { moveX: -1, moveZ: 0 },
    right: { moveX: 1, moveZ: 0 },
    up: { moveX: 0, moveZ: -1 },
    down: { moveX: 0, moveZ: 1 },
  }[dir] as Pick<FrameInput, 'moveX' | 'moveZ'>;
  return inp({ ...v, dirPressed: DirBit[dir], ...extra });
}

export const press = (action: keyof typeof ActionBit, extra: Partial<FrameInput> = {}) =>
  inp({ pressed: ActionBit[action], ...extra });

export function world(options: WorldOptions = {}): World {
  return createWorld(1, options);
}

export function run(w: World, frames: FrameInput[], slot = 0): void {
  for (const f of frames) {
    step(w, slot === 0 ? [f] : [idle, f]);
  }
}

export function repeat(f: FrameInput, n: number): FrameInput[] {
  return Array.from({ length: n }, () => f);
}

export function hero(w: World, slot = 0) {
  const h = heroOf(w, slot);
  if (!h) throw new Error(`no hero in slot ${slot}`);
  return h;
}
