import { type Signal, signal } from '@preact/signals';
import type { FacingMode } from '@ffp/sim';
import type {
  KeyboardP2Preset,
  LayoutName,
  PadFamily,
  Prompt,
  PromptContext,
  QualityLevel,
  QualitySetting,
} from '@ffp/platform';

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
  juggleBand: number;
  bridge: boolean;
  exhausted: boolean;
  reaction: string;
  ground: string;
  wallBounce: string;
  groundBounce: string;
  /** Ground route: window frames left, extension and finisher state. */
  groundRoute: string;
  /** Protected recovery, or how the last combo ended. */
  protection: string;
  /** Names of the actions that connected, in order. */
  route: string[];
}

/** One Academy recipe as the Lab shows it for one player. */
export interface RecipeView {
  id: string;
  name: string;
  family: string;
  /** Step labels: action names (alternatives joined with "or"); jump hints included. */
  steps: { label: string; jump: boolean; input: string; done: boolean }[];
  done: boolean;
  performed: number;
  counterHit: boolean;
}

export interface RecipePlayerView {
  slot: number;
  hero: string;
  recipes: RecipeView[];
}

/** One player's defense, for the F8 panel. */
export interface DefenseView {
  slot: number;
  defense: number;
  state: string;
  guard: string;
  /** Most recent readouts first: frame and text. */
  log: { frame: number; text: string; good: boolean }[];
  counts: Record<
    'guard' | 'exact' | 'counter' | 'crush' | 'breaker' | 'hit' | 'early' | 'late',
    number
  >;
}

/** One player's grabs and loadout, for the F9 panel. */
export interface GrabPlayerView {
  slot: number;
  state: string;
  /** Hold, Grab escape window or restraint, in words. */
  hold: string;
  escape: boolean;
  log: { frame: number; text: string; good: boolean }[];
  /** Move names per slot: neutral, forward, backward, up, down. */
  specials: string[];
  ultimates: string[];
  meter: number;
}

/** Training-enemy script as the Lab edits it. */
export interface TrainerView {
  attackers: number;
  pattern: number;
  interval: number;
  approach: boolean;
  /** Weapon index Dummy 1 fights with (-1 = unarmed). */
  arm: number;
}

/** F10: weapons and the environmental slice, in words. */
export interface WeaponPanelView {
  players: {
    slot: number;
    holding: string;
    log: { frame: number; text: string; good: boolean }[];
  }[];
  items: string[];
  scenery: string[];
  lastEvent: string;
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
  recipesOpen: Signal<boolean>;
  recipes: Signal<RecipePlayerView[]>;
  slowMotion: Signal<boolean>;
  infiniteMeter: Signal<boolean>;
  counterHit: Signal<boolean>;
  refill: Signal<boolean>;
  defenseOpen: Signal<boolean>;
  defense: Signal<DefenseView[]>;
  infiniteDefense: Signal<boolean>;
  trainer: Signal<TrainerView>;
  grabOpen: Signal<boolean>;
  grab: Signal<GrabPlayerView[]>;
  /** Last loadout change refused, in words ('' when it was accepted). */
  equipNote: Signal<string>;
  weaponOpen: Signal<boolean>;
  weapons: Signal<WeaponPanelView>;
  /** Arena (name) and difficulty (name) picked in the arena panel. */
  arenaPick: Signal<{ arena: string; difficulty: string; beat: number }>;
  arena: Signal<ArenaPanelView>;
  /** M17: pursuit options picked in the arena panel. */
  pursuitPick: Signal<{ assist: boolean; steady: boolean }>;
  /** M17: a mounted pursuit is running (the hint bar shows the mounted controls). */
  riding: Signal<boolean>;
  /** M8: paused because the window lost focus (not a user or controller pause). */
  focusPaused: Signal<boolean>;
  coop: Signal<CoopPanelView>;
  /** M8 Auto Quality: the chosen setting and the level being drawn. */
  quality: Signal<{ setting: QualitySetting; level: QualityLevel; ms: number }>;
  /** M9 stage journey: interaction prompts, story text and notices. */
  stage: Signal<StageHudView>;
  /** M9 results screen (null until the stage is complete). */
  results: Signal<ResultsView | null>;
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
    recipesOpen: signal(false),
    recipes: signal([]),
    slowMotion: signal(false),
    infiniteMeter: signal(false),
    counterHit: signal(false),
    refill: signal(true),
    defenseOpen: signal(true),
    defense: signal([]),
    infiniteDefense: signal(false),
    trainer: signal({ attackers: 1, pattern: 0, interval: 70, approach: true, arm: -1 }),
    grabOpen: signal(false),
    grab: signal([]),
    equipNote: signal(''),
    weaponOpen: signal(false),
    weapons: signal({ players: [], items: [], scenery: [], lastEvent: '' }),
    arenaPick: signal({ arena: 'stage1', difficulty: 'medium', beat: 0 }),
    arena: signal({ running: false, lines: [] }),
    pursuitPick: signal({ assist: false, steady: false }),
    riding: signal(false),
    focusPaused: signal(false),
    coop: signal({ lines: [], invite: null }),
    quality: signal({ setting: 'auto', level: 'high', ms: 16.7 }),
    stage: signal({ active: false, prompts: [], story: '', notice: '' }),
    results: signal(null),
  };
}

export const HISTORY_LENGTH = 12;

/** M7 arena panel: the chosen arena and difficulty, and the director's numbers. */
export interface ArenaPanelView {
  running: boolean;
  lines: string[];
}

/** M8 Co-op panel and the invited partner's prompt. */
export interface CoopPanelView {
  lines: string[];
  /** The open invitation: who must confirm (slot), frames left, the finisher's name. */
  invite: { from: number; to: number; left: number; name: string } | null;
}

/** M9: one player's interaction prompt (text with action tokens) and hold progress. */
export interface StagePrompt {
  slot: number;
  text: string;
  /** 0–1 while holding, -1 when not holding. */
  progress: number;
}

/** M9 stage HUD drawn by the interface (prompts show each player's own bindings). */
export interface StageHudView {
  active: boolean;
  prompts: StagePrompt[];
  /** A clue or the sponsor evidence, shown for a while after it was inspected. */
  story: string;
  /** A short notice such as "Checkpoint saved". */
  notice: string;
}

/** M9 results screen. */
export interface ResultsView {
  title: string;
  difficulty: string;
  /** Beat the run started from (0 = the whole stage). */
  startBeat: number;
  grades: { label: string; value: string; grade: string }[];
  overall: string;
  lines: string[];
  /** M11: the 100-point total, the capping category, the run score and the loadout. */
  points: number;
  capped: string | null;
  score: number;
  standard: boolean;
  cheatAssisted: boolean;
  cheatCodes: string[];
}
