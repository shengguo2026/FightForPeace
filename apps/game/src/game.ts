import {
  type FacingMode,
  type Fighter,
  type FrameInput,
  SIM_HZ,
  type World,
  createAccumulator,
  createWorld,
  hashWorld,
  setFacingMode,
  step,
} from '@ffp/sim';
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DeviceHub,
  KeyLabelSource,
  type KeyboardP2Preset,
  keyboardP2,
} from '@ffp/platform';

/** Max simulation steps per render frame; any further debt is dropped (tab was hidden). */
export const MAX_STEPS_PER_FRAME = 5;
/** Training dummies in the M1 Lab stage. */
export const LAB_DUMMIES = 2;

/** What the renderer draws: the last two simulation states and how far between them we are. */
export interface RenderSnapshot {
  previous: readonly Fighter[];
  current: readonly Fighter[];
  alpha: number;
}

export interface FrameReport {
  frame: number;
  hash: number;
  paused: boolean;
  /** Inputs fed to the simulation during this render frame: steps × players. */
  inputs: FrameInput[][];
}

/**
 * Owns the simulation, the input devices and the fixed-step accumulator. The renderer
 * only reads snapshots; it never writes to the world. While the hub reports a pause
 * (user pause or a lost controller) the simulation does not step at all.
 */
export class GameSession {
  readonly world: World;
  readonly labels = new KeyLabelSource();
  readonly devices = new DeviceHub({
    keyboardP1: DEFAULT_KEYBOARD_P1,
    keyboardP2: keyboardP2('numpad'),
    gamepad: DEFAULT_GAMEPAD,
  });
  private readonly accumulator = createAccumulator({ hz: SIM_HZ, maxSteps: MAX_STEPS_PER_FRAME });
  private previous: Fighter[];
  private alpha = 0;

  constructor(seed: number) {
    this.world = createWorld(seed, { dummies: LAB_DUMMIES });
    this.previous = cloneFighters(this.world.bodies);
  }

  /** Advances by the wall time since the last render frame. Pads must be polled first. */
  advance(elapsedMs: number): FrameReport {
    this.devices.poll();
    const paused = this.devices.paused;
    // While paused the accumulator is not fed, so no time debt builds up.
    const { steps, alpha } = this.accumulator.advance(paused ? 0 : elapsedMs);
    const inputs: FrameInput[][] = [];
    for (let i = 0; i < (paused ? 0 : steps); i += 1) {
      this.previous = cloneFighters(this.world.bodies);
      const frame = this.devices.sampleFrame();
      inputs.push(frame);
      step(this.world, frame);
    }
    if (!paused) this.alpha = alpha;
    return { frame: this.world.frame, hash: hashWorld(this.world), paused, inputs };
  }

  snapshot(): RenderSnapshot {
    return { previous: this.previous, current: this.world.bodies, alpha: this.alpha };
  }

  setFacingMode(slot: number, mode: FacingMode): void {
    setFacingMode(this.world, slot, mode);
  }

  setKeyboardP2Preset(preset: KeyboardP2Preset): void {
    this.devices.keyboardP2.setBindings(keyboardP2(preset));
  }
}

function cloneFighters(bodies: readonly Fighter[]): Fighter[] {
  return bodies.map((b) => ({ ...b, lastTap: [...b.lastTap] as Fighter['lastTap'] }));
}
