import { fx } from '../math/fixed';
import { Cheat, codesOf, sessionCheat } from '../cheats/cheats';
import { defaultLoadout } from '../combat/loadout';
import { STAGE_DATA } from '../combat/heroes.gen';
import type { BeatDef, GradeCategoryDef, StageDef } from '../combat/types';
import { kitOf } from '../combat/roster';
import { emptyContext } from '../combat/context';
import { createEnvironment, emptyEnvironment } from '../combat/environment';
import { claim, spawnItem } from '../combat/held';
import { weaponIndex, WEAPONS } from '../combat/armory';
import { REACTION } from '../combat/reactions';
import { LAB_LAYOUT, type StageLayout } from '../world/stage';
import { ActionBit } from '../input/bits';
import { DIFFICULTIES, profileOf } from '../enemies/data';
import { Result, newEncounter, setupDevices, updateView } from '../enemies/encounter';
import { VIEW_WIDTH } from '../enemies/director';
import {
  CORRIDORS,
  PursuitPhase,
  corridorIndex,
  responseRecord,
  setupPursuit,
} from '../mounted/pursuit';
import {
  AssetState,
  GREENHOUSE,
  ROOMS,
  roomIndex,
  setupGreenhouse,
} from '../preservation/greenhouse';
import {
  BranchOutcome,
  ChannelKind,
  type RunAsset,
  type RunCarry,
  type RunCapture,
  type RunCheckpoint,
  type ChannelState,
  type Encounter,
  type Fighter,
  type FrameInput,
  MoveState,
  RunEvent,
  RunPhase,
  type RunStats,
  type StageRun,
  type World,
  WorkerState,
} from '../world/types';

/** Stage definitions (generated from packages/data/stages/*.yaml). */
export const STAGES: readonly StageDef[] = STAGE_DATA;

/** Frames a freed worker cheers before running home. */
export const WORKER_CHEER = 50;
/** A worker running home moves this far per frame (fixed point). */
export const WORKER_RUN = fx(9);
/** Heroes keep this far inside the view while walking in co-op (fixed point). */
const TETHER = fx(60);

export function stageIndex(id: string): number {
  const i = STAGES.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`unknown stage "${id}"`);
  return i;
}

/** Heroes a stage allows (its locked roster plus its guests); empty: every hero. */
export function stageHeroes(stage: number): readonly string[] {
  const def = STAGES[stage]!;
  return def.roster.length > 0 ? [...def.roster, ...def.guests] : [];
}

/** The hero a player gets on a stage: their pick if the stage allows it, else a roster hero. */
export function stageHero(stage: number, slot: number, pick: string): string {
  const allowed = stageHeroes(stage);
  if (allowed.length === 0 || allowed.includes(pick)) return pick;
  return allowed[slot % allowed.length]!;
}

/**
 * The beat after the current one: the only `next`, or with a branch the lane the heroes
 * leave on (upper half of the floor: the first branch, lower half: the second). -1: none.
 */
export function nextBeat(world: World): number {
  const beat = beatOf(world);
  if (!beat || beat.next.length === 0) return -1;
  if (beat.next.length === 1) return beat.next[0]!;
  const all = heroes(world).filter((h) => !h.ko);
  const list = all.length > 0 ? all : heroes(world);
  const z = list.length > 0 ? Math.trunc(list.reduce((s, h) => s + h.z, 0) / list.length) : 0;
  const mid = Math.trunc((world.bounds.minZ + world.bounds.maxZ) / 2);
  return z < mid ? beat.next[0]! : beat.next[1]!;
}

export function stageOf(world: World): StageDef | null {
  return world.run ? (STAGES[world.run.stage] ?? null) : null;
}

export function beatOf(world: World): BeatDef | null {
  const run = world.run;
  return run ? (STAGES[run.stage]?.beats[run.beat] ?? null) : null;
}

/** M20: a mounted pursuit beat. */
export const isCorridorBeat = (b: BeatDef) => b.corridor !== '';
/** M20: a greenhouse room beat. */
export const isRoomBeat = (b: BeatDef) => b.room !== '';

/** Encounters a beat holds: its camera locks, or a room's waves (one), or none. */
export function lockCount(beat: BeatDef): number {
  if (isRoomBeat(beat)) return (ROOMS[roomIndex(beat.room)]?.arena ?? -1) >= 0 ? 1 : 0;
  if (isCorridorBeat(beat)) return 0;
  return beat.locks.length;
}

/** Frames a finished pursuit stays on screen before the fade to the next beat. */
export const PURSUIT_HOLD = 120;

function zeroStats(): RunStats {
  return {
    frames: 0,
    defeated: 0,
    surrendered: 0,
    fled: 0,
    damageTaken: 0,
    food: 0,
    downs: 0,
    revives: 0,
    workersFreed: 0,
    clues: 0,
    evidence: 0,
    bestHits: 0,
    bestDamage: 0,
    reciprocal: 0,
    accord: 0,
    calls: 0,
    callsBroken: 0,
    breachesStopped: 0,
    breachesDone: 0,
    grenadeDamage: 0,
  };
}

function idleChannel(): ChannelState {
  return { kind: ChannelKind.None, target: 0, progress: 0, need: 0 };
}

type HeroFactory = (world: World, slot: number) => Fighter;
let makeHero: HeroFactory | null = null;
/** world.ts installs its hero constructor (avoids an import cycle). */
export function installHeroFactory(f: HeroFactory): void {
  makeHero = f;
}

