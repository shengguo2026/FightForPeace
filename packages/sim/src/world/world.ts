import { fx } from '../math/fixed';
import { createRngState } from '../math/rng';
import { ByteWriter } from '../state/encode';
import { xxh32 } from '../state/hash';
import { collide, type PositionLog } from '../collision/collide';
import { emptyContext } from '../combat/context';
import { resolveHits } from '../combat/hits';
import { closeContextIfActionable, stepReaction } from '../combat/reactions';
import { HEROES, TRAINER_KIT, heroIndex } from '../combat/roster';
import { defaultTrainer, stepTrainer } from '../combat/trainer';
import { NO_TAP, stepHero } from '../movement/controller';
import { ON_FOOT } from '../movement/profile';
import {
  type FacingMode,
  type Fighter,
  type FrameInput,
  MoveState,
  type Team,
  type World,
  type ComboContext,
  type TrainerSettings,
} from './types';

export const DUMMY_HEALTH = 1000;
export const HERO_HEALTH = 1000;

/** Version of the byte layout written by encodeWorld. Bump on any layout change. */
export const STATE_FORMAT = 7;

/** Walking speeds (fixed point per frame), kept as exports for existing callers. */
export const WALK_SPEED_X = ON_FOOT.walkX;
export const WALK_SPEED_Z = ON_FOOT.walkZ;

export const MAX_PLAYERS = 2;
export const DUMMY_ID_BASE = 101;

const HERO_SPAWN: readonly { x: number; z: number }[] = [
  { x: fx(400), z: fx(800) },
  { x: fx(520), z: fx(900) },
];
const DUMMY_SPAWN: readonly { x: number; z: number }[] = [
  { x: fx(1100), z: fx(760) },
  { x: fx(1300), z: fx(890) },
  { x: fx(1500), z: fx(700) },
  { x: fx(1600), z: fx(950) },
];

export const IDLE_INPUT: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

export interface WorldOptions {
  /** Training dummies placed on the stage (0–4). */
  dummies?: number;
  /** Facing mode per player slot; Manual is the default. */
  facing?: readonly FacingMode[];
  dummiesChase?: boolean;
  /** Hero id per player slot; default Mountain Guardian (P1) and River Scout (P2). */
  heroes?: readonly string[];
  /** Lab: every hit counts as a counter-hit. */
  counterHit?: boolean;
  /** Lab: dummies refill their health when a combo ends (default on). */
  refill?: boolean;
  infiniteMeter?: boolean;
  /** Lab: heroes' Defense meter stays full. */
  infiniteDefense?: boolean;
  /** Lab: the training enemy's script (default: dummies never attack). */
  trainer?: Partial<TrainerSettings>;
}

const DEFAULT_HEROES = ['mountain', 'river'];

export function createFighter(
  id: number,
  team: Team,
  slot: number,
  x: number,
  z: number,
  facingMode: FacingMode = 'manual',
  hero = -1,
): Fighter {
  return {
    id,
    team,
    slot,
    x,
    z,
    y: 0,
    facing: team === 'hero' ? 1 : -1,
    vx: 0,
    vz: 0,
    vy: 0,
    state: MoveState.Idle,
    stateFrame: 0,
    dirX: 0,
    dirZ: 0,
    facingMode,
    lastTap: [NO_TAP, NO_TAP, NO_TAP, NO_TAP],
    bufAction: 0,
    bufFrame: 0,
    attackKind: 0,
    attackFromDash: false,
    lastGuardFrame: NO_TAP,
    targetId: 0,
    pinFrames: 0,
    passEnemies: false,
    hero,
    action: -1,
    lastCardinal: 0,
    turnFrame: NO_TAP,
    turnFrom: 0,
    contactAt: -1,
    contactIds: [],
    contactScales: [],
    hitSeg: -1,
    hitIds: [],
    chainUsed: 0,
    airUsed: false,
    bridged: false,
    ghost: false,
    meter: 0,
    reqLink: -1,
    reqFrame: 0,
    verdictTo: -1,
    verdictReject: 0,
    verdictFrame: 0,
    stun: 0,
    airRecover: false,
    health: team === 'hero' ? HERO_HEALTH : DUMMY_HEALTH,
    maxHealth: team === 'hero' ? HERO_HEALTH : DUMMY_HEALTH,
    ctx: emptyContext(),
    protectedRecovery: false,
    bounce: 0,
    heavyFall: false,
    groundWindow: 0,
    defense: 100,
    defIdle: 0,
    guardX: team === 'hero' ? 1 : -1,
    guardZ: 0,
    guardNeutral: true,
    pivotX: 0,
    pivotZ: 0,
    pivotAt: NO_TAP,
    exactFrame: NO_TAP,
    precisionUntil: NO_TAP,
    counterFrame: NO_TAP,
    counterX: 0,
    counterZ: 0,
    lastDirFrame: NO_TAP,
    lastUltFrame: NO_TAP,
    rewardIds: [],
    defEvent: 0,
    defOffset: 0,
    defFrame: 0,
    defAction: -1,
    aiTimer: 0,
    aiStep: 0,
  };
}

