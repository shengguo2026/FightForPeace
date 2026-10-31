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
  hero: string;
  heroId: string;
  action: string;
  phase: string;
  verdict: string;
  meter: number;
  bridge: string;
  ctx: PromptContext;
  history: HistoryEntry[];
}

/** The training dummy the Lab follows: the last one that was hit. */
export interface TargetView {
  name: string;
  open: boolean;
  health: string;
  hits: number;
  damage: number;
  scale: number;
  stunBudget: number;
  stunBand: number;
  meterBudget: number;
  juggleBudget: number;
  bridge: boolean;
  exhausted: boolean;
  reaction: string;
  ground: string;
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
  target: Signal<TargetView | null>;
  moveListOpen: Signal<boolean>;
  slowMotion: Signal<boolean>;
  infiniteMeter: Signal<boolean>;
  counterHit: Signal<boolean>;
  refill: Signal<boolean>;
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
    target: signal(null),
    moveListOpen: signal(false),
    slowMotion: signal(false),
    infiniteMeter: signal(false),
    counterHit: signal(false),
    refill: signal(true),
  };
}

export const HISTORY_LENGTH = 12;