/** A fresh run of stage `stage` at `difficulty`, starting at `beat` (Lab practice: later). */
export function newRun(stage: number, difficulty: number, beat = 0): StageRun {
  const def = STAGES[stage]!;
  return {
    stage,
    difficulty,
    startBeat: beat,
    beat,
    phase: RunPhase.Walk,
    phaseFrame: 0,
    locksDone: 0,
    floorX: 0,
    continues: def.continues[difficulty] ?? 0,
    continuesUsed: 0,
    checkpoint: null,
    workers: [],
    pickups: [],
    cacheOpen: false,
    clue: 0,
    evidence: 0,
    channel: [idleChannel(), idleChannel()],
    lastHealth: [0, 0],
    downedAt: [-1, -1],
    counted: [],
    stats: zeroStats(),
    workersTotal: def.beats.reduce((n, b) => n + b.workers.length, 0),
    cluesTotal: def.beats.reduce((n, b) => n + (b.clue ? 1 : 0) + (b.evidence ? 1 : 0), 0),
    event: { kind: RunEvent.None, frame: 0, detail: 0 },
    ledger: [],
    response: [],
    branches: def.beats.map(() => BranchOutcome.Skipped),
    intercept: 0,
    capture: null,
    carry: [null, null],
    assist: false,
    resume: RunPhase.Walk,
  };
}

function event(world: World, kind: number, detail = 0): void {
  world.run!.event = { kind, frame: world.frame, detail };
}

function heroes(world: World): Fighter[] {
  return world.bodies.filter((b) => b.team === 'hero');
}

export function isDowned(f: Fighter): boolean {
  return f.team === 'hero' && f.ko && f.state === MoveState.Defeated;
}

/** The heroes' centre x (fixed point), living heroes first; 0 without heroes. */
function centreX(world: World): number {
  const all = heroes(world);
  const up = all.filter((h) => !h.ko);
  const list = up.length > 0 ? up : all;
  if (list.length === 0) return 0;
  return Math.trunc(list.reduce((s, h) => s + h.x, 0) / list.length);
}

/** A hero standing up again after a revive or a rejoin, with `percent` of its Health. */
function raise(f: Fighter, percent: number): void {
  f.ko = false;
  f.health = Math.max(1, Math.trunc((f.maxHealth * percent) / 100));
  f.state = MoveState.GetUp;
  f.stateFrame = 0;
  f.stun = REACTION.getUpFrames;
  f.vx = 0;
  f.vz = 0;
  f.vy = 0;
  f.y = 0;
  f.ctx = emptyContext();
  f.protectedRecovery = false;
  f.groundWindow = 0;
}

/**
 * Begins beat `n`: a fresh strip (bounds, scenery, weapons, food, workers, clue), the
 * heroes at its entry with their Health and meter, the quiet base encounter, and the
 * checkpoint when the beat takes one (not when a continue is restoring it). M20: a
 * corridor beat mounts the heroes on a pursuit; a room beat builds its greenhouse room
 * (its waves start at once); weapons carried from the last on-foot beat come along.
 */
export function enterBeat(world: World, n: number, record = true): void {
  const run = world.run!;
  const def = STAGES[run.stage]!;
  const beat = def.beats[n]!;
  run.beat = n;
  run.phase = RunPhase.Walk;
  run.phaseFrame = world.frame;
  run.locksDone = 0;
  run.floorX = 0;
  run.counted = [];
  run.cacheOpen = false;
  run.clue = beat.clue ? 1 : 0;
  run.evidence = 0;
  run.channel = [idleChannel(), idleChannel()];
  run.workers = beat.workers.map((w) => ({
    x: fx(w.x),
    z: fx(w.z),
    look: w.look,
    state: WorkerState.Bound,
    since: world.frame,
  }));
  run.pickups = pantry(world, beat.pickups);
  world.bounds = { minX: 0, maxX: fx(beat.width), minZ: FLOOR_MIN_Z, maxZ: FLOOR_MAX_Z };
  world.projectiles = [];
  world.items = [];
  world.bodies = world.bodies.filter((b) => b.team === 'hero');
  world.pursuit = null;
  world.greenhouse = null;
  world.encounter = null;
  const layout: StageLayout | null = beat.layout === 'mill' ? LAB_LAYOUT : null;
  world.environment = layout ? createEnvironment(layout) : emptyEnvironment();
  if (layout)
    for (const i of layout.items) spawnItem(world, weaponIndex(i.weapon), fx(i.x), fx(i.z));
  for (const h of heroes(world)) {
    // A hero still down when the beat ends returns at this encounter boundary (D8).
    if (h.ko) raise(h, def.rules.rejoinPercent);
    placeHero(world, h, beat);
  }
  run.downedAt = [-1, -1];
  // The checkpoint keeps what the heroes carry into the beat, before they take it out.
  const checkpoint = beat.checkpoint && record;
  if (checkpoint) takeCheckpoint(world);
  if (isCorridorBeat(beat)) {
    setupPursuit(world, corridorIndex(beat.corridor), run.difficulty, run.assist);
  } else if (isRoomBeat(beat)) {
    setupGreenhouse(world, roomIndex(beat.room), run.difficulty);
    for (const h of heroes(world)) placeHero(world, h, beat);
    // setupGreenhouse built the room's encounter (none for a quiet room).
    const enc = world.encounter as Encounter | null;
    if (enc) {
      enc.start = world.frame;
      // M19/M20: the latest intercept's outcome is the boss room's opening.
      enc.opening = run.intercept;
      run.phase = RunPhase.Locked;
    }
  } else {
    world.encounter = newEncounter(beat.base, run.difficulty, world.frame);
    world.encounter.result = Result.Waiting;
  }
  if (!isCorridorBeat(beat)) unpack(world);
  updateView(world);
  event(world, RunEvent.BeatStart, n);
  if (checkpoint) event(world, RunEvent.Checkpoint, n);
}

