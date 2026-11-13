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
import { grabIntegrity, holdPositions, resolveGrabs } from '../combat/grabs';
import { stepProjectiles } from '../combat/projectiles';
import { resolveClashes } from '../combat/clash';
import { stepItems } from '../combat/items';
import { claim, spawnItem } from '../combat/held';
import { weaponIndex } from '../combat/armory';
import {
  createEnvironment,
  emptyEnvironment,
  hazardHits,
  sceneryCollide,
  stepHazards,
} from '../combat/environment';
import { LAB_LAYOUT, type StageLayout } from './stage';
import { arenaIndex, difficultyIndex, MEDIUM, profileOf } from '../enemies/data';
import { arenaLayout, newEncounter, setupArena, stepEncounter } from '../enemies/encounter';
import { installEnemyFactory, stepBoss } from '../enemies/boss';
import { enemyBreaker, stepEnemy } from '../enemies/ai';
import { NO_FRAME } from '../combat/reactions';
import { encodeCoop, newCoopState } from '../coop/data';
import { stepHandoffs } from '../coop/handoff';
import { stepTeam } from '../coop/team';
import {
  installHeroFactory,
  setupStage,
  stageIndex,
  stageHero,
  stepRun,
  stepRunLate,
} from '../stage/run';
import {
  type EquipResult,
  type LoadoutKind,
  defaultLoadout,
  emptyLoadout,
  equipMove,
} from '../combat/loadout';
import { kitOf } from '../combat/roster';
import { METER } from '../combat/meter';
import { Cheat, heroCheat, newCheatState, setCheats } from '../cheats/cheats';
import { NO_TAP, stepHero } from '../movement/controller';
import { ON_FOOT } from '../movement/profile';
import { corridorIndex, encodePursuit, setupPursuit, stepPursuit } from '../mounted/pursuit';
import {
  GRENADIER_ID,
  encodeGreenhouse,
  installGrenadierFactory,
  roomIndex,
  setupGreenhouse,
  stepGreenhouse,
  stepGrenadier,
} from '../preservation/greenhouse';
import {
  type FacingMode,
  type Fighter,
  type FrameInput,
  MoveState,
  type Team,
  type World,
  type ComboContext,
  type RunCheckpoint,
  type RunStats,
  type TrainerSettings,
} from './types';

export const DUMMY_HEALTH = 1000;
export const HERO_HEALTH = 1000;

/** Version of the byte layout written by encodeWorld. Bump on any layout change. */
export const STATE_FORMAT = 18;

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
  /**
   * Loadout changes per player slot, applied over the hero's default loadout: Special and
   * Ultimate slot (0 neutral … 4 down) to an action id, or null to empty it.
   */
  loadouts?: readonly LoadoutChange[][];
  /** M6: place the stage's weapons (default off, so older replays keep their rules). */
  armory?: boolean;
  /** M6: build the stage's impact surface, breakable and hazard (default off). */
  environment?: boolean;
  /** Stage layout for `armory` and `environment` (default: the Lab's mill corner). */
  layout?: StageLayout;
  /** M7: an arena scenario id (ARENAS); the world becomes that encounter. */
  arena?: string;
  /** M7: difficulty id for the arena or the stage (default medium). */
  difficulty?: string;
  /**
   * M19: the mounted intercept's outcome carried into Marek's room (1 broken: his opening
   * is earned, 2 forced dismount). Replays carry it as a world option.
   */
  intercept?: number;
  /** M9: a stage id (STAGES); the world becomes a run through that stage's beats. */
  stage?: string;
  /** M9: practice from this beat (0 = the stage start). */
  beat?: number;
  /**
   * M11: cheats accepted before the run (hero masks per slot, session mask). `marked`
   * carries an earlier mark over (Continue, restart from a checkpoint of a marked run).
   */
  cheats?: { hero: readonly number[]; session: number; marked?: boolean; firstBeat?: number };
  /** M17: a corridor id (CORRIDORS); the world becomes a mounted Guided Pursuit. */
  pursuit?: string;
  /** M17: optional steering assistance in the pursuit (stronger soft-lane guidance). */
  steeringAssist?: boolean;
  /** M18: a greenhouse room id (ROOMS); the world becomes that greenhouse test room. */
  greenhouse?: string;
}