/**
 * Creates a world with Player 1's hero. Player 2's hero appears on the first frame that
 * has an input for slot 1, so joining is part of the replayable input stream.
 */
export function createWorld(seed: number, options: WorldOptions = {}): World {
  const facing = options.facing ?? [];
  const p1 = HERO_SPAWN[0]!;
  const heroes = [0, 1].map((i) => heroIndex(options.heroes?.[i] ?? DEFAULT_HEROES[i]!));
  const bodies: Fighter[] = [
    createFighter(1, 'hero', 0, p1.x, p1.z, facing[0] ?? 'manual', heroes[0]),
  ];
  const dummies = Math.min(options.dummies ?? 0, DUMMY_SPAWN.length);
  for (let i = 0; i < dummies; i += 1) {
    const s = DUMMY_SPAWN[i]!;
    bodies.push(createFighter(DUMMY_ID_BASE + i, 'enemy', -1, s.x, s.z, 'manual', TRAINER_KIT));
  }
  const world: World = {
    frame: 0,
    rng: createRngState(seed),
    bodies,
    bounds: { minX: fx(0), maxX: fx(1920), minZ: fx(620), maxZ: fx(1000) },
    dummiesChase: options.dummiesChase ?? false,
    playerFacing: [facing[0] ?? 'manual', facing[1] ?? 'manual'],
    playerHero: heroes,
    dummy: { counterHit: options.counterHit ?? false, refill: options.refill ?? true },
    infiniteMeter: options.infiniteMeter ?? false,
    infiniteDefense: options.infiniteDefense ?? false,
    trainer: { ...defaultTrainer(), ...options.trainer },
  };
  world.bodies.sort((a, b) => a.id - b.id);
  return world;
}

/** Changes a player's facing mode (Lab or settings), for the hero and any later spawn. */
export function setFacingMode(world: World, slot: number, mode: FacingMode): void {
  world.playerFacing[slot] = mode;
  const hero = heroOf(world, slot);
  if (hero) hero.facingMode = mode;
}

/**
 * Changes a player's hero (Lab or hero selection). The hero on stage switches at once if
 * it is idle or walking; otherwise it switches when it next becomes actionable.
 */
export function setHero(world: World, slot: number, id: string): void {
  world.playerHero[slot] = heroIndex(id);
}

export function heroOf(world: World, slot: number): Fighter | undefined {
  return world.bodies.find((b) => b.team === 'hero' && b.slot === slot);
}

function spawnHero(world: World, slot: number): void {
  const s = HERO_SPAWN[slot]!;
  const facing = world.playerFacing[slot] ?? 'manual';
  world.bodies.push(
    createFighter(slot + 1, 'hero', slot, s.x, s.z, facing, world.playerHero[slot] ?? 0),
  );
  world.bodies.sort((a, b) => a.id - b.id);
}