/** Depth band of an on-foot beat (a corridor sets its own road band). */
const FLOOR_MIN_Z = fx(620);
const FLOOR_MAX_Z = fx(1000);

/** M20: weapons the heroes carried out of the last on-foot beat go back into their hands. */
function unpack(world: World): void {
  const run = world.run!;
  for (const h of heroes(world)) {
    const c = run.carry[h.slot];
    if (!c) continue;
    const item = spawnItem(world, c.def, h.x, h.z);
    item.integrity = c.integrity;
    item.ammo = c.ammo;
    claim(world, h, item);
    run.carry[h.slot] = null;
  }
}

/**
 * M20: the beat the heroes leave. An on-foot beat hands its held weapons to the carry
 * (a grenade never carries); a room beat adds its Ledger assets to the stage record (and
 * Marek's capture when he was in it); a corridor beat adds its Response Record and the
 * intercept's outcome; a branch beat settles its outcome. Returns the branch outcome, or -1.
 */
function leaveBeat(world: World): number {
  const run = world.run!;
  const beat = beatOf(world)!;
  if (isCorridorBeat(beat)) {
    const p = world.pursuit;
    if (p) {
      const rec = responseRecord(p);
      run.response.push({
        beat: run.beat,
        scores: rec.lines.map((l) => l.score),
        rewinds: p.record.rewinds,
        mastery: rec.mastery,
      });
      if (CORRIDORS[p.corridor]?.boss) run.intercept = p.marek === 3 ? 0 : p.marek;
    }
    return -1;
  }
  for (const h of heroes(world)) {
    const item = h.item !== 0 ? world.items.find((i) => i.id === h.item) : undefined;
    run.carry[h.slot] =
      item && WEAPONS[item.def]?.id !== GREENHOUSE?.grenade.weapon
        ? { def: item.def, integrity: item.integrity, ammo: item.ammo }
        : null;
  }
  recordRoom(world);
  if (!beat.branch) return -1;
  const outcome = branchMet(world, beat) ? BranchOutcome.Completed : BranchOutcome.Failed;
  run.branches[run.beat] = outcome;
  return outcome;
}

/** A room beat's Ledger assets go into the stage record (once per visit). */
function recordRoom(world: World): void {
  const run = world.run!;
  const gh = world.greenhouse;
  if (!gh || !isRoomBeat(beatOf(world)!)) return;
  if (run.ledger.some((a) => a.beat === run.beat)) return;
  for (const a of gh.assets)
    run.ledger.push({
      beat: run.beat,
      name: a.name,
      kind: a.kind,
      condition: a.condition,
      state: a.state,
    });
}

/** Is a branch beat's goal met now (workers freed, record found, assets kept)? */
export function branchMet(world: World, beat: BeatDef): boolean {
  const run = world.run!;
  const b = beat.branch;
  if (!b) return false;
  if (b.workers && run.workers.some((w) => w.state === WorkerState.Bound)) return false;
  if (b.clue && run.clue !== 2) return false;
  const assets = world.greenhouse?.assets ?? [];
  return b.assets.every((name) => {
    const a = assets.find((x) => x.name === name);
    return !!a && a.state <= b.keep;
  });
}

function placeHero(world: World, h: Fighter, beat: BeatDef): void {
  h.x = fx(beat.heroX + h.slot * 120);
  h.z = fx(800 + h.slot * 100);
  h.y = 0;
  h.vx = 0;
  h.vz = 0;
  h.vy = 0;
  h.facing = 1;
  if (!h.ko) {
    h.state = MoveState.Idle;
    h.stateFrame = 0;
    h.stun = 0;
  }
  h.item = 0;
  h.wkit = -1;
  h.breakPending = false;
  h.grabId = 0;
  h.grabbedBy = 0;
  h.thrownBy = 0;
  h.cinematic = false;
  h.ctx = emptyContext();
  h.handoff = 0;
  world.run!.lastHealth[h.slot] = h.health;
}

function takeCheckpoint(world: World): void {
  const run = world.run!;
  const meter = [0, 0];
  for (const h of heroes(world)) meter[h.slot] = h.meter;
  run.checkpoint = {
    beat: run.beat,
    meter,
    stats: { ...run.stats },
    ...records(run),
  };
}

/** M20: copies of the stage records a checkpoint keeps. */
function records(
  r: Pick<RunCheckpoint, 'ledger' | 'response' | 'branches' | 'intercept' | 'carry'>,
): Pick<RunCheckpoint, 'ledger' | 'response' | 'branches' | 'intercept' | 'carry'> {
  return {
    ledger: r.ledger.map((a) => ({ ...a })),
    response: r.response.map((x) => ({ ...x, scores: [...x.scores] })),
    branches: [...r.branches],
    intercept: r.intercept,
    carry: r.carry.map((c): RunCarry | null => (c ? { ...c } : null)),
  };
}

/**
 * A continue: every hero comes back with `continuePercent` Health and the checkpoint's
 * meter, the counters return to the checkpoint (the clock keeps running) and the beat
 * starts again. Without a checkpoint yet, the run's start counts as one.
 */
