import { fx } from '../math/fixed';
import { type Encounter, type Fighter, HazardPhase, MoveState, type World } from '../world/types';
import { LAB_LAYOUT } from '../world/stage';
import { ARENAS, DIFFICULTIES, enemyKitIndex, livingHeroes, profileOf } from './data';
import { VIEW_WIDTH } from './director';
import { newBossState, spawnEnemy, startPhase } from './boss';
import { sweepBodies } from './ai';
import { nonCombatant } from '../combat/damage';
import { ENEMIES } from '../combat/roster';

/** Frames before the first wave arrives (players can still join in that time). */
export const FIRST_WAVE_AT = 30;
/** Result codes. */
export const Result = { Running: 0, Cleared: 1, Defeated: 2, Waiting: 3 } as const;
/** Encounter enemy ids start here (Lab dummies use 101+, items 201+, scenery 301+). */
export const ENEMY_ID_BASE = 401;
/** Scenery id of the boss arena's surge hazard and devices. */
const DEVICE_ID_BASE = 351;

export function newEncounter(arena: number, difficulty: number, start = 0): Encounter {
  return {
    arena,
    start,
    difficulty,
    wave: -1,
    waveIds: [],
    nextId: ENEMY_ID_BASE,
    result: Result.Running,
    viewMin: 0,
    viewMax: VIEW_WIDTH,
    groupReadyAt: 0,
    boss: null,
    devices: [],
    log: { frame: 0, enemy: 0, code: -1, verdict: 0 },
    peakCommitted: 0,
    offscreenWarned: 0,
    offscreenUnwarned: 0,
  };
}

/** Arena setup on a fresh world: bounds, devices and the triggered surge hazard. */
export function setupArena(world: World): void {
  const enc = world.encounter!;
  const arena = ARENAS[enc.arena]!;
  world.bounds = { ...world.bounds, minX: 0, maxX: fx(arena.width) };
  world.dummy.refill = false;
  setupDevices(world);
  const p1 = world.bodies.find((b) => b.team === 'hero' && b.slot === 0);
  if (p1) p1.x = fx(arena.heroX);
  updateView(world);
}

/** The encounter arena's devices and its triggered surge hazard (arenas and stage locks). */
export function setupDevices(world: World): void {
  const enc = world.encounter!;
  const arena = ARENAS[enc.arena]!;
  const s = arena.surge;
  let hazard = -1;
  if (s) {
    hazard = world.environment.hazards.length;
    world.environment.hazards.push({
      id: DEVICE_ID_BASE,
      x: fx(Math.trunc(arena.width / 2)),
      z: fx(Math.trunc((s.z0 + s.z1) / 2)),
      hw: fx(Math.trunc(arena.width / 2)),
      hd: fx(Math.trunc((s.z1 - s.z0) / 2)),
      h: fx(200),
      phase: HazardPhase.Rest,
      phaseFrame: 0,
      // rest 0: a triggered hazard (it waits in Rest until a device releases it).
      rest: 0,
      warn: s.warn,
      active: s.active,
      damage: s.damage,
    });
  }
  arena.devices.forEach((d, i) => {
    enc.devices.push({
      id: DEVICE_ID_BASE + 1 + i,
      kind: d.kind,
      x: fx(d.x),
      z: fx(d.z),
      count: d.count,
      progress: 0,
      active: false,
      hazard,
    });
  });
}

/** The stage layout an arena uses for weapons and scenery (the mill beat). */
export function arenaLayout(arena: number) {
  return ARENAS[arena]?.layout === 'mill' ? LAB_LAYOUT : null;
}

/**
 * The combat visibility zone: a 1920 px window centred on the living heroes, clamped to
 * the arena. Defined in world coordinates by the simulation, so every client draws the
 * same zone whatever its screen or crop.
 */