/**
 * Advances the world by one 1/60 s frame. `inputs[i]` drives player slot i. A missing
 * slot counts as idle; a slot without a hero gets one when its input first appears.
 */
export function step(world: World, inputs: readonly (FrameInput | undefined)[]): void {
  for (let slot = 0; slot < Math.min(inputs.length, MAX_PLAYERS); slot += 1) {
    if (inputs[slot] && !heroOf(world, slot)) spawnHero(world, slot);
  }
  const before: PositionLog = new Map();
  for (const f of world.bodies) before.set(f.id, { x: f.x, z: f.z });
  // Heroes (low ids) move first, then enemies, always in id order.
  for (const f of [...world.bodies].sort((a, b) => a.id - b.id)) {
    if (f.team === 'hero') {
      applyHeroChoice(world, f);
      stepHero(world, f, normalize(inputs[f.slot]), ON_FOOT);
      if (world.infiniteMeter) f.meter = 100;
    } else if (!stepReaction(world, f)) {
      stepTrainer(world, f);
    }
  }
  resolveHits(world);
  collide(world, before);
  for (const f of world.bodies) closeContextIfActionable(world, f);
  world.frame += 1;
}

function applyHeroChoice(world: World, f: Fighter): void {
  const want = world.playerHero[f.slot] ?? f.hero;
  if (want === f.hero) return;
  if (f.state !== MoveState.Idle && f.state !== MoveState.Walk) return;
  f.hero = want;
  f.chainUsed = 0;
}

/** Accepts M0-shaped inputs (without held/dirPressed) so old callers keep working. */
function normalize(input: Partial<FrameInput> | undefined): FrameInput {
  if (!input) return IDLE_INPUT;
  return {
    moveX: input.moveX ?? 0,
    moveZ: input.moveZ ?? 0,
    pressed: input.pressed ?? 0,
    held: input.held ?? 0,
    dirPressed: input.dirPressed ?? 0,
  };
}

const TEAM_CODE: Record<Team, number> = { hero: 0, enemy: 1 };
const FACING_MODE_CODE: Record<FacingMode, number> = { manual: 0, assisted: 1 };

/**
 * Canonical encoding: format version, frame, RNG words, bounds, Lab switches, then every
 * fighter in ascending id order with all of its state.
 */
