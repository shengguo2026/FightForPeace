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
  /** M11: the action ids in the loadout slots (null: empty). */
  loadoutIds: (string | null)[];
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
/** M12: the Wi-Fi session as tests see it. */
export interface DebugNet {
  status: string;
  role: string;
  error: string | null;
  room: { code: string; port: number; addresses: string[] } | null;
  lobby: unknown;
  phase: string | null;
  hold: { kind: string; by: number } | null;
  ready: boolean[];
  frame: number;
  delay: number;
  matched: number;
  resyncs: number;
  ended: string | null;
  hashes: [number, number][];
  /** M15: player slot, authority, missing partner, rollbacks and the session log. */
  slot: number;
  /** The input delay the session started with (quality monitoring may raise it). */
  startDelay: number;
  authority: boolean;
  partnerAbsent: boolean;
  linkUp: boolean;
  rollbacks: number;
  maxRollback: number;
  confirmed: number;
  standby: { code: string; port: number; addresses: string[] } | null;
  log: { frame: number; ev: string; slot: number }[];
  /** Results recorded on this computer for this session. */
  credited: boolean;
}

export interface DebugMedia {
  /** The cinematic on screen: id, shot, index, mode, paused, time in the shot. */
  cine: {
    id: string;
    shot: string;
    index: number;
    count: number;
    time: number;
    paused: boolean;
    video: boolean;
  } | null;
  music: { cue: string; state: string } | null;
  musicLog: string[];
  played: string[];
  audioRunning: boolean;
  effects: Record<string, number>;
}

export interface FfpDebugHook {
  /** M14: capability gates and the performance probe. */
  system: {
    capabilities(): {
      blocking: string[];
      disabled: string[];
      renderer: string | null;
      video: string | null;
      results: { id: string; ok: boolean; via: string | null }[];
    };
    perf(): import('@ffp/platform').PerfSnapshot;
    resetPerf(): void;
  };
  /** M13 media hooks. */
  media: {
    state(): DebugMedia;
    /** Advance the cinematic on screen by this many ms (its own clock). */
    advanceCine(ms: number): void;
  };
  /** M12 Wi-Fi co-op hooks. */
  net: {
    state(): DebugNet;
    /** Pretend to be another game version (lobby mismatch test). */
    fakeVersion(v: string | null): void;
    /** First launch with the defaults and this name (the M10 tests cover the real one). */
    quickSetup(name: string): Promise<void>;
    /** Request a courtesy hold as if this window lost focus. */
    loseFocus(): void;
    /** Make this game's world differ from the partner's (resync test). */
    corrupt(): void;
    /** M15: no message gets through either way for `ms` (a pulled cable). */
    cutFor(ms: number): void;
    /** M15: the courtesy hold of the next Wi-Fi session (ms; null: the default). */
    setCourtesy(ms: number | null): void;
  };
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
    grantCredits(n: number): void;
    /** Ends the running stage as if the evidence had been secured. */
    finishStage(): void;
    lesson(): { lesson: string; phase: string; met: string[]; done: number; count: number } | null;
    lastCombo(): { steps: string[]; hits: number } | null;
    cheats(): { hero: string[][]; session: string[]; marked: boolean };
    pilotActive(): boolean;
    /** M14: text that fell back to English or is missing (localization QA). */
    diagnostics(): string[];
    /** M21: records a completed stage on the active profile (opens the next one). */
    completeStage(stage: string): void;
    /** M21: the Move Preview state, or null. */
    preview(): { mode: string; landed: boolean[]; current: number; plays: number } | null;
    /** M21: the running stage's id, or null. */
    stageId(): string | null;
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
  /** M17: starts a mounted pursuit (corridor id) with options. */
  startPursuit(
    corridor: string,
    options?: { difficulty?: string; steady?: boolean; assist?: boolean },
  ): void;
  /** M17 mounted pursuit: riders, Road Riders, equipment and the Response Record. */
  pursuit(): DebugPursuit | null;
  /** M17: moves every rider forward to corridor x (pixels), keeping their lanes. */
  rideTo(x: number): void;
  /** M17: sets a rider's Stability (0 = critical next frame is the warned state). */
  setStability(slot: number, value: number): void;
  /** M18: starts a greenhouse room (room id) at a difficulty. */
  startGreenhouse(room: string, difficulty?: string): void;
  /** M18 greenhouse room: the Preservation Ledger, containers, grenade drill and record. */
  greenhouse(): DebugGreenhouse | null;
  /** M18: damages a Ledger asset (room name, e.g. bed-west) within the asset rules. */
  damageAsset(name: string, amount: number): void;
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
  reciprocal: number;
}

export interface DebugEncounter {
  arena: string;
  difficulty: string;
  wave: number;
  result: number;
  viewMin: number;
  enemies: { id: number; kit: string; state: number; health: number; threat: number }[];
  boss: {
    phase: number;
    resolve: number;
    stagger: number;
    pending: boolean;
    /** M19: 1 surrender, 2 forced capture; the intercept's outcome; supports summoned. */
    capture: number;
    intercept: number;
    summoned: boolean;
    gunLost: number;
  } | null;
  threat: number;
  budget: number;
}

export interface DebugGreenhouse {
  room: string;
  grade: string;
  score: number;
  assets: {
    name: string;
    kind: string;
    x: number;
    z: number;
    condition: number;
    max: number;
    state: number;
  }[];
  containers: { kind: string; x: number; z: number; opened: boolean }[];
  grenadePhase: number;
  record: Record<string, number>;
}

export interface DebugPursuit {
  corridor: string;
  phase: number;
  checkpoint: number;
  camX: number;
  riders: {
    slot: number;
    hero: string;
    state: number;
    x: number;
    z: number;
    speed: number;
    stability: number;
    critical: boolean;
    health: number;
  }[];
  enemies: {
    id: number;
    state: number;
    x: number;
    z: number;
    stability: number;
    target: number;
    /** M19: Marek's own bike. */
    boss: boolean;
  }[];
  /** M19 intercept: 0 none, 1 broken, 2 dismounted, 3 riding. */
  marek: number;
  equipment: number[];
  record: Record<string, number>;
  grades: { id: string; score: number; grade: string }[];
  mastery: boolean;
  cheatAssisted: boolean;
}

interface DebugRun {
  beat: number;
  beatId: string;
  phase: number;
  locksDone: number;
  /** M20: each beat's branch outcome (0 skipped, 1 completed, 2 failed). */
  branches: number[];
  /** M20: Marek's capture record (route 1 resolve, 2 forced), or null. */
  capture: { route: number; intercept: number } | null;
  /** M20: the intercept's outcome carried into the boss room. */
  intercept: number;
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
