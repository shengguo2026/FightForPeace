import { type Signal, signal } from '@preact/signals';
import type { FacingMode } from '@ffp/sim';
import type { KeyboardP2Preset, LayoutName, PadFamily, Prompt, PromptContext } from '@ffp/platform';

export type PromptStyle = 'auto' | PadFamily;

export interface HistoryEntry {
  frame: number;
  prompts: Prompt[];
  key: string;
}

/** Everything the Lab shows about one player, refreshed every render frame. */
export interface PlayerView {
  slot: number;
  joined: boolean;
  device: string;
  waiting: boolean;
  state: string;
  speed: string;
  facing: string;
  facingMode: FacingMode;
  target: string;
  buffered: string;
  ctx: PromptContext;
  history: HistoryEntry[];
}

export interface LabState {
  visible: Signal<boolean>;
  settingsOpen: Signal<boolean>;
  showCollision: Signal<boolean>;
  frame: Signal<number>;
  hash: Signal<string>;
  fps: Signal<number>;
  paused: Signal<boolean>;
  waiting: Signal<number[]>;
  players: Signal<PlayerView[]>;
  heldKeys: Signal<string[]>;
  promptStyle: Signal<PromptStyle>;
  layout: Signal<LayoutName>;
  p2Preset: Signal<KeyboardP2Preset>;
  dummiesChase: Signal<boolean>;
  rebinding: Signal<boolean>;
}

export function createLabState(visible: boolean): LabState {
  return {
    visible: signal(visible),
    settingsOpen: signal(false),
    showCollision: signal(false),
    frame: signal(0),
    hash: signal('00000000'),
    fps: signal(0),
    paused: signal(false),
    waiting: signal([]),
    players: signal([]),
    heldKeys: signal([]),
    promptStyle: signal('auto'),
    layout: signal('qwerty'),
    p2Preset: signal('numpad'),
    dummiesChase: signal(false),
    rebinding: signal(false),
  };
}

export const HISTORY_LENGTH = 12;
