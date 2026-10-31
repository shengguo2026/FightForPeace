import { DirBit, type FrameInput } from '@ffp/sim';
import { ACTION_NAMES, Action, type BindableInput, type Bindings, DIRECTIONS } from './actions';

type Axis = -1 | 0 | 1;

/**
 * Turns keyboard events (physical codes) into one FrameInput per simulation frame for one
 * binding set (P1 cluster, or P2's split-keyboard half). Every window key event can be
 * given to every KeyboardState; codes outside its bindings are ignored.
 *
 * Directions on each axis follow the most recently pressed key that is still held.
 * Presses (actions and directions) are edge-triggered and latched until the next
 * sample(), so a tap shorter than one frame is never lost. A second latch feeds the
 * per-render-frame device logic (join, pause, device switching) through takeEvents().
 */
export class KeyboardState {
  private codeToInputs = new Map<string, BindableInput[]>();
  private readonly heldCodes = new Set<string>();
  private readonly heldCount = new Map<BindableInput, number>();
  /** Press order per axis; the last entry wins. */
  private xOrder: Axis[] = [];
  private zOrder: Axis[] = [];
  private pressed = 0;
  private dirPressed = 0;
  private eventPressed = 0;
  private eventActive = false;

  constructor(private bindingsValue: Bindings) {
    this.index(bindingsValue);
  }

  get bindings(): Bindings {
    return this.bindingsValue;
  }

  /** Replaces the bindings (rebinding takes effect at once) and releases everything. */
  setBindings(b: Bindings): void {
    this.bindingsValue = b;
    this.index(b);
    this.blur();
  }

  /** Whether a code is bound to anything in this set (used to preventDefault). */
  binds(code: string): boolean {
    return this.codeToInputs.has(code);
  }

  /** Codes currently held, for the Lab's held-keys (ghosting) readout. */
  held(): string[] {
    return [...this.heldCodes];
  }

  keyDown(code: string): void {
    if (this.heldCodes.has(code)) return; // auto-repeat
    const inputs = this.codeToInputs.get(code);
    if (!inputs) return;
    this.heldCodes.add(code);
    this.eventActive = true;
    for (const input of inputs) {
      const count = this.heldCount.get(input) ?? 0;
      this.heldCount.set(input, count + 1);
      if (count === 0) this.activate(input);
    }
  }

  keyUp(code: string): void {
    if (!this.heldCodes.delete(code)) return;
    for (const input of this.codeToInputs.get(code) ?? []) {
      const count = (this.heldCount.get(input) ?? 1) - 1;
      if (count > 0) {
        this.heldCount.set(input, count);
      } else {
        this.heldCount.delete(input);
        this.deactivate(input);
      }
    }
  }

  /** Releases everything, for window blur or a hidden tab, when keyup events are lost. */
  blur(): void {
    this.heldCodes.clear();
    this.heldCount.clear();
    this.xOrder = [];
    this.zOrder = [];
    this.pressed = 0;
    this.dirPressed = 0;
    this.eventPressed = 0;
    this.eventActive = false;
  }

  /** Current directions and held actions, plus presses since the last sample. */
  sample(): FrameInput {
    let held = 0;
    for (const name of ACTION_NAMES) if (this.heldCount.has(name)) held |= Action[name];
    const input: FrameInput = {
      moveX: this.xOrder.at(-1) ?? 0,
      moveZ: this.zOrder.at(-1) ?? 0,
      pressed: this.pressed,
      held,
      dirPressed: this.dirPressed,
    };
    this.pressed = 0;
    this.dirPressed = 0;
    return input;
  }

  /** Actions pressed and whether any bound key went down since the last call. */
  takeEvents(): { pressed: number; active: boolean } {
    const e = { pressed: this.eventPressed, active: this.eventActive };
    this.eventPressed = 0;
    this.eventActive = false;
    return e;
  }

  private index(b: Bindings): void {
    this.codeToInputs = new Map();
    for (const input of [...DIRECTIONS, ...ACTION_NAMES]) {
      for (const code of b.codes[input]) {
        const list = this.codeToInputs.get(code) ?? [];
        list.push(input);
        this.codeToInputs.set(code, list);
      }
    }
  }

  private activate(input: BindableInput): void {
    switch (input) {
      case 'left':
        this.xOrder = [...this.xOrder.filter((d) => d !== -1), -1];
        this.dirPressed |= DirBit.left;
        break;
      case 'right':
        this.xOrder = [...this.xOrder.filter((d) => d !== 1), 1];
        this.dirPressed |= DirBit.right;
        break;
      case 'up':
        this.zOrder = [...this.zOrder.filter((d) => d !== -1), -1];
        this.dirPressed |= DirBit.up;
        break;
      case 'down':
        this.zOrder = [...this.zOrder.filter((d) => d !== 1), 1];
        this.dirPressed |= DirBit.down;
        break;
      default:
        this.pressed |= Action[input];
        this.eventPressed |= Action[input];
    }
  }

  private deactivate(input: BindableInput): void {
    switch (input) {
      case 'left':
        this.xOrder = this.xOrder.filter((d) => d !== -1);
        break;
      case 'right':
        this.xOrder = this.xOrder.filter((d) => d !== 1);
        break;
      case 'up':
        this.zOrder = this.zOrder.filter((d) => d !== -1);
        break;
      case 'down':
        this.zOrder = this.zOrder.filter((d) => d !== 1);
        break;
      default:
        break; // presses stay latched until sample()
    }
  }
}
