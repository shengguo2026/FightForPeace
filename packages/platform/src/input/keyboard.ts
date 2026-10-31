import type { FrameInput } from '@ffp/sim';
import { ACTION_NAMES, Action, type BindableInput, type Bindings, DIRECTIONS } from './actions';

type Axis = -1 | 0 | 1;

/**
 * Turns keyboard events (physical codes) into one FrameInput per simulation frame.
 * Directions on each axis follow the most recently pressed key that is still held.
 * Action presses are edge-triggered and latched until the next sample(), so a tap
 * shorter than one frame is never lost.
 */
export class KeyboardState {
  private readonly codeToInputs = new Map<string, BindableInput[]>();
  private readonly heldCodes = new Set<string>();
  private readonly heldCount = new Map<BindableInput, number>();
  /** Press order per axis; the last entry wins. */
  private xOrder: Axis[] = [];
  private zOrder: Axis[] = [];
  private pressed = 0;

  constructor(bindings: Bindings) {
    for (const input of [...DIRECTIONS, ...ACTION_NAMES]) {
      for (const code of bindings.codes[input]) {
        const list = this.codeToInputs.get(code) ?? [];
        list.push(input);
        this.codeToInputs.set(code, list);
      }
    }
  }

  keyDown(code: string): void {
    if (this.heldCodes.has(code)) return; // auto-repeat
    const inputs = this.codeToInputs.get(code);
    if (!inputs) return;
    this.heldCodes.add(code);
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
  }

  /** Current directions plus actions pressed since the last sample. Clears the presses. */
  sample(): FrameInput {
    const input: FrameInput = {
      moveX: this.xOrder.at(-1) ?? 0,
      moveZ: this.zOrder.at(-1) ?? 0,
      pressed: this.pressed,
    };
    this.pressed = 0;
    return input;
  }

  private activate(input: BindableInput): void {
    switch (input) {
      case 'left':
        this.xOrder = [...this.xOrder.filter((d) => d !== -1), -1];
        break;
      case 'right':
        this.xOrder = [...this.xOrder.filter((d) => d !== 1), 1];
        break;
      case 'up':
        this.zOrder = [...this.zOrder.filter((d) => d !== -1), -1];
        break;
      case 'down':
        this.zOrder = [...this.zOrder.filter((d) => d !== 1), 1];
        break;
      default:
        this.pressed |= Action[input];
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
