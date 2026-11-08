import { ActionBit, type FrameInput, MoveState, type World, fx, heroOf } from '@ffp/sim';

/** A greenhouse errand: walk to (x, z) in pixels, then tap Interact or hold it n frames. */
export interface Errand {
  x: number;
  z: number;
  hold?: number;
}

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

/**
 * A simple deterministic greenhouse bot for one hero: runs its errands in order (walk,
 * Interact or hold Interact), then fights the nearest enemy with Attack every 14 frames.
 */
export class GreenhouseBot {
  private step = 0;
  private holding = 0;
  private wait = 0;

  constructor(
    private readonly slot: number,
    private readonly errands: readonly Errand[],
  ) {}

  input(world: World, frame: number): FrameInput {
    const h = heroOf(world, this.slot);
    if (!h || h.ko) return IDLE;
    if (this.wait > 0) {
      this.wait -= 1;
      return IDLE;
    }
    const e = this.errands[this.step];
    if (e) {
      if (this.holding > 0) {
        this.holding -= 1;
        if (this.holding === 0) this.next();
        return { ...IDLE, held: ActionBit.Interact };
      }
      const dx = fx(e.x) - h.x;
      const dz = fx(e.z) - h.z;
      const moveX = Math.abs(dx) > fx(14) ? (Math.sign(dx) as 1 | -1) : 0;
      const moveZ = Math.abs(dz) > fx(10) ? (Math.sign(dz) as 1 | -1) : 0;
      if (moveX !== 0 || moveZ !== 0) return { ...IDLE, moveX, moveZ };
      if (h.state !== MoveState.Idle && h.state !== MoveState.Walk) return IDLE;
      if (e.hold) {
        this.holding = e.hold;
        return { ...IDLE, pressed: ActionBit.Interact, held: ActionBit.Interact };
      }
      this.next();
      this.wait = 30;
      return { ...IDLE, pressed: ActionBit.Interact, held: ActionBit.Interact };
    }
    let target = null;
    let best = 0;
    for (const b of world.bodies) {
      if (b.team !== 'enemy' || b.ko || b.id === 180) continue;
      const d = Math.abs(b.x - h.x) + Math.abs(b.z - h.z);
      if (target === null || d < best) {
        target = b;
        best = d;
      }
    }
    if (!target) return IDLE;
    const dx = target.x - h.x;
    const dz = target.z - h.z;
    const moveX = Math.abs(dx) > fx(120) ? (Math.sign(dx) as 1 | -1) : 0;
    const moveZ = Math.abs(dz) > fx(16) ? (Math.sign(dz) as 1 | -1) : 0;
    if (moveX !== 0 || moveZ !== 0) return { ...IDLE, moveX, moveZ };
    return frame % 14 === this.slot * 7 ? { ...IDLE, pressed: ActionBit.Attack } : IDLE;
  }

  private next(): void {
    this.step += 1;
  }
}

/** Runs bots on a world for n frames and returns the inputs (for golden replays). */
export function runBots(
  world: World,
  bots: readonly GreenhouseBot[],
  n: number,
  step: (w: World, i: FrameInput[]) => void,
): FrameInput[][] {
  const out: FrameInput[][] = [];
  for (let i = 0; i < n; i += 1) {
    const row = bots.map((b) => b.input(world, i));
    out.push(row);
    step(world, row);
  }
  return out;
}
