import {
  type Body,
  type FrameInput,
  SIM_HZ,
  type World,
  createAccumulator,
  createWorld,
  hashWorld,
  step,
} from '@ffp/sim';
import { DEFAULT_KEYBOARD_P1, KeyboardState } from '@ffp/platform';

/** Max simulation steps per render frame; any further debt is dropped (tab was hidden). */
export const MAX_STEPS_PER_FRAME = 5;

/** What the renderer draws: the last two simulation states and how far between them we are. */
export interface RenderSnapshot {
  previous: readonly Body[];
  current: readonly Body[];
  alpha: number;
}

export interface FrameReport {
  frame: number;
  hash: number;
  /** Inputs fed to the simulation during this render frame, one per step. */
  inputs: FrameInput[];
}

/**
 * Owns the simulation, the keyboard state and the fixed-step accumulator. The renderer
 * only ever reads snapshots; it never writes to the world.
 */
export class GameSession {
  readonly world: World;
  readonly keyboard = new KeyboardState(DEFAULT_KEYBOARD_P1);
  private readonly accumulator = createAccumulator({ hz: SIM_HZ, maxSteps: MAX_STEPS_PER_FRAME });
  private previous: Body[];
  private alpha = 0;

  constructor(seed: number) {
    this.world = createWorld(seed);
    this.previous = cloneBodies(this.world.bodies);
  }

  /** Advances by the wall time since the last render frame. */
  advance(elapsedMs: number): FrameReport {
    const { steps, alpha } = this.accumulator.advance(elapsedMs);
    const inputs: FrameInput[] = [];
    for (let i = 0; i < steps; i += 1) {
      this.previous = cloneBodies(this.world.bodies);
      const input = this.keyboard.sample();
      inputs.push(input);
      step(this.world, [input]);
    }
    this.alpha = alpha;
    return { frame: this.world.frame, hash: hashWorld(this.world), inputs };
  }

  snapshot(): RenderSnapshot {
    return { previous: this.previous, current: this.world.bodies, alpha: this.alpha };
  }
}

function cloneBodies(bodies: readonly Body[]): Body[] {
  return bodies.map((b) => ({ ...b }));
}