function restoreCheckpoint(world: World): void {
  const run = world.run!;
  const def = STAGES[run.stage]!;
  const cp = run.checkpoint ?? {
    beat: 0,
    meter: [0, 0],
    stats: zeroStats(),
    ledger: [],
    response: [],
    branches: def.beats.map(() => BranchOutcome.Skipped),
    intercept: 0,
    carry: [null, null],
  };
  const frames = run.stats.frames;
  run.stats = { ...cp.stats, frames, downs: run.stats.downs, revives: run.stats.revives };
  Object.assign(run, records(cp));
  run.capture = null;
  rebuildHeroes(world, def.rules.continuePercent, cp.meter);
  enterBeat(world, cp.beat, false);
  event(world, RunEvent.ContinueUsed, run.continues);
}

/** No continue left: the stage starts again from beat 1 with fresh continues (D8). */
function restartStage(world: World): void {
  const run = world.run!;
  const fresh = newRun(run.stage, run.difficulty, 0);
  fresh.assist = run.assist;
  world.run = fresh;
  rebuildHeroes(world, 100, [0, 0]);
  enterBeat(world, 0, false);
  takeCheckpoint(world);
  event(world, RunEvent.StageRestart, 0);
}

function rebuildHeroes(world: World, percent: number, meter: readonly number[]): void {
  if (!makeHero) throw new Error('hero factory not installed');
  world.bodies = heroes(world).map((h) => {
    const f = makeHero!(world, h.slot);
    f.health = Math.max(1, Math.trunc((f.maxHealth * percent) / 100));
    f.meter = meter[h.slot] ?? 0;
    return f;
  });
  world.bodies.sort((a, b) => a.id - b.id);
}

/** Starts a run on a fresh world (createWorld option `stage`). */
export function setupStage(
  world: World,
  stage: number,
  difficulty: number,
  beat = 0,
  assist = false,
): void {
  world.run = newRun(stage, difficulty, beat);
  world.run.assist = assist;
  world.dummy.refill = false;
  enterBeat(world, beat, false);
  // The start (or the practice beat) is the implicit first checkpoint, never announced.
  takeCheckpoint(world);
  if (STAGES[stage]!.beats[beat]!.checkpoint) event(world, RunEvent.Checkpoint, beat);
}

// --- per frame --------------------------------------------------------------------------

/**
 * Stage flow before anyone moves: camera locks starting and clearing, the exit and the
 * beat transitions, and the defeat banner followed by a continue or the restart.
 */
export function stepRun(world: World): void {
  const run = world.run;
  if (!run) return;
  const def = STAGES[run.stage]!;
  const beat = def.beats[run.beat]!;
  const enc = world.encounter;
  if (run.phase !== RunPhase.Complete) run.stats.frames += 1;
  switch (run.phase) {
    case RunPhase.Defeat:
      if (world.frame - run.phaseFrame < def.rules.defeatHold) return;
      // HOMECOMING: the latest checkpoint returns without spending a continue (no
      // checkpoint yet: the stage starts again).
      if (sessionCheat(world, Cheat.HOMECOMING)) {
        if (run.checkpoint) restoreCheckpoint(world);
        else restartStage(world);
      } else if (run.continues > 0) {
        run.continues -= 1;
        run.continuesUsed += 1;
        restoreCheckpoint(world);
      } else restartStage(world);
      return;
    case RunPhase.Transition: {
      const t = world.frame - run.phaseFrame;
      const half = Math.trunc(def.rules.transition / 2);
      if (t === half) {
        const next = nextBeat(world);
        const outcome = leaveBeat(world);
        enterBeat(world, next);
        // enterBeat starts a Walk (or a room's Locked) phase; the fade's second half runs.
        world.run!.resume = world.run!.phase;
        run.phase = RunPhase.Transition;
        run.phaseFrame = world.frame - half;
        // A branch's outcome is the notice, unless the new beat announces its checkpoint.
        if (outcome >= 0 && run.event.kind !== RunEvent.Checkpoint)
          event(world, RunEvent.BranchEnd, outcome);
      } else if (t >= def.rules.transition) {
        run.phase = run.resume;
        run.phaseFrame = world.frame;
      }
      return;
    }
    case RunPhase.Locked:
      if (enc && enc.result === Result.Cleared) clearLock(world, beat);
      return;
    case RunPhase.Walk: {
      if (isCorridorBeat(beat)) {
        // M20: the pursuit's finish shows a moment, then the fade to the next beat.
        const p = world.pursuit;
        if (p && p.phase === PursuitPhase.Complete && world.frame - p.phaseFrame >= PURSUIT_HOLD) {
          run.phase = RunPhase.Transition;
          run.phaseFrame = world.frame;
        }
        return;
      }
      const lock = isRoomBeat(beat) ? undefined : beat.locks[run.locksDone];
      const cx = centreX(world);
      if (lock && cx >= fx(lock.at)) {
        startLock(world, run.locksDone);
        return;
      }
      if (!lock && exitOpen(world) && cx >= fx(beat.width - def.rules.exitMargin)) {
        run.phase = RunPhase.Transition;
        run.phaseFrame = world.frame;
      }
      return;
    }
    default:
      return;
  }
}

/** The beat's exit is open: every lock cleared, every worker free, not the last beat. */
export function exitOpen(world: World): boolean {
  const run = world.run;
  const beat = beatOf(world);
  if (!run || !beat) return false;
  if (beat.next.length === 0) return false;
  if (run.locksDone < lockCount(beat)) return false;
  return run.workers.every((w) => w.state !== WorkerState.Bound);
}

function startLock(world: World, n: number): void {
  const run = world.run!;
  const lock = beatOf(world)!.locks[n]!;
  run.phase = RunPhase.Locked;
  run.phaseFrame = world.frame;
  run.counted = [];
  world.bounds = { ...world.bounds, minX: fx(lock.view), maxX: fx(lock.view) + VIEW_WIDTH };
  world.encounter = newEncounter(lock.arena, run.difficulty, world.frame);
  setupDevices(world);
  for (const h of heroes(world))
    h.x = Math.max(world.bounds.minX, Math.min(world.bounds.maxX, h.x));
  updateView(world);
  event(world, RunEvent.LockStart, n);
}