export interface LoadoutChange {
  kind: LoadoutKind;
  dir: number;
  action: string | null;
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
    convert: 0,
    punish: false,
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
    loadout: team === 'hero' ? defaultLoadout(kitOf({ team, hero })) : emptyLoadout(),
    cinematic: false,
    grabId: 0,
    grabbedBy: 0,
    grabStart: 0,
    grabExtUsed: false,
    grabX: team === 'hero' ? 1 : -1,
    grabZ: 0,
    regrabUntil: 0,
    escapeTried: false,
    thrownBy: 0,
    thrownCode: 0,
    grabEvent: 0,
    grabOffset: 0,
    grabFrame: 0,
    item: 0,
    wkit: -1,
    breakPending: false,
    clashWith: 0,
    propHits: [],
    impactArmed: false,
    hazardSafeUntil: 0,
    weaponEvent: 0,
    weaponDetail: 0,
    weaponFrame: 0,
    aiMode: 0,
    aiFrame: 0,
    threat: 0,
    threatTarget: 0,
    threatFlags: 0,
    aiAttack: -1,
    commitUntil: 0,
    lastHitBy: 0,
    lastHitFrame: NO_FRAME,
    nearSince: NO_FRAME,
    guardAcc: 0,
    evadeAcc: 0,
    defPlan: 0,
    defAt: 0,
    seenId: 0,
    seenStart: NO_FRAME,
    advUntil: 0,
    guardUntil: 0,
    readyAt: [],
    ko: false,
    warnUntil: 0,
    flinches: 0,
    groupWith: 0,
    groupAt: 0,
    order: 0,
    orderTarget: 0,
    orderSide: 0,
    orderAt: 0,
    orderUntil: 0,
    special: 0,
    breach: 0,
    breachAsset: 0,
    objectiveAt: 0,
    interrupts: 0,
    shaken: false,
    callKind: 0,
    handoff: 0,
    handoffFrom: 0,
    handoffAt: 0,
    handoffUntil: 0,
    handoffRow: 0,
    assist: 0,
    releasedAt: NO_FRAME,
  };
}

/** An arena enemy of kit `kit` with its profile's health and fresh AI state. */
export function createEnemy(id: number, kit: number, x: number, z: number): Fighter {
  const f = createFighter(id, 'enemy', -1, x, z, 'manual', kit);
  const prof = profileOf(f);
  if (prof) {
    f.health = prof.health;
    f.maxHealth = prof.health;
    // Rate accumulators start half full, so a 1-in-3 guard comes on the second chance.
    f.guardAcc = prof.defense.guardEvery * 50;
    f.evadeAcc = prof.defense.evadeEvery * 50;
  }
  f.readyAt = [0, 0, 0, 0, 0, 0, 0, 0];
  return f;
}
installEnemyFactory(createEnemy);
installGrenadierFactory((id, kit, x, z) => createFighter(id, 'enemy', -1, x, z, 'manual', kit));

/**
 * Creates a world with Player 1's hero. Player 2's hero appears on the first frame that
 * has an input for slot 1, so joining is part of the replayable input stream.
 */
