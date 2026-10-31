import { DirBit, type FrameInput } from '@ffp/sim';
import {
  ACTION_NAMES,
  Action,
  type Bindings,
  DIRECTIONS,
  type Direction,
  PAD_BUTTONS,
} from './actions';

type Axis = -1 | 0 | 1;

/** A plain copy of a browser Gamepad, so the logic can be tested without a browser. */
export interface PadSnapshot {
  id: string;
  index: number;
  connected: boolean;
  /** 'standard' when the browser knows the button layout. */
  mapping: string;
  /** pressed state per W3C standard button index. */
  buttons: boolean[];
  axes: number[];
}

export type PadFamily = 'xbox' | 'playstation' | 'nintendo' | 'generic';

/** Radial dead zone for the left stick (candidate Combat Lab value). */
export const STICK_DEAD_ZONE = 0.3;

const SECTORS: readonly [Axis, Axis][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Left-stick position → one of 8 directions (45° sectors) or neutral inside the dead
 * zone. Positive y is down on the stick, which is towards the front of the stage
 * (moveZ = 1). Walking speed does not depend on how far the stick is pushed.
 */
export function stickDirection(x: number, y: number, deadZone = STICK_DEAD_ZONE): [Axis, Axis] {
  if (x * x + y * y < deadZone * deadZone) return [0, 0];
  const sector = ((Math.round(Math.atan2(y, x) / (Math.PI / 4)) % 8) + 8) % 8;
  return SECTORS[sector]!;
}

/** Brand family from the browser's device name (Chrome, Edge, Firefox and Safari formats). */
export function padFamily(id: string): PadFamily {
  const s = id.toLowerCase();
  if (/045e|xinput|xbox|microsoft/.test(s)) return 'xbox';
  if (/054c|playstation|dualsense|dualshock/.test(s)) return 'playstation';
  if (/057e|nintendo|switch|pro controller|joy-con/.test(s)) return 'nintendo';
  return 'generic';
}

const DIR_BIT: Record<Direction, number> = DirBit;

/**
 * One gamepad's state, polled once per render frame with update(). Like KeyboardState it
 * latches presses until the next sample(), and has a second latch for device logic.
 */
export class GamepadState {
  readonly index: number;
  readonly id: string;
  readonly family: PadFamily;
  private prevButtons: boolean[] = [];
  private moveX: Axis = 0;
  private moveZ: Axis = 0;
  private heldMask = 0;
  private pressed = 0;
  private dirPressed = 0;
  private eventPressed = 0;
  private eventActive = false;
  private codeIndex = new Map<string, number>();

  constructor(
    private bindingsValue: Bindings,
    snapshot: Pick<PadSnapshot, 'id' | 'index'>,
  ) {
    this.index = snapshot.index;
    this.id = snapshot.id;
    this.family = padFamily(snapshot.id);
    PAD_BUTTONS.forEach((name, i) => this.codeIndex.set(name, i));
  }

  get bindings(): Bindings {
    return this.bindingsValue;
  }

  setBindings(b: Bindings): void {
    this.bindingsValue = b;
  }

  /** Reads one poll of the pad. */
  update(snap: PadSnapshot): void {
    const down = (code: string) => {
      const i = this.codeIndex.get(code);
      return i !== undefined && snap.buttons[i] === true;
    };
    const wasDown = (code: string) => {
      const i = this.codeIndex.get(code);
      return i !== undefined && this.prevButtons[i] === true;
    };
    const any = (codes: string[], f: (c: string) => boolean) => codes.some(f);

    // Actions: held mask and fresh presses.
    let held = 0;
    for (const name of ACTION_NAMES) {
      const codes = this.bindingsValue.codes[name];
      if (any(codes, down)) {
        held |= Action[name];
        if (!any(codes, wasDown)) {
          this.pressed |= Action[name];
          this.eventPressed |= Action[name];
          this.eventActive = true;
        }
      }
    }
    this.heldMask = held;

    // Directions: the d-pad (as bound) wins over the stick when any of it is held.
    const dirHeld = (d: Direction) => any(this.bindingsValue.codes[d], down);
    const [mx, mz]: [Axis, Axis] = DIRECTIONS.some(dirHeld)
      ? [
          dirHeld('left') ? -1 : dirHeld('right') ? 1 : 0,
          dirHeld('up') ? -1 : dirHeld('down') ? 1 : 0,
        ]
      : stickDirection(snap.axes[0] ?? 0, snap.axes[1] ?? 0);
    if (mx !== 0 && mx !== this.moveX) this.dirPressed |= DIR_BIT[mx < 0 ? 'left' : 'right'];
    if (mz !== 0 && mz !== this.moveZ) this.dirPressed |= DIR_BIT[mz < 0 ? 'up' : 'down'];
    if ((mx !== 0 && mx !== this.moveX) || (mz !== 0 && mz !== this.moveZ)) {
      this.eventActive = true;
    }
    this.moveX = mx;
    this.moveZ = mz;
    this.prevButtons = [...snap.buttons];
  }

  sample(): FrameInput {
    const input: FrameInput = {
      moveX: this.moveX,
      moveZ: this.moveZ,
      pressed: this.pressed,
      held: this.heldMask,
      dirPressed: this.dirPressed,
    };
    this.pressed = 0;
    this.dirPressed = 0;
    return input;
  }

  takeEvents(): { pressed: number; active: boolean } {
    const e = { pressed: this.eventPressed, active: this.eventActive };
    this.eventPressed = 0;
    this.eventActive = false;
    return e;
  }

  /** Bound buttons currently held, by position name (for the Lab). */
  heldButtons(): string[] {
    return PAD_BUTTONS.filter((_, i) => this.prevButtons[i] === true);
  }
}