export function encodeWorld(world: World): Uint8Array {
  const w = new ByteWriter();
  w.u8(STATE_FORMAT);
  w.u32(world.frame);
  for (const word of world.rng) w.u32(word);
  w.i32(world.bounds.minX);
  w.i32(world.bounds.maxX);
  w.i32(world.bounds.minZ);
  w.i32(world.bounds.maxZ);
  w.u8(world.dummiesChase ? 1 : 0);
  w.u32(world.playerFacing.length);
  for (const m of world.playerFacing) w.u8(FACING_MODE_CODE[m]);
  w.u32(world.playerHero.length);
  for (const h of world.playerHero) w.i32(h);
  w.u8(world.dummy.counterHit ? 1 : 0);
  w.u8(world.dummy.refill ? 1 : 0);
  w.u8(world.infiniteMeter ? 1 : 0);
  w.u8(world.infiniteDefense ? 1 : 0);
  w.u8(world.trainer.attackers);
  w.i32(world.trainer.pattern);
  w.u32(world.trainer.interval);
  w.u8(world.trainer.approach ? 1 : 0);
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  w.u32(bodies.length);
  for (const b of bodies) {
    w.u32(b.id);
    w.u8(TEAM_CODE[b.team]);
    w.i32(b.slot);
    w.i32(b.x);
    w.i32(b.z);
    w.i32(b.y);
    w.u8(b.facing === 1 ? 1 : 0);
    w.i32(b.vx);
    w.i32(b.vz);
    w.i32(b.vy);
    w.u8(b.state);
    w.u32(b.stateFrame);
    w.i32(b.dirX);
    w.i32(b.dirZ);
    w.u8(FACING_MODE_CODE[b.facingMode]);
    for (const t of b.lastTap) w.i32(t);
    w.u32(b.bufAction);
    w.u32(b.bufFrame);
    w.u32(b.attackKind);
    w.u8(b.attackFromDash ? 1 : 0);
    w.i32(b.lastGuardFrame);
    w.u32(b.targetId);
    w.u32(b.pinFrames);
    w.u8(b.passEnemies ? 1 : 0);
    w.i32(b.hero);
    w.i32(b.action);
    w.u32(b.lastCardinal);
    w.i32(b.turnFrame);
    w.i32(b.turnFrom);
    w.i32(b.contactAt);
    w.u32(b.contactIds.length);
    for (let i = 0; i < b.contactIds.length; i += 1) {
      w.u32(b.contactIds[i]!);
      w.u32(b.contactScales[i]!);
    }
    w.i32(b.hitSeg);
    w.u32(b.hitIds.length);
    for (const id of b.hitIds) w.u32(id);
    w.u32(b.chainUsed >>> 0);
    w.u8(b.airUsed ? 1 : 0);
    w.u8(b.bridged ? 1 : 0);
    w.u8(b.ghost ? 1 : 0);
    w.u32(b.meter);
    w.i32(b.reqLink);
    w.u32(b.reqFrame);
    w.i32(b.verdictTo);
    w.u32(b.verdictReject);
    w.u32(b.verdictFrame);
    w.u32(b.stun);
    w.u8(b.airRecover ? 1 : 0);
    w.u32(b.health);
    w.u32(b.maxHealth);
    encodeContext(w, b.ctx);
    w.u8(b.protectedRecovery ? 1 : 0);
    w.u8(b.bounce);
    w.u8(b.heavyFall ? 1 : 0);
    w.u32(b.groundWindow);
    w.u32(b.defense);
    w.u32(b.defIdle);
    w.i32(b.guardX);
    w.i32(b.guardZ);
    w.u8(b.guardNeutral ? 1 : 0);
    w.i32(b.pivotX);
    w.i32(b.pivotZ);
    w.i32(b.pivotAt);
    w.i32(b.exactFrame);
    w.i32(b.precisionUntil);
    w.i32(b.counterFrame);
    w.i32(b.counterX);
    w.i32(b.counterZ);
    w.i32(b.lastDirFrame);
    w.i32(b.lastUltFrame);
    w.u32(b.rewardIds.length);
    for (const id of b.rewardIds) w.u32(id);
    w.u8(b.defEvent);
    w.i32(b.defOffset);
    w.u32(b.defFrame);
    w.i32(b.defAction);
    w.i32(b.aiTimer);
    w.u32(b.aiStep);
  }
  return w.bytes();
}

export function hashWorld(world: World): number {
  return xxh32(encodeWorld(world));
}

function encodeContext(w: ByteWriter, c: ComboContext): void {
  w.u8(c.open ? 1 : 0);
  w.u32(c.actions);
  w.u32(c.hits);
  w.u32(c.damage);
  w.u32(c.scale);
  w.u32(c.stunBudget);
  w.u32(c.juggleBudget);
  w.u32(c.meterBudget);
  w.u8(c.bridgeUsed ? 1 : 0);
  w.u8(c.exhausted ? 1 : 0);
  w.u8(c.groundTag);
  w.u32(c.lastDamage);
  w.u8(c.wallBounceUsed ? 1 : 0);
  w.u8(c.groundBounceUsed ? 1 : 0);
  w.u8(c.groundOpened ? 1 : 0);
  w.u8(c.groundExtUsed ? 1 : 0);
  w.u8(c.groundFinUsed ? 1 : 0);
  w.u8(c.ended);
  w.u32(c.route.length);
  for (const r of c.route) w.u32(r);
  w.u8(c.breakerUsed ? 1 : 0);
}

/** Names of the heroes in roster order, for menus and the Lab. */
export function heroNames(): { id: string; name: string }[] {
  return HEROES.map((h) => ({ id: h.id, name: h.name }));
}