export function createWorld(seed: number, options: WorldOptions = {}): World {
  const facing = options.facing ?? [];
  const p1 = HERO_SPAWN[0]!;
  const stage = options.stage !== undefined ? stageIndex(options.stage) : -1;
  const heroes = [0, 1].map((i) => {
    const pick = options.heroes?.[i] ?? DEFAULT_HEROES[i]!;
    return heroIndex(stage >= 0 ? stageHero(stage, i, pick) : pick);
  });
  const playerLoadout = heroes.map((h, slot) => {
    const loadout = defaultLoadout(kitOf({ team: 'hero', hero: h }));
    for (const c of options.loadouts?.[slot] ?? []) applyChange(loadout, h, c);
    return loadout;
  });
  const bodies: Fighter[] = [
    createFighter(1, 'hero', 0, p1.x, p1.z, facing[0] ?? 'manual', heroes[0]),
  ];
  bodies[0]!.loadout = [...playerLoadout[0]!];
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
    playerLoadout,
    projectiles: [],
    items: [],
    nextItem: ITEM_ID_BASE,
    environment: emptyEnvironment(),
    encounter: null,
    coop: newCoopState(),
    run: null,
    cheats: newCheatState(),
    pursuit: null,
    greenhouse: null,
  };
  world.bodies.sort((a, b) => a.id - b.id);
  if (options.pursuit !== undefined) {
    // The Lab's dummies stay behind: the corridor has its own Road Riders.
    world.bodies = world.bodies.filter((b) => b.team === 'hero');
    const diff = options.difficulty === undefined ? MEDIUM : difficultyIndex(options.difficulty);
    if (options.cheats) setCheats(world, options.cheats.hero, options.cheats.session);
    setupPursuit(world, corridorIndex(options.pursuit), diff, options.steeringAssist ?? false);
    return world;
  }
  if (options.greenhouse !== undefined) {
    // The Lab's dummies stay behind: the room has its own waves and drill thrower.
    world.bodies = world.bodies.filter((b) => b.team === 'hero');
    const diff = options.difficulty === undefined ? MEDIUM : difficultyIndex(options.difficulty);
    if (options.cheats) setCheats(world, options.cheats.hero, options.cheats.session);
    setupGreenhouse(world, roomIndex(options.greenhouse), diff);
    if (world.encounter && options.intercept) world.encounter.opening = options.intercept;
    return world;
  }
  if (options.stage !== undefined) {
    const diff = options.difficulty === undefined ? MEDIUM : difficultyIndex(options.difficulty);
    // Cheats are in effect while the first beat is set up (FULLPANTRY's food).
    if (options.cheats) {
      world.cheats.hero = [options.cheats.hero[0] ?? 0, options.cheats.hero[1] ?? 0];
      world.cheats.session = options.cheats.session;
    }
    setupStage(world, stage, diff, options.beat ?? 0, options.steeringAssist ?? false);
    if (options.cheats) {
      setCheats(world, options.cheats.hero, options.cheats.session);
      if (options.cheats.marked && options.cheats.firstBeat !== undefined)
        world.cheats.firstBeat = options.cheats.firstBeat;
      if (options.cheats.marked && !world.cheats.marked) {
        world.cheats.marked = true;
        world.cheats.firstFrame = 0;
        world.cheats.firstBeat = options.cheats.firstBeat ?? options.beat ?? 0;
      }
    }
    return world;
  }
  if (options.arena !== undefined) {
    const arena = arenaIndex(options.arena);
    const diff = options.difficulty === undefined ? MEDIUM : difficultyIndex(options.difficulty);
    world.encounter = newEncounter(arena, diff);
    const mill = arenaLayout(arena);
    if (mill) {
      world.environment = createEnvironment(mill);
      placeItems(world, mill);
    }
    setupArena(world);
    return world;
  }
  if (options.cheats) setCheats(world, options.cheats.hero, options.cheats.session);
  const layout = options.layout ?? LAB_LAYOUT;
  if (options.environment) world.environment = createEnvironment(layout);
  if (options.armory) placeItems(world, layout);
  if (world.trainer.arm >= 0) armDummy(world, world.trainer.arm);
  return world;
}

/** Item ids start here (fighters use 1–2 and 101+, scenery 301+). */
export const ITEM_ID_BASE = 201;

function placeItems(world: World, layout: StageLayout): void {
  for (const i of layout.items) spawnItem(world, weaponIndex(i.weapon), fx(i.x), fx(i.z));
}

/**
 * Lab: Dummy 1 fights with weapon `weapon` (index, -1 = unarmed). A fresh copy goes into
 * its hands; it reclaims that weapon after a disarm.
 */
export function armDummy(world: World, weapon: number): void {
  world.trainer.arm = weapon;
  const d = world.bodies.find((b) => b.id === DUMMY_ID_BASE);
  if (!d) return;
  if (d.item !== 0) {
    world.items = world.items.filter((i) => i.id !== d.item);
    d.item = 0;
    d.wkit = -1;
    d.breakPending = false;
  }
  if (weapon >= 0) claim(world, d, spawnItem(world, weapon, d.x, d.z));
}

/** Lab: removes every item and puts the stage's weapons back on their spots. */
export function resetArmory(world: World, layout: StageLayout = LAB_LAYOUT): void {
  for (const b of world.bodies) {
    b.item = 0;
    if (!(b.state === MoveState.Attack && b.wkit >= 0)) b.wkit = -1;
    b.breakPending = false;
  }
  world.items = [];
  placeItems(world, layout);
  if (world.trainer.arm >= 0) armDummy(world, world.trainer.arm);
}

