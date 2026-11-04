import type { ReplayLog, TrainerSettings } from '@ffp/sim';
import type { PadSnapshot, SlotState } from '@ffp/platform';

export interface DebugBody {
  x: number;
  z: number;
  y: number;
  state: number;
  facing: number;
  attackKind: number;
  action: string | null;
  category: string | null;
  stateFrame: number;
  hero: string | null;
  meter: number;
  health: number;
  combo: { open: boolean; hits: number; damage: number; scale: number };
  juggle: number;
  groundWindow: number;
  protectedRecovery: boolean;
  route: string[];
  wallBounceUsed: boolean;
  groundBounceUsed: boolean;
  contactAt: number;
  defense: number;
  defEvent: number;
  defOffset: number;
  defFrame: number;
  aiStep: number;
  grabbedBy: number;
  grabId: number;
  grabEvent: number;
  grabOffset: number;
  loadout: number[];
  /** Weapon id held (null = empty hands), and the last weapon event (WeaponEvent). */
  weapon: string | null;
  weaponEvent: number;
}

export interface DebugItem {
  id: number;
  weapon: string;
  state: number;
  holder: number;
  integrity: number;
  x: number;
  z: number;
  reserveFor: number;
}

export interface DebugScenery {
  pillar: { cracked: boolean; impacts: number };
  boards: { state: number; power: number };
  cog: { phase: number; phaseFrame: number };
  log: { kind: number; frame: number; damage: number; detail: number };
}

/** Test hook, installed in dev and e2e builds only (see debug.ts). */
export interface FfpDebugHook {
  frame(): number;
  body(id: number): DebugBody | undefined;
  hero(slot: number): DebugBody | undefined;
  /** Puts a player's hero next to the first dummy (offsets in pixels) and faces it. */
  place(slot: number, dx: number, dz: number): void;
  hash(): number;
  /**
   * Runs `hook` before every simulation step until it returns true. Keys dispatched from
   * the hook are sampled on that very step.
   */
  onStep(hook: () => boolean | void): void;
  /** Pauses at once (as Esc would); called from a step hook, no further step runs. */
  pauseNow(): void;
  /** M10 game shell: the open screen, the active profile and the saves. */
  shell: {
    screen(): string;
    profile(): unknown;
    storage(): string;
    flush(): Promise<void>;
    exportText(): Promise<string>;
  };
  runReplay(log: ReplayLog): number;
  /** Replaces real gamepads with these virtual ones from now on. */
  fakePads(pads: (PadSnapshot | null)[]): void;
  paused(): boolean;
  slots(): SlotState[];
  /** Lab: changes the training enemy's script. */
  setTrainer(settings: Partial<TrainerSettings>): void;
  setDefense(slot: number, value: number): void;
  /** Sets a hero's attack meter, in percent. */
  setMeter(slot: number, percent: number): void;
  equip(slot: number, kind: 'special' | 'ultimate', dir: number, action: string | null): string;
  /** Is this player's Grab escape window open (the ESCAPE telegraph)? */
  escapeOpen(slot: number): boolean;
  projectiles(): number;
  /** M6: weapons and fragments on stage. */
  items(): DebugItem[];
  scenery(): DebugScenery;
  /** Puts a player's hero at a stage position (pixels), facing right. */
  placeAt(slot: number, x: number, z: number): void;
  /** Lab: Dummy 1 fights with this weapon (null = unarmed). */
  armDummy(weapon: string | null): void;
  dummyToPillar(): void;
  /** M7: starts an arena at a difficulty (ids), or the Lab again (null). */
  startArena(arena: string | null, difficulty?: string, beat?: number): void;
  /** M9 stage run: beat, phase, locks, continues, workers, evidence and counters. */
  run(): DebugRun | null;
  /** M9: moves the heroes' centre to beat x (pixels), e.g. next to a worker or a lock. */
  moveHeroes(x: number, z?: number): void;
  /** M9: defeats every enemy still fighting (testing the flow, not the combat). */
  clearEnemies(): void;
  /** M9: a hero's Health (0 defeats it). */
  setHealth(slot: number, health: number): void;
  /** M7: the encounter's state (null in the Lab). */
  encounter(): DebugEncounter | null;
  /** M8: co-op state (invitation, last event, telemetry). */
  coop(): DebugCoop;
  /** M8: holds the first enemy in Hitstun with its combo open (a Stagger target). */
  staggerDummy(frames: number): void;
  /** M8 Auto Quality: setting and the level being drawn. */
  quality(): { setting: string; level: string };
  focusPaused(): boolean;
  /** M8: e2e builds start with the focus pause off (headless focus noise); this sets it. */
  pauseOnFocusLoss(on: boolean): void;
}

export interface DebugCoop {
  invite: { from: number; target: number; until: number } | null;
  log: { kind: number; frame: number; actor: number; target: number; detail: number };
  handoffs: number;
  finishers: number;
  assists: number;
  rescues: number;
  bundles: number;
}

export interface DebugEncounter {
  arena: string;
  difficulty: string;
  wave: number;
  result: number;
  viewMin: number;
  enemies: { id: number; kit: string; state: number; health: number; threat: number }[];
  boss: { phase: number; resolve: number; stagger: number; pending: boolean } | null;
  threat: number;
  budget: number;
}

export interface DebugRun {
  beat: number;
  beatId: string;
  phase: number;
  locksDone: number;
  locks: number;
  continues: number;
  continuesUsed: number;
  checkpointBeat: number;
  workers: { x: number; z: number; state: number }[];
  clue: number;
  evidence: number;
  evidenceAt: { x: number; z: number } | null;
  clueAt: { x: number; z: number } | null;
  stats: Record<string, number>;
  width: number;
  bounds: { minX: number; maxX: number };
}

declare global {
  /** The game version from the root package.json (vite.config.ts `define`). */
  const __FFP_VERSION__: string;
  interface Window {
    __ffp?: FfpDebugHook;
  }
}