function clearLock(world: World, beat: BeatDef): void {
  const run = world.run!;
  const room = isRoomBeat(beat);
  const lock = room ? undefined : beat.locks[run.locksDone]!;
  run.locksDone += 1;
  run.phase = RunPhase.Walk;
  run.phaseFrame = world.frame;
  run.floorX = lock ? fx(lock.view) : 0;
  world.bounds = { ...world.bounds, minX: run.floorX, maxX: fx(beat.width) };
  // M20: Marek's capture record, as the boss room leaves it.
  const boss = world.encounter?.boss;
  if (room && boss && boss.capture > 0)
    run.capture = {
      route: boss.capture,
      gunLost: boss.gunLost,
      gunAmmo: boss.gunAmmo,
      scorch: boss.scorch,
      scorchStops: boss.scorchStops,
      intercept: boss.intercept,
    };
  // An encounter boundary: a downed hero nobody revived stands up again (D8).
  const def = STAGES[run.stage]!;
  for (const h of heroes(world))
    if (isDowned(h)) {
      raise(h, def.rules.rejoinPercent);
      run.downedAt[h.slot] = -1;
      run.lastHealth[h.slot] = h.health;
      event(world, RunEvent.Rejoined, h.slot);
    }
  if (beat.evidence && run.locksDone >= lockCount(beat)) {
    run.evidence = 1;
    event(world, room ? RunEvent.EvidenceReady : RunEvent.RiverRestored, 0);
  } else if (exitOpen(world)) event(world, RunEvent.ExitOpen, 0);
  else event(world, RunEvent.LockClear, run.locksDone);
}

/**
 * Stage bookkeeping after everyone moved: the co-op tether, food, workers running home,
 * downed heroes and the defeat, enemy outcomes and damage taken.
 */
export function stepRunLate(world: World): void {
  const run = world.run;
  if (!run || run.phase === RunPhase.Transition) return;
  const def = STAGES[run.stage]!;
  const all = heroes(world);
  const up = all.filter((h) => !h.ko);
  // Co-op tether: both heroes stay inside the visibility zone.
  const enc = world.encounter;
  if (enc && up.length >= 2) {
    updateView(world);
    for (const h of up) h.x = Math.max(enc.viewMin + TETHER, Math.min(enc.viewMax - TETHER, h.x));
  }
  for (const h of all) {
    const last = run.lastHealth[h.slot] ?? h.health;
    if (h.health < last) run.stats.damageTaken += last - h.health;
    run.lastHealth[h.slot] = h.health;
  }
  // Food: walking over it while hurt eats it.
  const r = def.rules;
  for (const p of run.pickups) {
    if (p.taken) continue;
    const h = up.find(
      (x) =>
        x.health < x.maxHealth &&
        Math.abs(x.x - p.x) <= fx(r.pickupReachX) &&
        Math.abs(x.z - p.z) <= fx(r.pickupReachZ),
    );
    if (!h) continue;
    p.taken = true;
    // Recovery direction per difficulty (spec D.2): Hard and above restore less.
    const heal = Math.trunc((p.heal * (DIFFICULTIES[run.difficulty]?.recovery ?? 100)) / 100);
    h.health = Math.min(h.maxHealth, h.health + heal);
    run.lastHealth[h.slot] = h.health;
    run.stats.food += 1;
    event(world, RunEvent.Food, h.slot);
  }
  stepWorkers(world);
  countOutcomes(world);
  if (run.phase === RunPhase.Defeat || run.phase === RunPhase.Complete) return;
  for (const h of all)
    if (isDowned(h) && run.downedAt[h.slot] === -1) {
      run.downedAt[h.slot] = world.frame;
      run.stats.downs += 1;
      if (all.length >= 2) event(world, RunEvent.Downed, h.slot);
    }
  if (all.length > 0 && all.every(isDowned)) {
    run.phase = RunPhase.Defeat;
    run.phaseFrame = world.frame;
  }
}

function stepWorkers(world: World): void {
  const run = world.run!;
  const enc = world.encounter;
  for (const w of run.workers) {
    if (w.state === WorkerState.Freed && world.frame - w.since >= WORKER_CHEER) {
      w.state = WorkerState.Leaving;
      w.since = world.frame;
    } else if (w.state === WorkerState.Leaving) {
      w.x -= WORKER_RUN;
      const gone = enc ? enc.viewMin - fx(200) : 0;
      if (w.x < gone || w.x < 0) {
        w.state = WorkerState.Safe;
        w.since = world.frame;
      }
    }
  }
}

function countOutcomes(world: World): void {
  const run = world.run!;
  // M11: the best combo the heroes landed (hits and damage of an enemy's open context).
  for (const e of world.bodies) {
    if (e.team !== 'enemy' || !e.ctx.open) continue;
    if (e.ctx.hits > run.stats.bestHits) run.stats.bestHits = e.ctx.hits;
    if (e.ctx.damage > run.stats.bestDamage) run.stats.bestDamage = e.ctx.damage;
  }
  for (const e of world.bodies) {
    if (e.team !== 'enemy' || !profileOf(e) || run.counted.includes(e.id)) continue;
    if (e.state === MoveState.Flee) run.stats.fled += 1;
    else if (e.state === MoveState.Surrender) run.stats.surrendered += 1;
    else if (e.state === MoveState.Defeated) run.stats.defeated += 1;
    else continue;
    run.counted.push(e.id);
  }
}