/** Lab: restores the scenery (pillar, boards, cog) to its starting state. */
export function resetEnvironment(world: World, layout: StageLayout = LAB_LAYOUT): void {
  world.environment = createEnvironment(layout);
}

function applyChange(loadout: number[], hero: number, c: LoadoutChange): EquipResult {
  const kit = kitOf({ team: 'hero', hero })!;
  const index = c.action === null ? -1 : kit.actions.findIndex((a) => a.id === c.action);
  if (c.action !== null && index < 0) return 'unknown';
  return equipMove(loadout, kit, c.kind, c.dir, index);
}

/**
 * Lab loadout: puts a move (action id, or null to empty the slot) into a Special or
 * Ultimate slot of a player. Applies to the hero on stage and to later spawns.
 */
export function equip(
  world: World,
  slot: number,
  kind: LoadoutKind,
  dir: number,
  action: string | null,
): EquipResult {
  const hero = world.playerHero[slot] ?? 0;
  const loadout = world.playerLoadout[slot];
  if (!loadout) return 'unknown';
  const result = applyChange(loadout, hero, { kind, dir, action });
  const f = heroOf(world, slot);
  if (result === 'ok' && f && f.hero === hero) f.loadout = [...loadout];
  return result;
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
  // A stage with a locked roster keeps its heroes.
  if (world.run && stageHero(world.run.stage, slot, id) !== id) return;
  const hero = heroIndex(id);
  if (world.playerHero[slot] === hero) return;
  world.playerHero[slot] = hero;
  world.playerLoadout[slot] = defaultLoadout(kitOf({ team: 'hero', hero }));
}

export function heroOf(world: World, slot: number): Fighter | undefined {
  return world.bodies.find((b) => b.team === 'hero' && b.slot === slot);
}

function newHero(world: World, slot: number, x: number, z: number): Fighter {
  const facing = world.playerFacing[slot] ?? 'manual';
  const f = createFighter(slot + 1, 'hero', slot, x, z, facing, world.playerHero[slot] ?? 0);
  f.loadout = [...(world.playerLoadout[slot] ?? f.loadout)];
  return f;
}
installHeroFactory((world, slot) => {
  const s = HERO_SPAWN[slot]!;
  return newHero(world, slot, s.x, s.z);
});

function spawnHero(world: World, slot: number): void {
  const s = HERO_SPAWN[slot]!;
  // In an arena a joining hero appears beside its partner, inside the view.
  const partner = world.encounter ? world.bodies.find((b) => b.team === 'hero') : undefined;
  const x = partner ? Math.min(world.bounds.maxX, partner.x + fx(120)) : s.x;
  const f = newHero(world, slot, x, partner ? partner.z : s.z);
  if (world.run) world.run.lastHealth[slot] = f.health;
  world.bodies.push(f);
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
  // M9 stage flow (locks, exit, transitions, continues) before the encounter steps. M20: it
  // also runs a stage's corridor beats and may switch between a pursuit and a room here.
  stepRun(world);
  // M17: a mounted pursuit runs its own corridor step (riders, Road Riders, Stability).
  if (world.pursuit) {
    for (const f of world.bodies) if (f.team === 'hero') applyHeroChoice(world, f);
    stepPursuit(
      world,
      [0, 1].map((slot) => normalize(inputs[slot])),
    );
    for (const f of world.bodies) {
      if (world.infiniteMeter && f.team === 'hero') f.meter = METER.max;
      if (heroCheat(world, f, Cheat.BRIGHTSPIRIT)) f.meter = METER.max;
    }
    world.frame += 1;
    return;
  }
  stepEncounter(world);
  stepBoss(world);
  // Team Attack: invitations, confirmations and the atomic commit, before anyone moves.
  stepTeam(world, inputs);
  const before: PositionLog = new Map();
  for (const f of world.bodies) before.set(f.id, { x: f.x, z: f.z });
  // Heroes (low ids) move first, then enemies, always in id order.
  for (const f of [...world.bodies].sort((a, b) => a.id - b.id)) {
    if (f.team === 'hero') {
      applyHeroChoice(world, f);
      stepHero(world, f, normalize(inputs[f.slot]), ON_FOOT);
      if (world.infiniteMeter) f.meter = 100;
      if (heroCheat(world, f, Cheat.BRIGHTSPIRIT)) f.meter = METER.max;
    } else if (f.id === GRENADIER_ID && world.greenhouse) {
      // M18: the grenade-drill thrower reacts to hits, otherwise runs its sequence.
      if (!stepReaction(world, f)) stepGrenadier(world, f);
    } else if (world.encounter && profileOf(f)) {
      // Arena enemies: Combo Breaker while trapped, reactions, then their AI.
      if (enemyBreaker(world, f)) continue;
      if (!stepReaction(world, f)) stepEnemy(world, f);
    } else if (!stepReaction(world, f)) {
      stepTrainer(world, f);
    }
  }
  stepItems(world);
  stepHazards(world);
  stepProjectiles(world);
  resolveClashes(world);
  resolveGrabs(world);
  resolveHits(world);
  koPass(world);
  grabIntegrity(world);
  collide(world, before);
  sceneryCollide(world);
  holdPositions(world);
  hazardHits(world);
  stepGreenhouse(world);
  stepHandoffs(world);
  for (const f of world.bodies) closeContextIfActionable(world, f);
  stepRunLate(world);
  // BRIGHTSPIRIT: the Attack Bar stays full (an Ultimate spent this frame refills now).
  for (const f of world.bodies) if (heroCheat(world, f, Cheat.BRIGHTSPIRIT)) f.meter = METER.max;
  world.frame += 1;
}