export function updateView(world: World): void {
  const enc = world.encounter;
  if (!enc) return;
  const heroes = livingHeroes(world);
  if (heroes.length === 0) return;
  const cx = Math.trunc(heroes.reduce((s, h) => s + h.x, 0) / heroes.length);
  const span = world.bounds.maxX - world.bounds.minX;
  const width = Math.min(VIEW_WIDTH, span);
  let min = cx - Math.trunc(width / 2);
  min = Math.max(world.bounds.minX, Math.min(world.bounds.maxX - width, min));
  enc.viewMin = min;
  enc.viewMax = min + width;
}

/** Enemies of the current wave still in the fight. */
export function fighting(world: World): Fighter[] {
  return world.bodies.filter(
    (b) => b.team === 'enemy' && profileOf(b) && !b.ko && !nonCombatant(b),
  );
}

function kitFor(world: World, kit: string, used: Map<string, number>): number {
  const enc = world.encounter!;
  const arena = ARENAS[enc.arena]!;
  for (const s of arena.substitutions) {
    if (s.from !== kit || enc.difficulty < s.minDifficulty) continue;
    const n = used.get(s.from) ?? 0;
    if (n < s.count) {
      used.set(s.from, n + 1);
      return enemyKitIndex(s.to);
    }
  }
  return enemyKitIndex(kit);
}

function spawnWave(world: World, n: number): void {
  const enc = world.encounter!;
  const arena = ARENAS[enc.arena]!;
  const wave = arena.waves[n];
  enc.wave = n;
  enc.waveIds = [];
  if (!wave) return;
  const coop = livingHeroes(world).length >= 2;
  const used = new Map<string, number>();
  for (const e of wave.enemies) {
    if (e.minDifficulty > enc.difficulty || (e.coop && !coop)) continue;
    const kit = kitFor(world, e.kit, used);
    const f = spawnEnemy(world, kit, fx(e.x), fx(e.z));
    if (profileOf(f)?.boss) {
      enc.boss = newBossState(f);
      startPhase(world, f, 0);
    }
  }
}

/**
 * One frame of the encounter, before any fighter moves: the visibility zone, defeated and
 * fled enemies leaving, waves, and the result. Results are deterministic.
 */
export function stepEncounter(world: World): void {
  const enc = world.encounter;
  if (!enc) return;
  updateView(world);
  for (const id of sweepBodies(world)) {
    const i = enc.waveIds.indexOf(id);
    if (i >= 0) enc.waveIds.splice(i, 1);
  }
  if (enc.result !== Result.Running) return;
  const heroes = world.bodies.filter((b) => b.team === 'hero');
  if (heroes.length > 0 && heroes.every((h) => h.ko && h.state === MoveState.Defeated)) {
    enc.result = Result.Defeated;
    return;
  }
  const arena = ARENAS[enc.arena]!;
  if (enc.wave < 0) {
    if (world.frame >= enc.start + FIRST_WAVE_AT) spawnWave(world, 0);
    return;
  }
  const left = fighting(world).length;
  const boss = enc.boss ? world.bodies.find((b) => b.id === enc.boss!.id) : undefined;
  if (boss && !boss.ko) return;
  const wave = arena.waves[enc.wave];
  if (enc.wave + 1 < arena.waves.length) {
    if (left <= (wave?.next ?? 0)) spawnWave(world, enc.wave + 1);
    return;
  }
  if (left === 0) enc.result = Result.Cleared;
}

/** Names for the Lab and menus. */
export function arenaNames(): { id: string; name: string; minDifficulty: number }[] {
  return ARENAS.filter((a) => !a.stage).map((a) => ({
    id: a.id,
    name: a.name,
    minDifficulty: a.minDifficulty,
  }));
}

export function difficultyNames(): { id: string; name: string }[] {
  return DIFFICULTIES.map((d) => ({ id: d.id, name: d.name }));
}

export function kitName(kit: number): string {
  return ENEMIES[kit]?.name ?? '?';
}