// --- hold to interact ---------------------------------------------------------------------

interface Target {
  kind: number;
  target: number;
  need: number;
  x: number;
  z: number;
}

/** Every interaction the hero could start now, best first (revive, worker, evidence, clue). */
function targets(world: World, f: Fighter): Target[] {
  const run = world.run;
  const beat = beatOf(world);
  if (!run || !beat || run.phase === RunPhase.Transition || run.phase === RunPhase.Defeat)
    return [];
  const r = STAGES[run.stage]!.rules;
  const out: Target[] = [];
  for (const h of heroes(world))
    if (h !== f && isDowned(h))
      out.push({ kind: ChannelKind.Revive, target: h.slot, need: r.reviveFrames, x: h.x, z: h.z });
  run.workers.forEach((w, i) => {
    if (w.state === WorkerState.Bound)
      out.push({ kind: ChannelKind.Worker, target: i, need: r.workerFrames, x: w.x, z: w.z });
  });
  if (run.evidence === 1 && beat.evidence)
    out.push({
      kind: ChannelKind.Evidence,
      target: 0,
      need: r.evidenceFrames,
      x: fx(beat.evidence.x),
      z: fx(beat.evidence.z),
    });
  if (run.clue === 1 && beat.clue)
    out.push({
      kind: ChannelKind.Clue,
      target: 0,
      need: r.clueFrames,
      x: fx(beat.clue.x),
      z: fx(beat.clue.z),
    });
  return out.filter(
    (t) => Math.abs(t.x - f.x) <= fx(r.reachX) && Math.abs(t.z - f.z) <= fx(r.reachZ),
  );
}

/** The interaction a hero next to something would start (for the HUD prompt), or None. */
export function interactionFor(world: World, f: Fighter): number {
  if (f.ko) return ChannelKind.None;
  return targets(world, f)[0]?.kind ?? ChannelKind.None;
}

/**
 * Neutral Interact next to a downed partner, a bound worker, the evidence or a clue: the
 * hero starts holding (MoveState.Channel). Returns false when there is nothing to start.
 */
export function startChannel(world: World, f: Fighter): boolean {
  const t = targets(world, f)[0];
  if (!t) return false;
  world.run!.channel[f.slot] = { kind: t.kind, target: t.target, progress: 0, need: t.need };
  f.state = MoveState.Channel;
  f.stateFrame = 0;
  f.vx = 0;
  f.vz = 0;
  f.action = -1;
  f.attackKind = 0;
  if (t.x !== f.x) f.facing = t.x > f.x ? 1 : -1;
  return true;
}

/**
 * One frame of holding: Interact must stay held and the target must stay valid and in
 * reach; a hit ends the Channel by changing the hero's state (interruptible, D8).
 */
export function stepChannel(world: World, f: Fighter, input: FrameInput): void {
  const run = world.run;
  const c = run?.channel[f.slot];
  f.stateFrame += 1;
  const still =
    c &&
    (input.held & ActionBit.Interact) !== 0 &&
    targets(world, f).some((t) => t.kind === c.kind && t.target === c.target);
  if (!run || !c || !still) {
    if (c) c.kind = ChannelKind.None;
    f.state = MoveState.Idle;
    f.stateFrame = 0;
    return;
  }
  c.progress += 1;
  if (c.progress < c.need) return;
  complete(world, f, c);
  c.kind = ChannelKind.None;
  f.state = MoveState.Idle;
  f.stateFrame = 0;
}

function complete(world: World, f: Fighter, c: ChannelState): void {
  const run = world.run!;
  const def = STAGES[run.stage]!;
  const beat = def.beats[run.beat]!;
  switch (c.kind) {
    case ChannelKind.Revive: {
      const ally = heroes(world).find((h) => h.slot === c.target);
      if (!ally) return;
      raise(ally, def.rules.revivePercent);
      run.downedAt[ally.slot] = -1;
      run.lastHealth[ally.slot] = ally.health;
      run.stats.revives += 1;
      event(world, RunEvent.Revived, ally.slot);
      return;
    }
    case ChannelKind.Worker: {
      const w = run.workers[c.target];
      if (!w) return;
      w.state = WorkerState.Freed;
      w.since = world.frame;
      run.stats.workersFreed += 1;
      event(world, RunEvent.WorkerFreed, c.target);
      if (!run.cacheOpen && beat.cache && run.workers.every((x) => x.state !== WorkerState.Bound)) {
        run.cacheOpen = true;
        run.pickups.push(...pantry(world, beat.cache.pickups));
        event(world, RunEvent.CacheOpen, 0);
      }
      return;
    }
    case ChannelKind.Clue:
      run.clue = 2;
      run.stats.clues += 1;
      event(world, RunEvent.Clue, 0);
      return;
    case ChannelKind.Evidence:
      run.evidence = 2;
      run.stats.evidence += 1;
      recordRoom(world);
      run.phase = RunPhase.Complete;
      run.phaseFrame = world.frame;
      event(world, RunEvent.Complete, 0);
      return;
    default:
      return;
  }
}

/**
 * An authored food group as pickups. FULLPANTRY adds one deterministic recovery item per
 * group: a copy of its first food, 80 px to the right.
 */
function pantry(
  world: World,
  list: readonly { x: number; z: number; heal: number; look: number }[],
) {
  const out = list.map((p) => ({ ...p, x: fx(p.x), z: fx(p.z), taken: false }));
  const first = list[0];
  if (first && sessionCheat(world, Cheat.FULLPANTRY))
    out.push({ ...first, x: fx(first.x + 80), z: fx(first.z), taken: false });
  return out;
}