/**
 * A fighter whose Health reached 0 while standing is knocked down at once; when it would
 * get up it is defeated (or, the boss, surrenders): see stepReaction.
 */
function koPass(world: World): void {
  for (const f of world.bodies) {
    if (!f.ko || f.y > 0) continue;
    if (
      f.state === MoveState.Hitstun ||
      f.state === MoveState.Blockstun ||
      f.state === MoveState.GuardCrush ||
      f.state === MoveState.Recoil ||
      f.state === MoveState.Guard ||
      f.state === MoveState.Attack ||
      f.state === MoveState.Idle ||
      f.state === MoveState.Walk
    ) {
      f.action = -1;
      f.attackKind = 0;
      f.threat = 0;
      f.state = MoveState.Launched;
      f.stateFrame = 0;
      f.vy = fx(4);
      f.y = 1;
      f.airRecover = false;
      f.protectedRecovery = false;
    }
  }
}

/**
 * Puts every pending hero choice into effect now (where the hero is idle or walking), as
 * the next step would. Hero selection uses it so the stage opens with the chosen heroes.
 */
export function applyHeroChoices(world: World): void {
  for (const f of world.bodies) if (f.team === 'hero') applyHeroChoice(world, f);
}

function applyHeroChoice(world: World, f: Fighter): void {
  const want = world.playerHero[f.slot] ?? f.hero;
  if (want === f.hero) return;
  if (f.state !== MoveState.Idle && f.state !== MoveState.Walk) return;
  f.hero = want;
  f.chainUsed = 0;
  f.loadout = [...(world.playerLoadout[f.slot] ?? defaultLoadout(kitOf(f)))];
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
  w.i32(world.trainer.arm);
  w.u32(world.playerLoadout.length);
  for (const l of world.playerLoadout) {
    w.u32(l.length);
    for (const a of l) w.i32(a);
  }
  w.u32(world.projectiles.length);
  for (const p of world.projectiles) {
    w.u32(p.owner);
    w.u32(p.code);
    w.i32(p.x);
    w.i32(p.z);
    w.i32(p.y);
    w.i32(p.vx);
    w.i32(p.life);
    w.i32(p.hw);
    w.i32(p.h);
    w.i32(p.depth);
  }
  encodeItems(w, world);
  encodeEnvironment(w, world);
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
    w.u32(b.convert);
    w.u8(b.punish ? 1 : 0);
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
    w.u32(b.loadout.length);
    for (const a of b.loadout) w.i32(a);
    w.u8(b.cinematic ? 1 : 0);
    w.u32(b.grabId);
    w.u32(b.grabbedBy);
    w.i32(b.grabStart);
    w.u8(b.grabExtUsed ? 1 : 0);
    w.i32(b.grabX);
    w.i32(b.grabZ);
    w.i32(b.regrabUntil);
    w.u8(b.escapeTried ? 1 : 0);
    w.u32(b.thrownBy);
    w.u32(b.thrownCode);
    w.u8(b.grabEvent);
    w.i32(b.grabOffset);
    w.u32(b.grabFrame);
    w.u32(b.item);
    w.i32(b.wkit);
    w.u8(b.breakPending ? 1 : 0);
    w.u32(b.clashWith);
    w.u32(b.propHits.length);
    for (const id of b.propHits) w.u32(id);
    w.u8(b.impactArmed ? 1 : 0);
    w.i32(b.hazardSafeUntil);
    w.u8(b.weaponEvent);
    w.i32(b.weaponDetail);
    w.u32(b.weaponFrame);
    w.u8(b.aiMode);
    w.i32(b.aiFrame);
    w.u32(b.threat);
    w.u32(b.threatTarget);
    w.u8(b.threatFlags);
    w.i32(b.aiAttack);
    w.i32(b.commitUntil);
    w.u32(b.lastHitBy);
    w.i32(b.lastHitFrame);
    w.i32(b.nearSince);
    w.i32(b.guardAcc);
    w.i32(b.evadeAcc);
    w.u8(b.defPlan);
    w.i32(b.defAt);
    w.u32(b.seenId);
    w.i32(b.seenStart);
    w.i32(b.advUntil);
    w.i32(b.guardUntil);
    w.u32(b.readyAt.length);
    for (const r of b.readyAt) w.i32(r);
    w.u8(b.ko ? 1 : 0);
    w.i32(b.warnUntil);
    w.u32(b.flinches);
    w.u32(b.groupWith);
    w.i32(b.groupAt);
    w.u8(b.order);
    w.u32(b.orderTarget);
    w.i32(b.orderSide);
    w.i32(b.orderAt);
    w.i32(b.orderUntil);
    w.u8(b.special);
    w.u8(b.breach);
    w.u32(b.breachAsset);
    w.i32(b.objectiveAt);
    w.u32(b.interrupts);
    w.u8(b.shaken ? 1 : 0);
    w.u8(b.callKind);
    w.u8(b.handoff);
    w.u32(b.handoffFrom);
    w.i32(b.handoffAt);
    w.i32(b.handoffUntil);
    w.u8(b.handoffRow);
    w.u8(b.assist);
    w.i32(b.releasedAt);
  }
  encodeEncounter(w, world);
  encodeCoop(w, world.coop);
  encodeRun(w, world);
  const c = world.cheats;
  w.u32(c.hero[0] ?? 0);
  w.u32(c.hero[1] ?? 0);
  w.u32(c.session);
  w.u8(c.marked ? 1 : 0);
  w.i32(c.firstFrame);
  w.i32(c.firstBeat);
  w.u32(c.used);
  encodePursuit(w, world.pursuit);
  encodeGreenhouse(w, world.greenhouse);
  return w.bytes();
}