// --- results ----------------------------------------------------------------------------

export interface Grade {
  /** Category id (the interface names it): rescue, evidence, continues, time. */
  id: string;
  /** Value shown next to the grade, e.g. "2/2" or "9:41". */
  value: string;
  /** S, A, B or C (the category's share of its weight on the rank thresholds). */
  grade: string;
  /** Points earned and the category's weight (of the 100-point grade). */
  points: number;
  weight: number;
}

export interface StageResults {
  stage: string;
  difficulty: number;
  /** Beat the run started at (0 = a full run). */
  startBeat: number;
  grades: Grade[];
  /** The rank (S, A, B, C) from the 100-point total and the caps. */
  overall: string;
  /** The 100-point total. */
  points: number;
  /** A cap that lowered the rank (category id), or null. */
  capped: string | null;
  /** The run score (spec §15.2). */
  score: number;
  stats: RunStats;
  continuesUsed: number;
  workersTotal: number;
  cluesTotal: number;
  /** Every hero used the default Specials and Ultimates (Standard Loadout). */
  standard: boolean;
  /** M11: the run was marked Cheat-Assisted; codes ever active and the first beat. */
  cheatAssisted: boolean;
  cheatCodes: string[];
  cheatFirstBeat: number;
  /** M20: the stage-wide Preservation result (null: no room beat was left yet). */
  preservation: PreservationResult | null;
  /** M20: the Civil-Protection Response over every corridor ridden (null: none ridden). */
  response: ResponseResult | null;
  /** M20: every branch beat of the stage and its outcome (BranchOutcome). */
  branches: { beat: number; id: string; artifact: string; outcome: number }[];
  /** M20: Marek's capture record (null: no capture in this run). */
  capture: RunCapture | null;
  /** M20: the epilogue cards this run shows, in order (keys under epilogue.<stage>.). */
  epilogue: string[];
}

export interface PreservationResult {
  /** Weighted condition of every recorded asset (Lost counts 0), percent. */
  percent: number;
  /** Grade band id (flourishing, secure, strained, recovered). */
  grade: string;
  assets: RunAsset[];
  /** Per Ledger category: its own percent and band (sound, damaged, recovering). */
  categories: { id: string; percent: number; band: string }[];
}

export interface ResponseResult {
  percent: number;
  grade: string;
  rewinds: number;
  mastery: boolean;
}

const LETTERS = ['C', 'B', 'A', 'S'];

/** Clock text m:ss for a frame count at 60 Hz. */
export function clock(frames: number): string {
  const s = Math.trunc(frames / 60);
  return `${Math.trunc(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The letter for a percentage on a grade's rank thresholds (S, A, B, else C). */
export function rankFor(percent: number, ranks: readonly number[]): string {
  if (percent >= ranks[0]!) return 'S';
  if (percent >= ranks[1]!) return 'A';
  if (percent >= ranks[2]!) return 'B';
  return 'C';
}

/** Share (0–100 percent) of a category earned by a run. */
function measure(
  c: GradeCategoryDef,
  run: StageRun,
  def: StageDef,
): { pct: number; value: string } {
  const s = run.stats;
  const ratio = (n: number, of: number) =>
    of === 0 ? 100 : Math.trunc((Math.min(n, of) * 100) / of);
  switch (c.measure) {
    case 'workers':
      return {
        pct: ratio(s.workersFreed, run.workersTotal),
        value: `${s.workersFreed}/${run.workersTotal}`,
      };
    case 'clues': {
      const found = s.clues + s.evidence;
      return { pct: ratio(found, run.cluesTotal), value: `${found}/${run.cluesTotal}` };
    }
    case 'continues':
      return {
        pct: Math.trunc((Math.max(0, c.allowance - run.continuesUsed) * 100) / c.allowance),
        value: `${run.continuesUsed}`,
      };
    case 'time': {
      const secs = Math.trunc(s.frames / 60);
      const par = def.timePar;
      const pct = secs <= par[0]! ? 100 : secs <= par[1]! ? 75 : secs <= par[2]! ? 50 : 25;
      return { pct, value: clock(s.frames) };
    }
    case 'preservation': {
      const pct = stagePreservation(run)?.percent ?? 100;
      return { pct, value: `${pct}%` };
    }
    case 'response': {
      const pct = stageResponse(run)?.percent ?? 100;
      return { pct, value: `${pct}%` };
    }
  }
}

/** Weighted condition percent of some recorded assets (Lost counts 0; none: 100). */
function conditionPercent(assets: readonly RunAsset[]): number {
  let total = 0;
  let got = 0;
  for (const a of assets) {
    const k = GREENHOUSE!.ledger[a.kind]!;
    total += k.weight * k.condition;
    if (a.state !== AssetState.Lost) got += k.weight * a.condition;
  }
  return total > 0 ? Math.trunc((got * 100) / total) : 100;
}

/** Ledger category codes (greenhouse.yaml) by name, in code order. */
export const LEDGER_CATEGORIES = ['workers', 'aquatic', 'crops', 'systems', 'supplies'] as const;

/** Category band of an epilogue insert: sound (90 %+), damaged (60 %+), recovering. */
function bandOf(percent: number): string {
  return percent >= 90 ? 'sound' : percent >= 60 ? 'damaged' : 'recovering';
}

/** M20: the stage's Preservation over every room asset recorded so far (null: none). */
export function stagePreservation(run: StageRun): PreservationResult | null {
  if (run.ledger.length === 0 || !GREENHOUSE) return null;
  const percent = conditionPercent(run.ledger);
  const band = GREENHOUSE.grades.find((g) => percent >= g.min) ?? GREENHOUSE.grades.at(-1)!;
  const categories = LEDGER_CATEGORIES.flatMap((id, code) => {
    const list = run.ledger.filter((a) => GREENHOUSE!.ledger[a.kind]!.category === code);
    if (list.length === 0) return [];
    const pct = conditionPercent(list);
    return [{ id, percent: pct, band: bandOf(pct) }];
  });
  return { percent, grade: band.id, assets: run.ledger.map((a) => ({ ...a })), categories };
}

/** M20: the Civil-Protection Response over every corridor ridden (null: none). */
export function stageResponse(run: StageRun): ResponseResult | null {
  const scores = run.response.flatMap((r) => r.scores);
  if (scores.length === 0) return null;
  const percent = Math.trunc(scores.reduce((n, x) => n + x, 0) / scores.length);
  return {
    percent,
    grade: rankFor(percent, [90, 75, 55]),
    rewinds: run.response.reduce((n, r) => n + r.rewinds, 0),
    mastery: run.response.every((r) => r.mastery),
  };
}

/** M20: the epilogue cards of a finished run (keys under `epilogue.<stage>.`). */
export function epilogueCards(run: StageRun, def: StageDef): string[] {
  const pres = stagePreservation(run);
  return def.epilogue.flatMap((card): string[] => {
    switch (card.by) {
      case 'capture':
        return run.capture ? [`${card.id}.${run.capture.route === 1 ? 'resolve' : 'forced'}`] : [];
      case 'categories':
        return (pres?.categories ?? []).map((c) => `${card.id}.${c.id}.${c.band}`);
      case 'branches':
        return def.beats.flatMap((b, i) =>
          b.branch && run.branches[i] === BranchOutcome.Completed
            ? [`${card.id}.${b.branch.id}`]
            : [],
        );
      case 'preservation':
        return pres ? [`${card.id}.${pres.grade}`] : [];
      default:
        return [card.id];
    }
  });
}

/** The run score: outcomes, rescues, discoveries, best combo and time, × difficulty. */
export function runScore(run: StageRun, def: StageDef): number {
  const t = def.score;
  const s = run.stats;
  const secs = Math.trunc(s.frames / 60);
  const raw =
    s.surrendered * t.surrendered +
    s.defeated * t.defeated +
    s.fled * t.fled +
    s.workersFreed * t.worker +
    s.clues * t.clue +
    s.evidence * t.evidence +
    s.bestHits * t.comboHit +
    Math.max(0, def.timePar[2]! - secs) * t.timeBonus -
    run.continuesUsed * t.continuePenalty +
    // M20: completed branches, Marek's capture route and the Preservation percent.
    run.branches.filter((b) => b === BranchOutcome.Completed).length * t.branch +
    (run.capture ? (run.capture.route === 1 ? t.resolve : t.forced) : 0) +
    (stagePreservation(run)?.percent ?? 0) * t.preservation;
  return Math.max(0, Math.trunc((raw * (t.difficulty[run.difficulty] ?? 100)) / 100));
}

/**
 * The results screen: the stage's data-defined categories (Stage 2 brings other ones),
 * each with its points, the 100-point total, the rank after caps and the score.
 */
export function stageResults(world: World): StageResults | null {
  const run = world.run;
  if (!run) return null;
  const def = STAGES[run.stage]!;
  const g = def.grade;
  const grades: Grade[] = g.categories.map((c) => {
    const m = measure(c, run, def);
    return {
      id: c.id,
      value: m.value,
      grade: rankFor(m.pct, g.ranks),
      points: Math.trunc((c.weight * m.pct) / 100),
      weight: c.weight,
    };
  });
  const points = grades.reduce((n, x) => n + x.points, 0);
  let overall = rankFor(points, g.ranks);
  let capped: string | null = null;
  for (const cap of g.caps) {
    const x = grades.find((e) => e.id === cap.category);
    if (!x || x.points * 100 >= cap.below * x.weight) continue;
    if (LETTERS.indexOf(cap.rank) < LETTERS.indexOf(overall)) {
      overall = cap.rank;
      capped = cap.category;
    }
  }
  const standard = world.playerHero.every((h, slot) => {
    const lo = world.playerLoadout[slot];
    const base = defaultLoadout(kitOf({ team: 'hero', hero: h }));
    return !lo || lo.every((a, i) => a === base[i]);
  });
  const c = world.cheats;
  return {
    stage: def.id,
    difficulty: run.difficulty,
    startBeat: run.startBeat,
    grades,
    overall,
    points,
    capped,
    score: runScore(run, def),
    stats: { ...run.stats },
    continuesUsed: run.continuesUsed,
    workersTotal: run.workersTotal,
    cluesTotal: run.cluesTotal,
    standard,
    cheatAssisted: c.marked,
    cheatCodes: codesOf(c.used),
    cheatFirstBeat: c.firstBeat,
    preservation: stagePreservation(run),
    response: stageResponse(run),
    branches: def.beats.flatMap((b, i) =>
      b.branch
        ? [{ beat: i, id: b.branch.id, artifact: b.branch.artifact, outcome: run.branches[i]! }]
        : [],
    ),
    capture: run.capture ? { ...run.capture } : null,
    epilogue: epilogueCards(run, def),
  };
}

/** Beat and stage names for the Lab and menus. */
export function stageNames(): { id: string; name: string; beats: string[] }[] {
  return STAGES.map((s) => ({ id: s.id, name: s.name, beats: s.beats.map((b) => b.name) }));
}