function encodeRun(w: ByteWriter, world: World): void {
  const r = world.run;
  w.u8(r ? 1 : 0);
  if (!r) return;
  w.u32(r.stage);
  w.u32(r.difficulty);
  w.u32(r.startBeat);
  w.u32(r.beat);
  w.u8(r.phase);
  w.i32(r.phaseFrame);
  w.u32(r.locksDone);
  w.i32(r.floorX);
  w.u32(r.continues);
  w.u32(r.continuesUsed);
  const cp = r.checkpoint;
  w.u8(cp ? 1 : 0);
  if (cp) {
    w.u32(cp.beat);
    w.u32(cp.meter.length);
    for (const m of cp.meter) w.u32(m);
    encodeStats(w, cp.stats);
  }
  w.u32(r.workers.length);
  for (const k of r.workers) {
    w.i32(k.x);
    w.i32(k.z);
    w.u8(k.look);
    w.u8(k.state);
    w.i32(k.since);
  }
  w.u32(r.pickups.length);
  for (const p of r.pickups) {
    w.i32(p.x);
    w.i32(p.z);
    w.u32(p.heal);
    w.u8(p.look);
    w.u8(p.taken ? 1 : 0);
  }
  w.u8(r.cacheOpen ? 1 : 0);
  w.u8(r.clue);
  w.u8(r.evidence);
  w.u32(r.channel.length);
  for (const c of r.channel) {
    w.u8(c.kind);
    w.u32(c.target);
    w.u32(c.progress);
    w.u32(c.need);
  }
  for (const h of r.lastHealth) w.i32(h);
  for (const d of r.downedAt) w.i32(d);
  w.u32(r.counted.length);
  for (const id of r.counted) w.u32(id);
  encodeStats(w, r.stats);
  w.u32(r.workersTotal);
  w.u32(r.cluesTotal);
  w.u8(r.event.kind);
  w.i32(r.event.frame);
  w.i32(r.event.detail);
  // M20: the stage records, the carried weapons and the run's switches.
  encodeRecords(w, r);
  w.u8(r.capture ? 1 : 0);
  if (r.capture) {
    const c = r.capture;
    for (const v of [c.route, c.gunLost, c.gunAmmo, c.scorch, c.scorchStops, c.intercept]) w.i32(v);
  }
  w.u8(r.assist ? 1 : 0);
  w.u8(r.resume);
  w.u8(cp ? 1 : 0);
  if (cp) encodeRecords(w, cp);
}

function encodeRecords(
  w: ByteWriter,
  r: Pick<RunCheckpoint, 'ledger' | 'response' | 'branches' | 'intercept' | 'carry'>,
): void {
  w.u32(r.ledger.length);
  for (const a of r.ledger) {
    w.u32(a.beat);
    w.u32(a.name.length);
    for (let i = 0; i < a.name.length; i += 1) w.u32(a.name.charCodeAt(i));
    w.u32(a.kind);
    w.i32(a.condition);
    w.u8(a.state);
  }
  w.u32(r.response.length);
  for (const x of r.response) {
    w.u32(x.beat);
    w.u32(x.scores.length);
    for (const v of x.scores) w.i32(v);
    w.u32(x.rewinds);
    w.u8(x.mastery ? 1 : 0);
  }
  w.u32(r.branches.length);
  for (const b of r.branches) w.u8(b);
  w.u8(r.intercept);
  for (const c of r.carry) {
    w.u8(c ? 1 : 0);
    if (c) {
      w.u32(c.def);
      w.i32(c.integrity);
      w.i32(c.ammo);
    }
  }
}

function encodeStats(w: ByteWriter, s: RunStats): void {
  w.u32(s.frames);
  w.u32(s.defeated);
  w.u32(s.surrendered);
  w.u32(s.fled);
  w.u32(s.damageTaken);
  w.u32(s.food);
  w.u32(s.downs);
  w.u32(s.revives);
  w.u32(s.workersFreed);
  w.u32(s.clues);
  w.u32(s.evidence);
  w.u32(s.bestHits);
  w.u32(s.bestDamage);
  w.u32(s.reciprocal);
  w.u32(s.accord);
  w.u32(s.calls);
  w.u32(s.callsBroken);
  w.u32(s.breachesStopped);
  w.u32(s.breachesDone);
  w.u32(s.grenadeDamage);
}

function encodeEncounter(w: ByteWriter, world: World): void {
  const e = world.encounter;
  w.u8(e ? 1 : 0);
  if (!e) return;
  w.u32(e.arena);
  w.i32(e.start);
  w.u32(e.difficulty);
  w.i32(e.wave);
  w.u32(e.waveIds.length);
  for (const id of e.waveIds) w.u32(id);
  w.u32(e.nextId);
  w.u8(e.result);
  w.i32(e.viewMin);
  w.i32(e.viewMax);
  w.i32(e.groupReadyAt);
  const b = e.boss;
  w.u8(b ? 1 : 0);
  if (b) {
    w.u32(b.id);
    w.u32(b.phase);
    w.i32(b.resolve);
    w.i32(b.resolveMax);
    w.i32(b.stagger);
    w.u8(b.closing ? 1 : 0);
    w.u32(b.breaks);
    w.u8(b.pending ? 1 : 0);
    w.i32(b.pendingSince);
    w.i32(b.carry);
    w.i32(b.shift);
    w.u8(b.summoned ? 1 : 0);
    w.u8(b.capture);
    w.i32(b.captureAt);
    w.u8(b.gunLost);
    w.i32(b.gunAmmo);
    w.u32(b.gunItem);
    w.u8(b.scorch);
    w.i32(b.scorchAt);
    w.u32(b.scorchStops);
    w.u8(b.intercept);
  }
  w.u32(e.devices.length);
  for (const d of e.devices) {
    w.u32(d.id);
    w.i32(d.x);
    w.i32(d.z);
    w.u32(d.count);
    w.u32(d.progress);
    w.u8(d.active ? 1 : 0);
    w.i32(d.hazard);
  }
  w.u32(e.log.frame);
  w.u32(e.log.enemy);
  w.i32(e.log.code);
  w.u8(e.log.verdict);
  w.u32(e.peakCommitted);
  w.u32(e.offscreenWarned);
  w.u32(e.offscreenUnwarned);
  w.u32(e.call);
  w.i32(e.callReadyAt);
  w.u32(e.sabotage);
  w.u32(e.breached.length);
  for (const i of e.breached) w.u32(i);
  w.u32(e.reserveUsed);
  w.i32(e.entryKit);
  w.i32(e.entryX);
  w.i32(e.entryZ);
  w.i32(e.entryAt);
  w.u8(e.opening);
  w.u8(e.event.kind);
  w.i32(e.event.frame);
  w.i32(e.event.a);
  w.i32(e.event.b);
}

function encodeItems(w: ByteWriter, world: World): void {
  w.u32(world.nextItem);
  const items = [...world.items].sort((a, b) => a.id - b.id);
  w.u32(items.length);
  for (const i of items) {
    w.u32(i.id);
    w.u32(i.def);
    w.u8(i.state);
    w.i32(i.x);
    w.i32(i.z);
    w.i32(i.y);
    w.i32(i.vx);
    w.i32(i.vy);
    w.i32(i.integrity);
    w.i32(i.ammo);
    w.u32(i.holder);
    w.u32(i.lastHolder);
    w.u32(i.owner);
    w.u32(i.code);
    w.u8(i.flight);
    w.u8(i.breakOnImpact ? 1 : 0);
    w.u8(i.disarmed ? 1 : 0);
    w.u32(i.hitIds.length);
    for (const id of i.hitIds) w.u32(id);
    w.u32(i.reserveFor);
    w.i32(i.reserveUntil);
    w.i32(i.settleX);
    w.i32(i.settleZ);
    w.i32(i.settleLeft);
    w.i32(i.anchorX);
    w.i32(i.anchorZ);
  }
}

function encodeEnvironment(w: ByteWriter, world: World): void {
  const env = world.environment;
  w.u32(env.surfaces.length);
  for (const s of env.surfaces) {
    w.u32(s.id);
    w.i32(s.x);
    w.i32(s.z);
    w.i32(s.hw);
    w.i32(s.hd);
    w.i32(s.h);
    w.u8(s.cracked ? 1 : 0);
    w.u32(s.impacts);
  }
  w.u32(env.breakables.length);
  for (const b of env.breakables) {
    w.u32(b.id);
    w.i32(b.x);
    w.i32(b.z);
    w.i32(b.hw);
    w.i32(b.hd);
    w.i32(b.h);
    w.i32(b.power);
    for (const t of b.thresholds) w.i32(t);
    w.u8(b.state);
    w.i32(b.fragment);
    w.u8(b.spawned ? 1 : 0);
  }
  w.u32(env.hazards.length);
  for (const h of env.hazards) {
    w.u32(h.id);
    w.i32(h.x);
    w.i32(h.z);
    w.i32(h.hw);
    w.i32(h.hd);
    w.i32(h.h);
    w.u8(h.phase);
    w.u32(h.phaseFrame);
    w.u32(h.rest);
    w.u32(h.warn);
    w.u32(h.active);
    w.u32(h.damage);
  }
  const l = env.log;
  w.u8(l.kind);
  w.u32(l.frame);
  w.u32(l.target);
  w.u32(l.prop);
  w.i32(l.force);
  w.i32(l.damage);
  w.i32(l.detail);
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
  w.u8(c.environmentImpactUsed ? 1 : 0);
}

/** Names of the heroes in roster order, for menus and the Lab. */
export function heroNames(): { id: string; name: string }[] {
  return HEROES.map((h) => ({ id: h.id, name: h.name }));
}
