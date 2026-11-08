import { fx } from '../math/fixed';
import { ByteWriter } from '../state/encode';
import { GREENHOUSE_DATA } from '../combat/heroes.gen';
import type { GreenhouseDef, GreenhouseRoomDef, ActionDef } from '../combat/types';
import { WEAPONS, weaponIndex } from '../combat/armory';
import { DEFENSE } from '../combat/defense';
import { METER } from '../combat/meter';
import { dealDamage } from '../combat/damage';
import { ITEM, heldItem, payIntegrity, spawnItem } from '../combat/held';
import { enter, enterProtection, interrupt } from '../combat/reactions';
import { baseKit, TRAINER_KIT } from '../combat/roster';
import { IMPACT } from '../combat/environment';
import { Cheat, sessionCheat } from '../cheats/cheats';
import { ActionBit } from '../input/bits';
import { BODY_HALF_D, BODY_HALF_W } from '../movement/profile';
import { DIFFICULTIES, profileOf } from '../enemies/data';
import { newEncounter, setupArena } from '../enemies/encounter';
import {
  type Fighter,
  Flight,
  type FrameInput,
  type Item,
  ItemState,
  MoveState,
  Protect,
  type World,
} from '../world/types';

/**
 * M18 greenhouse systems (Stage 2 spec §6, §9.3, §10, §13): the Preservation Ledger,
 * ownership-aware containers, the Layered Pantry, the loading shutter, the seedling rack
 * and its support rail, the irrigation purge jet, the cooperative redirect, the cargo
 * restraint and the breaching-grenade drill. Authored deterministic rules only; every
 * object lives in `World.greenhouse` and is part of the encoded state.
 */

export const GREENHOUSE: GreenhouseDef | null = GREENHOUSE_DATA;
export const ROOMS: readonly GreenhouseRoomDef[] = GREENHOUSE_DATA?.rooms ?? [];

/** Greenhouse props are numbered from here (fighters, items and scenery use lower ids). */
export const GH_PROP_BASE = 601;
/** The grenade-drill thrower (an enemy-team body between the dummies and the items). */
export const GRENADIER_ID = 180;

export function roomIndex(id: string): number {
  const i = ROOMS.findIndex((r) => r.id === id);
  if (i < 0) throw new Error(`unknown greenhouse room "${id}"`);
  return i;
}

/** Ledger asset states. Numbers are encoded; never renumber. */
export const AssetState = { Sound: 0, Damaged: 1, Critical: 2, Fallback: 3, Lost: 4 } as const;
/** Seedling rack states. Numbers are encoded; never renumber. */
export const RackState = { Secure: 0, Loose: 1, Toppled: 2 } as const;
/** Purge-jet phases. Numbers are encoded; never renumber. */
export const JetPhase = { Ready: 0, Warn: 1, Active: 2, Cooldown: 3 } as const;
/**
 * Grenade-drill phases: Wait, the thrower's visible Remove, Arm and Aim, the Lob in the
 * air, Out (a grenade lies, flies or is held in the room). Numbers are encoded.
 */
export const GrenadePhase = { Wait: 0, Remove: 1, Arm: 2, Aim: 3, Lob: 4, Out: 5 } as const;
/** What a hero's greenhouse Channel works on. Numbers are encoded; never renumber. */
export const GhChannel = { None: 0, Repair: 1, Redirect: 2, Rack: 3 } as const;

/** Greenhouse events for the HUD, captions and sounds (the last one is kept). */
export const GhEvent = {
  None: 0,
  Opened: 1,
  Broke: 2,
  Ate: 3,
  AssetHit: 4,
  Repaired: 5,
  Fallback: 6,
  Lost: 7,
  RackLoose: 8,
  RackTopple: 9,
  RackRighted: 10,
  JetWarn: 11,
  JetFire: 12,
  Redirected: 13,
  Lashed: 14,
  GrenadeRemove: 15,
  GrenadeArm: 16,
  GrenadeAim: 17,
  GrenadeThrow: 18,
  GrenadeDropped: 19,
  GrenadeLiveDrop: 20,
  GrenadeSecured: 21,
  GrenadeReturned: 22,
  Blast: 23,
  Fitted: 24,
} as const;

export interface LedgerAsset {
  id: number;
  /** Ledger kind index. */
  kind: number;
  /** Authored name in the room (bed-west, pump…). */
  name: string;
  x: number;
  z: number;
  condition: number;
  state: number;
  /** No further damage before this frame (bounded damage). */
  guardUntil: number;
  hits: number;
  damage: number;
}

export interface GhContainer {
  id: number;
  kind: number;
  x: number;
  z: number;
  opened: boolean;
  integrity: number;
  /** Fighter that opened or broke it (0 = not yet). */
  by: number;
}

export interface GhPantry {
  id: number;
  /** Pantry index. */
  item: number;
  x: number;
  z: number;
  taken: boolean;
  by: number;
}

export interface GhRecord {
  opened: number;
  broken: number;
  eaten: number;
  repairs: number;
  repaired: number;
  assetHits: number;
  damage: number;
  fallbacks: number;
  lost: number;
  topples: number;
  rights: number;
  fits: number;
  purges: number;
  redirects: number;
  coopRedirects: number;
  lashes: number;
  blasts: number;
  secured: number;
  returned: number;
  drained: number;
}

export interface Greenhouse {
  room: number;
  difficulty: number;
  assets: LedgerAsset[];
  containers: GhContainer[];
  pantry: GhPantry[];
  nextProp: number;
  /** Prop id of the loading shutter's impact surface (0 = none) and its last impact count. */
  shutterId: number;
  shutterImpacts: number;
  rack: { state: number; power: number; spawned: boolean; since: number } | null;
  jet: { phase: number; frame: number; lane: number; hits: number[] } | null;
  redirect: { progress: number; ready: number } | null;
  restraint: { target: number; until: number; ready: number } | null;
  grenade: {
    phase: number;
    frame: number;
    /** The grenade's item id while one is Out (0 = none). */
    item: number;
    armed: boolean;
    /** Frames left on the fuse (counts from arming; never reset). */
    fuse: number;
    aimX: number;
    aimZ: number;
    /** The thrower's lob: position and speed in the air. */
    x: number;
    z: number;
    y: number;
    vx: number;
    vz: number;
    vy: number;
    returned: boolean;
    nextAt: number;
    rounds: number;
  } | null;
  /** Aquatic assets do not drain before this frame (the cooperative redirect). */
  stableUntil: number;
  channel: { kind: number; target: number; progress: number }[];
  record: GhRecord;
  log: { kind: number; frame: number; a: number; b: number };
}

const rules = () => GREENHOUSE!.rules;
/** Frames between two body impacts that loosen the rack. */
const RACK_BUMP = 20;
/** Strikes meet low property (crates, beds) as if it were at least this tall. */
const STRIKE_FLOOR = fx(240);
const kindDef = (a: LedgerAsset) => GREENHOUSE!.ledger[a.kind]!;
const roomOf = (gh: Greenhouse) => ROOMS[gh.room]!;

function emptyRecord(): GhRecord {
  return {
    opened: 0,
    broken: 0,
    eaten: 0,
    repairs: 0,
    repaired: 0,
    assetHits: 0,
    damage: 0,
    fallbacks: 0,
    lost: 0,
    topples: 0,
    rights: 0,
    fits: 0,
    purges: 0,
    redirects: 0,
    coopRedirects: 0,
    lashes: 0,
    blasts: 0,
    secured: 0,
    returned: 0,
    drained: 0,
  };
}

function log(world: World, kind: number, a = 0, b = 0): void {
  const gh = world.greenhouse!;
  gh.log = { kind, frame: world.frame, a, b };
}

/** The asset state its condition gives (Lost stays Lost). */
function stateFor(a: LedgerAsset): number {
  if (a.state === AssetState.Lost) return AssetState.Lost;
  const k = kindDef(a);
  if (a.condition <= 0) return k.essential ? AssetState.Fallback : AssetState.Lost;
  if (a.condition <= k.critical) return AssetState.Critical;
  if (a.condition <= k.damaged) return AssetState.Damaged;
  return AssetState.Sound;
}

/**
 * Builds a greenhouse room: its waves (a hidden arena), Ledger assets, containers, loose
 * pantry items, the shutter's impact surface, the rack, the jet, the redirect, the
 * restraint and the grenade drill with its thrower.
 */
export function setupGreenhouse(world: World, room: number, difficulty: number): void {
  const r = ROOMS[room]!;
  if (r.arena >= 0) {
    world.encounter = newEncounter(r.arena, difficulty);
    setupArena(world);
  } else {
    world.bounds = { ...world.bounds, minX: 0, maxX: fx(r.width) };
  }
  let prop = GH_PROP_BASE;
  const gh: Greenhouse = {
    room,
    difficulty,
    assets: r.assets.map((a) => {
      const k = GREENHOUSE!.ledger[a.kind]!;
      return {
        id: prop++,
        kind: a.kind,
        name: a.id,
        x: a.x,
        z: a.z,
        condition: k.condition,
        state: AssetState.Sound,
        guardUntil: 0,
        hits: 0,
        damage: 0,
      };
    }),
    containers: r.containers.map((c) => {
      const k = GREENHOUSE!.containers[c.kind]!;
      return {
        id: prop++,
        kind: c.kind,
        x: c.x,
        z: c.z,
        opened: false,
        integrity: k.integrity,
        by: 0,
      };
    }),
    pantry: [],
    nextProp: 0,
    shutterId: 0,
    shutterImpacts: 0,
    rack: r.rack ? { state: RackState.Secure, power: 0, spawned: false, since: -RACK_BUMP } : null,
    jet: r.jet ? { phase: JetPhase.Ready, frame: 0, lane: 0, hits: [] } : null,
    redirect: r.redirect ? { progress: 0, ready: 0 } : null,
    restraint: r.restraint ? { target: 0, until: 0, ready: 0 } : null,
    grenade: r.grenadier
      ? {
          phase: GrenadePhase.Wait,
          frame: 0,
          item: 0,
          armed: false,
          fuse: 0,
          aimX: 0,
          aimZ: 0,
          x: 0,
          z: 0,
          y: 0,
          vx: 0,
          vz: 0,
          vy: 0,
          returned: false,
          nextAt: GREENHOUSE!.grenade.every,
          rounds: 0,
        }
      : null,
    stableUntil: 0,
    channel: [idle(), idle()],
    record: emptyRecord(),
    log: { kind: GhEvent.None, frame: 0, a: 0, b: 0 },
  };
  world.greenhouse = gh;
  for (const p of r.pantry) addPantry(gh, p.item, p.x, p.z, prop++);
  // FULLPANTRY: one deterministic extra recovery item, a copy of the first loose item.
  const first = r.pantry[0];
  if (first && sessionCheat(world, Cheat.FULLPANTRY))
    addPantry(gh, first.item, first.x + fx(80), first.z, prop++);
  if (r.shutter) {
    const k = GREENHOUSE!.ledger[gh.assets[r.shutter.asset]!.kind]!;
    gh.shutterId = prop++;
    world.environment.surfaces.push({
      id: gh.shutterId,
      x: r.shutter.x,
      z: r.shutter.z,
      hw: k.hw,
      hd: k.hd,
      h: k.h,
      cracked: false,
      impacts: 0,
    });
  }
  gh.nextProp = prop;
  if (r.grenadier) {
    const g = createGrenadier(GRENADIER_ID, TRAINER_KIT, r.grenadier.x, r.grenadier.z);
    g.facing = -1;
    world.bodies.push(g);
    world.bodies.sort((a, b) => a.id - b.id);
  }
}

function idle() {
  return { kind: GhChannel.None, target: 0, progress: 0 };
}

function addPantry(gh: Greenhouse, item: number, x: number, z: number, id: number): void {
  gh.pantry.push({ id, item, x, z, taken: false, by: 0 });
}

/** Factory installed by world.ts (avoids an import cycle). */
let createGrenadier: (id: number, kit: number, x: number, z: number) => Fighter = () => {
  throw new Error('grenadier factory not installed');
};
export function installGrenadierFactory(fn: typeof createGrenadier): void {
  createGrenadier = fn;
}

// --- geometry ------------------------------------------------------------------------------

function near(
  f: { x: number; z: number },
  o: { x: number; z: number },
  hw: number,
  hd: number,
): boolean {
  const r = rules().reach;
  return Math.abs(f.x - o.x) <= hw + r.x && Math.abs(f.z - o.z) <= hd + r.z;
}

function overlaps(
  f: { x: number; z: number },
  fw: number,
  fd: number,
  o: { x: number; z: number },
  hw: number,
  hd: number,
): boolean {
  return Math.abs(f.x - o.x) < fw + hw && Math.abs(f.z - o.z) < fd + hd;
}

const busy = (f: Fighter) => f.ko || f.state === MoveState.Defeated;

// --- Ledger --------------------------------------------------------------------------------

/**
 * Bounded Ledger damage: nothing while the asset is guarded or Lost, at most `maxHit` per
 * event, then a short guard. Essential systems stop at Safe fallback. Returns the damage.
 */
export function damageAsset(world: World, a: LedgerAsset, amount: number): number {
  const gh = world.greenhouse!;
  if (amount <= 0 || a.state === AssetState.Lost || world.frame < a.guardUntil) return 0;
  const dmg = Math.min(amount, rules().maxHit, a.condition);
  if (dmg <= 0) return 0;
  const before = a.state;
  a.condition -= dmg;
  a.guardUntil = world.frame + rules().guard;
  a.hits += 1;
  a.damage += dmg;
  a.state = stateFor(a);
  gh.record.assetHits += 1;
  gh.record.damage += dmg;
  if (a.state === AssetState.Fallback && before !== AssetState.Fallback) {
    gh.record.fallbacks += 1;
    log(world, GhEvent.Fallback, a.id);
  } else if (a.state === AssetState.Lost) {
    gh.record.lost += 1;
    log(world, GhEvent.Lost, a.id);
  } else log(world, GhEvent.AssetHit, a.id, dmg);
  return dmg;
}

function restore(world: World, a: LedgerAsset, amount: number): number {
  if (a.state === AssetState.Lost || amount <= 0) return 0;
  const k = kindDef(a);
  const add = Math.min(amount, k.condition - a.condition);
  a.condition += add;
  a.state = stateFor(a);
  if (add > 0) world.greenhouse!.record.repaired += add;
  return add;
}

/** Does any circulation pump still run (Sound or Damaged)? */
export function circulating(gh: Greenhouse): boolean {
  return gh.assets.some(
    (a) => kindDef(a).circulation && a.state !== AssetState.Lost && a.state <= AssetState.Damaged,
  );
}

export interface LedgerGrade {
  /** Weighted condition in percent (Lost assets count 0). */
  score: number;
  grade: string;
  name: string;
}

/** The Preservation grade: weighted condition in percent against the authored bands. */
export function ledgerGrade(gh: Greenhouse): LedgerGrade {
  let total = 0;
  let got = 0;
  for (const a of gh.assets) {
    const k = kindDef(a);
    total += k.weight * k.condition;
    if (a.state !== AssetState.Lost) got += k.weight * a.condition;
  }
  const score = total > 0 ? Math.trunc((got * 100) / total) : 100;
  const band = GREENHOUSE!.grades.find((g) => score >= g.min) ?? GREENHOUSE!.grades.at(-1)!;
  return { score, grade: band.id, name: band.name };
}

// --- interactions --------------------------------------------------------------------------

/**
 * Neutral Interact with empty hands (after a weapon pickup found nothing): opens a
 * protected container, fires the purge-jet valve or lashes the cargo restraint at once, or
 * starts holding on the redirect wheel, a fallen rack or a damaged Ledger asset. Returns
 * false when nothing in reach takes Interact.
 */
export function greenhouseInteract(world: World, f: Fighter): boolean {
  const gh = world.greenhouse;
  if (!gh || f.team !== 'hero' || busy(f)) return false;
  const r = roomOf(gh);
  for (const c of gh.containers) {
    const k = GREENHOUSE!.containers[c.kind]!;
    if (c.opened || k.hostile || !near(f, c, k.hw, k.hd)) continue;
    openContainer(world, c, f.id);
    gh.record.opened += 1;
    log(world, GhEvent.Opened, c.id, f.id);
    enter(f, MoveState.Pickup, k.open);
    f.action = -1;
    f.vx = 0;
    f.vz = 0;
    return true;
  }
  if (r.jet && gh.jet && gh.jet.phase === JetPhase.Ready && near(f, r.jet, fx(20), fx(20))) {
    gh.jet.phase = JetPhase.Warn;
    gh.jet.frame = world.frame;
    gh.jet.hits = [];
    log(world, GhEvent.JetWarn, gh.jet.lane, f.id);
    enter(f, MoveState.Pickup, 12);
    f.action = -1;
    return true;
  }
  if (r.restraint && gh.restraint && near(f, r.restraint, fx(20), fx(20))) {
    const t = restraintTarget(world);
    if (t && gh.restraint.target === 0 && world.frame >= gh.restraint.ready) {
      lash(world, t);
      enter(f, MoveState.Pickup, 14);
      f.action = -1;
      return true;
    }
  }
  const t = channelTarget(world, f);
  if (!t) return false;
  gh.channel[f.slot] = { kind: t.kind, target: t.target, progress: 0 };
  f.state = MoveState.Channel;
  f.stateFrame = 0;
  f.vx = 0;
  f.vz = 0;
  f.action = -1;
  f.attackKind = 0;
  if (t.x !== f.x) f.facing = t.x > f.x ? 1 : -1;
  return true;
}

interface ChannelTarget {
  kind: number;
  target: number;
  x: number;
}

function channelTarget(world: World, f: Fighter): ChannelTarget | null {
  const gh = world.greenhouse!;
  const r = roomOf(gh);
  if (
    r.redirect &&
    gh.redirect &&
    world.frame >= gh.redirect.ready &&
    near(f, r.redirect, fx(30), fx(20))
  )
    return { kind: GhChannel.Redirect, target: 0, x: r.redirect.x };
  if (r.rack && gh.rack && gh.rack.state !== RackState.Secure) {
    const k = GREENHOUSE!.ledger[gh.assets[r.rack.asset]!.kind]!;
    if (near(f, r.rack, k.hw, k.hd)) return { kind: GhChannel.Rack, target: 0, x: r.rack.x };
  }
  let best: LedgerAsset | null = null;
  let bestD = 0;
  for (const a of gh.assets) {
    const k = kindDef(a);
    if (a.state === AssetState.Lost || a.condition >= k.condition || !near(f, a, k.hw, k.hd))
      continue;
    const d = Math.abs(a.x - f.x) + Math.abs(a.z - f.z);
    if (best === null || d < bestD) {
      best = a;
      bestD = d;
    }
  }
  return best ? { kind: GhChannel.Repair, target: best.id, x: best.x } : null;
}

/** Is this hero holding a greenhouse interaction (redirect, rack, repair)? */
export function greenhouseChanneling(world: World, f: Fighter): boolean {
  return (world.greenhouse?.channel[f.slot]?.kind ?? GhChannel.None) !== GhChannel.None;
}

/**
 * One frame of holding: Interact must stay held and the target must stay valid and in
 * reach; a hit ends it by changing the hero's state. Repairs restore `amount` every
 * `every` frames; the redirect fills faster with both heroes on it.
 */
export function stepGreenhouseChannel(world: World, f: Fighter, input: FrameInput): void {
  const gh = world.greenhouse!;
  const c = gh.channel[f.slot]!;
  f.stateFrame += 1;
  const t = channelTarget(world, f);
  const held = (input.held & ActionBit.Interact) !== 0;
  const same =
    t !== null &&
    (t.kind === c.kind && t.target === c.target
      ? true
      : c.kind === GhChannel.Repair &&
        gh.assets.some(
          (a) =>
            a.id === c.target &&
            near(f, a, kindDef(a).hw, kindDef(a).hd) &&
            a.state !== AssetState.Lost &&
            a.condition < kindDef(a).condition,
        ));
  if (!held || !same) return endChannel(f, c);
  const r = roomOf(gh);
  c.progress += 1;
  switch (c.kind) {
    case GhChannel.Repair: {
      const a = gh.assets.find((x) => x.id === c.target)!;
      const k = kindDef(a);
      if (c.progress % k.repairEvery !== 0) return;
      restore(world, a, k.repairAmount);
      if (a.condition >= k.condition) {
        gh.record.repairs += 1;
        log(world, GhEvent.Repaired, a.id, f.id);
        endChannel(f, c);
      }
      return;
    }
    case GhChannel.Rack: {
      if (c.progress < r.rack!.right) return;
      rightRack(world);
      endChannel(f, c);
      return;
    }
    case GhChannel.Redirect: {
      const rd = r.redirect!;
      const both = gh.channel.every((x) => x.kind === GhChannel.Redirect);
      gh.redirect!.progress += both ? Math.trunc(rd.solo / rd.coop) : 2;
      if (gh.redirect!.progress < rd.solo * 2) return;
      redirect(world, both);
      return;
    }
  }
}

function endChannel(f: Fighter, c: { kind: number }): void {
  c.kind = GhChannel.None;
  f.state = MoveState.Idle;
  f.stateFrame = 0;
}

function redirect(world: World, coop: boolean): void {
  const gh = world.greenhouse!;
  const rd = roomOf(gh).redirect!;
  gh.redirect!.progress = 0;
  gh.redirect!.ready = world.frame + rd.cooldown;
  if (gh.jet) gh.jet.lane = 1 - gh.jet.lane;
  gh.stableUntil = world.frame + rules().stable;
  for (const a of gh.assets) if (kindDef(a).aquatic) restore(world, a, rd.restore);
  gh.record.redirects += 1;
  if (coop) gh.record.coopRedirects += 1;
  log(world, GhEvent.Redirected, gh.jet?.lane ?? 0, coop ? 2 : 1);
  for (const h of world.bodies) {
    const c = h.team === 'hero' ? gh.channel[h.slot] : undefined;
    if (c && c.kind === GhChannel.Redirect) endChannel(h, c);
  }
}

function rightRack(world: World): void {
  const gh = world.greenhouse!;
  gh.rack!.state = RackState.Secure;
  gh.rack!.power = 0;
  gh.rack!.since = world.frame;
  gh.record.rights += 1;
  log(world, GhEvent.RackRighted);
}

/**
 * Contextual fitting (spec §9.1): Interact while holding the Telescoping Service Lance next
 * to a loose or toppled seedling rack rights it at once; next to a damaged loading shutter
 * it braces the shutter (restores 30). Returns false when there is nothing to fit.
 */
export function fitWithLance(world: World, f: Fighter): boolean {
  const gh = world.greenhouse;
  const item = heldItem(world, f);
  if (!gh || !item || WEAPONS[item.def]?.id !== 'service-lance' || f.team !== 'hero') return false;
  const r = roomOf(gh);
  let done = false;
  if (r.rack && gh.rack && gh.rack.state !== RackState.Secure) {
    const k = GREENHOUSE!.ledger[gh.assets[r.rack.asset]!.kind]!;
    if (near(f, r.rack, k.hw, k.hd)) {
      rightRack(world);
      done = true;
    }
  }
  if (!done && r.shutter) {
    const a = gh.assets[r.shutter.asset]!;
    const k = kindDef(a);
    if (a.condition < k.condition && near(f, a, k.hw, k.hd)) done = restore(world, a, 30) > 0;
  }
  if (!done) return false;
  gh.record.fits += 1;
  log(world, GhEvent.Fitted, f.id);
  enter(f, MoveState.Pickup, 24);
  f.action = -1;
  f.vx = 0;
  f.vz = 0;
  return true;
}

/** What neutral Interact would do for this hero now (HUD prompt): a GhHint code. */
export const GhHint = {
  None: 0,
  Open: 1,
  Valve: 2,
  Restraint: 3,
  Redirect: 4,
  Rack: 5,
  Repair: 6,
  Fit: 7,
} as const;

export function greenhouseHint(world: World, f: Fighter): number {
  const gh = world.greenhouse;
  if (!gh || f.team !== 'hero' || busy(f)) return GhHint.None;
  const r = roomOf(gh);
  const item = heldItem(world, f);
  if (item) {
    if (WEAPONS[item.def]?.id !== 'service-lance') return GhHint.None;
    if (r.rack && gh.rack && gh.rack.state !== RackState.Secure) {
      const k = GREENHOUSE!.ledger[gh.assets[r.rack.asset]!.kind]!;
      if (near(f, r.rack, k.hw, k.hd)) return GhHint.Fit;
    }
    if (r.shutter) {
      const a = gh.assets[r.shutter.asset]!;
      if (a.condition < kindDef(a).condition && near(f, a, kindDef(a).hw, kindDef(a).hd))
        return GhHint.Fit;
    }
    return GhHint.None;
  }
  for (const c of gh.containers) {
    const k = GREENHOUSE!.containers[c.kind]!;
    if (!c.opened && !k.hostile && near(f, c, k.hw, k.hd)) return GhHint.Open;
  }
  if (r.jet && gh.jet?.phase === JetPhase.Ready && near(f, r.jet, fx(20), fx(20)))
    return GhHint.Valve;
  if (
    r.restraint &&
    gh.restraint &&
    gh.restraint.target === 0 &&
    world.frame >= gh.restraint.ready &&
    near(f, r.restraint, fx(20), fx(20)) &&
    restraintTarget(world)
  )
    return GhHint.Restraint;
  const t = channelTarget(world, f);
  if (!t) return GhHint.None;
  return t.kind === GhChannel.Redirect
    ? GhHint.Redirect
    : t.kind === GhChannel.Rack
      ? GhHint.Rack
      : GhHint.Repair;
}

// --- containers and pantry -----------------------------------------------------------------

function openContainer(world: World, c: GhContainer, by: number): void {
  const gh = world.greenhouse!;
  const r = roomOf(gh);
  const def = r.containers[gh.containers.indexOf(c)]!;
  const k = GREENHOUSE!.containers[c.kind]!;
  c.opened = true;
  c.by = by;
  c.integrity = 0;
  def.contents.forEach((x, i) => {
    const px = c.x + fx(i * 50 - (def.contents.length - 1) * 25);
    const pz = Math.min(world.bounds.maxZ - fx(10), c.z + k.hd + fx(30));
    if (x.item >= 0) {
      addPantry(gh, x.item, px, pz, gh.nextProp);
      gh.nextProp += 1;
    } else {
      const item = spawnItem(world, weaponIndex(x.weapon), px, pz);
      item.anchorX = px;
      item.anchorZ = pz;
    }
  });
}

/**
 * Strikes on greenhouse property, once per action: any strike wears a hostile container's
 * integrity (breakPower, or half the damage); an enemy strike that reaches a Ledger asset
 * damages it and loosens the seedling rack. Heroes' strikes never damage protected
 * property, and protected containers ignore every strike.
 */
export function strikeGreenhouse(
  world: World,
  att: Fighter,
  a: ActionDef,
  box: { x0: number; x1: number; y0: number; z: number; depth: number },
): void {
  const gh = world.greenhouse;
  if (!gh || att.id === GRENADIER_ID) return;
  const meets = (o: { x: number; z: number }, hw: number, hd: number, h: number) =>
    box.x0 < o.x + hw &&
    box.x1 > o.x - hw &&
    box.y0 < Math.max(h, STRIKE_FLOOR) &&
    Math.abs(box.z - o.z) <= box.depth + hd;
  const power = a.breakPower > 0 ? a.breakPower : Math.trunc(a.damage / 2);
  for (const c of gh.containers) {
    const k = GREENHOUSE!.containers[c.kind]!;
    if (c.opened || !k.hostile || att.propHits.includes(c.id) || !meets(c, k.hw, k.hd, k.h))
      continue;
    att.propHits.push(c.id);
    c.integrity = Math.max(0, c.integrity - power);
    if (c.integrity === 0) {
      openContainer(world, c, att.id);
      gh.record.broken += 1;
      log(world, GhEvent.Broke, c.id, att.id);
    }
  }
  if (att.team !== 'enemy') return;
  for (const asset of gh.assets) {
    const k = kindDef(asset);
    if (att.propHits.includes(asset.id) || !meets(asset, k.hw, k.hd, k.h)) continue;
    att.propHits.push(asset.id);
    damageAsset(world, asset, rules().strike);
  }
  const r = roomOf(gh);
  if (r.rack && gh.rack && gh.rack.state !== RackState.Toppled) {
    const k = GREENHOUSE!.ledger[gh.assets[r.rack.asset]!.kind]!;
    const id = gh.assets[r.rack.asset]!.id;
    if (meets(r.rack, k.hw, k.hd, k.h) && !att.propHits.includes(-id)) {
      att.propHits.push(-id);
      loosenRack(world, Math.max(10, Math.trunc(power / 2)));
    }
  }
}

function loosenRack(world: World, power: number): void {
  const gh = world.greenhouse!;
  const r = roomOf(gh).rack!;
  const rack = gh.rack!;
  if (rack.state === RackState.Toppled) return;
  rack.power += power;
  if (rack.power >= r.topple) {
    topple(world);
    return;
  }
  if (rack.power >= r.loose && rack.state === RackState.Secure) {
    rack.state = RackState.Loose;
    rack.since = world.frame;
    log(world, GhEvent.RackLoose);
  }
}

/**
 * The rack topples: every enemy in its fall zone (in front of it, towards larger x) is
 * knocked down, its seedlings take the authored damage, and the tagged support rail falls
 * out once. Heroes are never hit by the rack.
 */
function topple(world: World): void {
  const gh = world.greenhouse!;
  const r = roomOf(gh).rack!;
  const rack = gh.rack!;
  rack.state = RackState.Toppled;
  rack.since = world.frame;
  gh.record.topples += 1;
  log(world, GhEvent.RackTopple);
  const cx = r.x + Math.trunc(r.fallW / 2);
  for (const t of [...world.bodies].sort((a, b) => a.id - b.id)) {
    if (t.team !== 'enemy' || t.id === GRENADIER_ID || busy(t) || t.protectedRecovery) continue;
    if (!overlaps(t, BODY_HALF_W, BODY_HALF_D, { x: cx, z: r.z }, Math.trunc(r.fallW / 2), r.fallD))
      continue;
    knock(world, t, 1, r.fallDamage, fx(4), fx(5));
  }
  const seedlings = gh.assets[r.asset]!;
  // The fall is one bounded event on the seedlings (the guard does not stop it).
  seedlings.guardUntil = 0;
  damageAsset(world, seedlings, r.seedlings);
  if (!rack.spawned) {
    rack.spawned = true;
    const item = spawnItem(world, weaponIndex(r.fragment), cx, r.z + fx(20));
    item.state = ItemState.Flying;
    item.flight = Flight.Drop;
    item.y = fx(80);
    item.vy = fx(2);
  }
}

/** Knocks a fighter down and away (dirX), clear of the source, into protected recovery. */
function knock(
  world: World,
  t: Fighter,
  dirX: number,
  damage: number,
  push: number,
  lift: number,
): void {
  if (damage > 0) dealDamage(world, t, damage);
  interrupt(t);
  t.state = MoveState.Launched;
  t.stateFrame = 0;
  t.vx = dirX * push;
  t.vz = 0;
  t.vy = lift;
  t.y = Math.max(t.y, 1);
  t.bounce = 0;
  t.airRecover = false;
  enterProtection(world, t, Protect.GetUp);
}

// --- cargo restraint -----------------------------------------------------------------------

function restraintTarget(world: World): Fighter | null {
  const gh = world.greenhouse!;
  const r = roomOf(gh).restraint!;
  let best: Fighter | null = null;
  let bestD = 0;
  for (const t of world.bodies) {
    if (t.team !== 'enemy' || t.id === GRENADIER_ID || busy(t)) continue;
    if (
      t.state === MoveState.Down ||
      t.state === MoveState.Launched ||
      t.state === MoveState.Surrender
    )
      continue;
    if (Math.abs(t.x - r.zx) > r.hw || Math.abs(t.z - r.zz) > r.hd) continue;
    const d = Math.abs(t.x - r.x) + Math.abs(t.z - r.z);
    if (best === null || d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** The cargo strap pins the enemy in place (shorter on a large enemy or a boss). */
function lash(world: World, t: Fighter): void {
  const gh = world.greenhouse!;
  const r = roomOf(gh).restraint!;
  const large = (baseKit(t)?.tags.includes('large') ?? false) || world.encounter?.boss?.id === t.id;
  const frames = large ? r.large : r.frames;
  interrupt(t);
  t.vx = 0;
  t.vz = 0;
  enter(t, MoveState.Hitstun, frames);
  gh.restraint!.target = t.id;
  gh.restraint!.until = world.frame + frames;
  gh.restraint!.ready = world.frame + frames + r.cooldown;
  gh.record.lashes += 1;
  log(world, GhEvent.Lashed, t.id, large ? 1 : 0);
}

// --- grenade drill ---------------------------------------------------------------------------

const DRILL_IDLE: readonly number[] = [MoveState.Idle, MoveState.Walk];

/**
 * The grenade thrower (a drill stand-in for the Systems Saboteur of M19): Remove, Arm,
 * Aim and Release, each step visible and logged for captions and sounds. It never attacks.
 */
export function stepGrenadier(world: World, f: Fighter): void {
  const gh = world.greenhouse;
  const g = gh?.grenade;
  f.vx = 0;
  f.vz = 0;
  if (!gh || !g) return;
  if (!DRILL_IDLE.includes(f.state)) {
    f.state = MoveState.Idle;
    f.stateFrame = 0;
  }
  const G = GREENHOUSE!.grenade;
  const since = world.frame - g.frame;
  switch (g.phase) {
    case GrenadePhase.Wait: {
      const hero = nearestHero(world, f);
      if (!hero || world.frame < g.nextAt) return;
      g.phase = GrenadePhase.Remove;
      g.frame = world.frame;
      g.armed = false;
      g.returned = false;
      g.rounds += 1;
      log(world, GhEvent.GrenadeRemove, f.id);
      return;
    }
    case GrenadePhase.Remove:
      if (since < G.remove) return;
      g.phase = GrenadePhase.Arm;
      g.frame = world.frame;
      log(world, GhEvent.GrenadeArm, f.id);
      return;
    case GrenadePhase.Arm: {
      if (since < G.arm) return;
      g.armed = true;
      g.fuse = G.fuse;
      g.phase = GrenadePhase.Aim;
      g.frame = world.frame;
      const hero = nearestHero(world, f);
      g.aimX = hero ? hero.x : f.x - fx(400);
      g.aimZ = hero ? hero.z : f.z;
      if (g.aimX !== f.x) f.facing = g.aimX > f.x ? 1 : -1;
      log(world, GhEvent.GrenadeAim, f.id);
      return;
    }
    case GrenadePhase.Aim: {
      if (since < G.aim) return;
      // Release: a lob that lands on the aim point after LOB frames.
      g.phase = GrenadePhase.Lob;
      g.frame = world.frame;
      g.x = f.x + f.facing * fx(30);
      g.z = f.z;
      g.y = fx(110);
      g.vx = Math.trunc((g.aimX - g.x) / LOB);
      g.vz = Math.trunc((g.aimZ - g.z) / LOB);
      g.vy = fx(5);
      log(world, GhEvent.GrenadeThrow, f.id);
      return;
    }
    default:
      return;
  }
}

/** Frames of the thrower's lob. */
const LOB = 50;

function nearestHero(world: World, f: Fighter): Fighter | null {
  let best: Fighter | null = null;
  let bestD = 0;
  for (const h of world.bodies) {
    if (h.team !== 'hero' || busy(h)) continue;
    const d = Math.abs(h.x - f.x) + Math.abs(h.z - f.z);
    if (best === null || d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

/** Puts the grenade down as an item (Ground) at (x, z). */
function dropGrenade(world: World, x: number, z: number): Item {
  const gh = world.greenhouse!;
  const g = gh.grenade!;
  const clampedZ = Math.max(world.bounds.minZ, Math.min(world.bounds.maxZ, z));
  const clampedX = Math.max(world.bounds.minX + fx(30), Math.min(world.bounds.maxX - fx(30), x));
  const item = spawnItem(world, weaponIndex(GREENHOUSE!.grenade.weapon), clampedX, clampedZ);
  g.item = item.id;
  g.phase = GrenadePhase.Out;
  g.frame = world.frame;
  return item;
}

function grenadeItem(world: World): Item | undefined {
  const g = world.greenhouse?.grenade;
  if (!g || g.item === 0) return undefined;
  return world.items.find((i) => i.id === g.item && i.state !== ItemState.Gone);
}

/** Is this item the drill's grenade (enemies never pick it up)? */
export function isGrenade(world: World, item: Item): boolean {
  return world.greenhouse?.grenade?.item === item.id;
}

/** Where the grenade is now (in the air, on the floor, in flight or in a hand), or null. */
export function grenadeSpot(world: World): { x: number; z: number; y: number } | null {
  const g = world.greenhouse?.grenade;
  if (!g) return null;
  if (g.phase === GrenadePhase.Lob) return { x: g.x, z: g.z, y: g.y };
  const item = grenadeItem(world);
  if (!item) return null;
  if (item.state === ItemState.Held) {
    const h = world.bodies.find((b) => b.id === item.holder);
    if (h) return { x: h.x, z: h.z, y: ITEM.carryY };
  }
  return { x: item.x, z: item.z, y: item.y };
}

function stepGrenade(world: World): void {
  const gh = world.greenhouse!;
  const g = gh.grenade;
  if (!g) return;
  const thrower = world.bodies.find((b) => b.id === GRENADIER_ID);
  // Interruption: a hit on the thrower before arming drops an unarmed grenade (a pickup to
  // secure); once armed, the live grenade falls at its feet.
  if (
    thrower &&
    (g.phase === GrenadePhase.Remove ||
      g.phase === GrenadePhase.Arm ||
      g.phase === GrenadePhase.Aim) &&
    !DRILL_IDLE.includes(thrower.state)
  ) {
    const armed = g.phase === GrenadePhase.Aim;
    dropGrenade(world, thrower.x + thrower.facing * fx(40), thrower.z + fx(10));
    log(world, armed ? GhEvent.GrenadeLiveDrop : GhEvent.GrenadeDropped, thrower.id);
  }
  if (g.phase === GrenadePhase.Lob) {
    g.x += g.vx;
    g.z += g.vz;
    g.y += g.vy;
    g.vy -= ITEM.gravity;
    if (world.frame - g.frame >= LOB || g.y <= 0) dropGrenade(world, g.x, g.z);
  }
  if (g.phase === GrenadePhase.Out) {
    const item = grenadeItem(world);
    if (!item) {
      resetDrill(world);
      return;
    }
    if (!g.armed && item.state === ItemState.Held) {
      const holder = world.bodies.find((b) => b.id === item.holder);
      if (holder?.team === 'hero') {
        // Secured: an unarmed grenade in a hero's hands leaves play.
        item.state = ItemState.Gone;
        holder.item = 0;
        holder.wkit = -1;
        gh.record.secured += 1;
        log(world, GhEvent.GrenadeSecured, holder.id);
        resetDrill(world);
        return;
      }
    }
    if (g.armed && !g.returned && item.state === ItemState.Flying && item.flight === Flight.Throw) {
      const owner = world.bodies.find((b) => b.id === item.owner);
      if (owner?.team === 'hero') {
        g.returned = true;
        gh.record.returned += 1;
        log(world, GhEvent.GrenadeReturned, owner.id);
      }
    }
  }
  if (g.armed && g.phase >= GrenadePhase.Aim) {
    g.fuse -= 1;
    if (g.fuse <= 0) blast(world);
  }
}

function resetDrill(world: World): void {
  const g = world.greenhouse!.grenade!;
  g.phase = GrenadePhase.Wait;
  g.item = 0;
  g.armed = false;
  g.fuse = 0;
  g.frame = world.frame;
  g.nextAt = world.frame + GREENHOUSE!.grenade.every;
}

/**
 * The controlled blast (spec §9.3, §13): knockback and damage to everyone in the radius,
 * Integrity pressure on held weapons, bounded Ledger damage (essentials stop at Safe
 * fallback), the rack loosened and hostile containers worn. Then the drill resets.
 */
function blast(world: World): void {
  const gh = world.greenhouse!;
  const G = GREENHOUSE!.grenade;
  const spot = grenadeSpot(world) ?? { x: gh.grenade!.x, z: gh.grenade!.z, y: 0 };
  const item = grenadeItem(world);
  if (item) {
    if (item.state === ItemState.Held) {
      const h = world.bodies.find((b) => b.id === item.holder);
      if (h) {
        h.item = 0;
        if (!(h.state === MoveState.Attack)) h.wkit = -1;
      }
    }
    item.state = ItemState.Gone;
    item.holder = 0;
  }
  const r2 = (G.radius / 256) * (G.radius / 256);
  const inside = (o: { x: number; z: number }, pad = 0) => {
    const dx = (o.x - spot.x) / 256;
    const dz = (o.z - spot.z) / 256;
    const r = G.radius / 256 + pad / 256;
    return pad === 0 ? dx * dx + dz * dz <= r2 : dx * dx + dz * dz <= r * r;
  };
  for (const t of [...world.bodies].sort((a, b) => a.id - b.id)) {
    if (busy(t) || t.protectedRecovery || !inside(t)) continue;
    if (t.state === MoveState.Down || t.state === MoveState.GetUp) continue;
    const held = heldItem(world, t);
    if (held) payIntegrity(world, t, G.integrity);
    const dir = t.x >= spot.x ? 1 : -1;
    knock(world, t, dir, t.id === GRENADIER_ID ? 0 : G.damage, G.push, G.lift);
  }
  for (const a of gh.assets) if (inside(a, kindDef(a).hw)) damageAsset(world, a, G.ledger);
  const r = roomOf(gh);
  if (r.rack && gh.rack && inside(r.rack, fx(40))) loosenRack(world, G.ledger);
  for (const c of gh.containers) {
    const k = GREENHOUSE!.containers[c.kind]!;
    if (c.opened || !k.hostile || !inside(c, k.hw)) continue;
    c.integrity = Math.max(0, c.integrity - 30);
    if (c.integrity === 0) {
      openContainer(world, c, 0);
      gh.record.broken += 1;
    }
  }
  gh.record.blasts += 1;
  log(world, GhEvent.Blast, spot.x, spot.z);
  resetDrill(world);
}

// --- the greenhouse pass -------------------------------------------------------------------

/**
 * Greenhouse bookkeeping after hits and scenery (one pass per frame, in a fixed order):
 * the pantry, bodies knocked into assets and the rack, shutter impacts, the purge jet,
 * the restraint, the grenade, circulation drain, and channels of downed heroes.
 */
export function stepGreenhouse(world: World): void {
  const gh = world.greenhouse;
  if (!gh) return;
  const r = roomOf(gh);
  const heroes = world.bodies.filter((b) => b.team === 'hero');
  // The drill thrower is a training stand-in: it never runs out of Health.
  const thrower = world.bodies.find((b) => b.id === GRENADIER_ID);
  if (thrower) {
    thrower.health = thrower.maxHealth;
    thrower.ko = false;
  }
  stepPantry(world, heroes);
  // Bodies knocked fast into Ledger assets or the rack.
  for (const t of [...world.bodies].sort((a, b) => a.id - b.id)) {
    if (t.state !== MoveState.Hitstun && t.state !== MoveState.Launched) continue;
    if (Math.abs(t.vx) < IMPACT.minSpeed || t.y > fx(120)) continue;
    for (const a of gh.assets) {
      const k = kindDef(a);
      if (overlaps(t, BODY_HALF_W, BODY_HALF_D, a, k.hw, k.hd))
        damageAsset(world, a, rules().impact);
    }
    if (r.rack && gh.rack && gh.rack.state !== RackState.Toppled) {
      const k = GREENHOUSE!.ledger[gh.assets[r.rack.asset]!.kind]!;
      if (
        overlaps(t, BODY_HALF_W, BODY_HALF_D, r.rack, k.hw, k.hd) &&
        world.frame - gh.rack.since >= RACK_BUMP
      ) {
        gh.rack.since = world.frame;
        loosenRack(world, rules().impact);
      }
    }
  }
  // Loading shutter: every new impact on its surface dents the shutter asset.
  if (gh.shutterId) {
    const s = world.environment.surfaces.find((x) => x.id === gh.shutterId);
    if (s && s.impacts > gh.shutterImpacts) {
      gh.shutterImpacts = s.impacts;
      const a = gh.assets[r.shutter!.asset]!;
      a.guardUntil = 0;
      damageAsset(world, a, rules().impact);
    }
  }
  stepJet(world);
  if (gh.restraint && gh.restraint.target !== 0) {
    const t = world.bodies.find((b) => b.id === gh.restraint!.target);
    if (!t || world.frame >= gh.restraint.until || t.state !== MoveState.Hitstun) {
      gh.restraint.target = 0;
    } else {
      t.vx = 0;
      t.vz = 0;
    }
  }
  stepGrenade(world);
  // Circulation: with every pump Critical or worse, aquatic assets drain (bounded).
  const D = rules().drain;
  if (!circulating(gh) && world.frame >= gh.stableUntil && world.frame % D.every === 0) {
    for (const a of gh.assets) {
      const k = kindDef(a);
      if (!k.aquatic || a.state === AssetState.Lost) continue;
      if (a.condition * 100 <= k.condition * D.floor) continue;
      a.condition -= 1;
      a.state = stateFor(a);
      gh.record.drained += 1;
    }
  }
  for (const h of heroes) {
    const c = gh.channel[h.slot];
    if (c && c.kind !== GhChannel.None && h.state !== MoveState.Channel) c.kind = GhChannel.None;
  }
}

/**
 * Layered Pantry: a hero who walks over an item eats it when it helps (Health, Defense or
 * Attack Bar below the maximum); values clamp; Health follows the difficulty's recovery
 * percent. Each item is taken once (lower ids first, the hero with the lower slot first).
 */
function stepPantry(world: World, heroes: readonly Fighter[]): void {
  const gh = world.greenhouse!;
  const reach = GREENHOUSE!.pantryReach;
  const pct = DIFFICULTIES[gh.difficulty]?.recovery ?? 100;
  for (const p of gh.pantry) {
    if (p.taken) continue;
    const def = GREENHOUSE!.pantry[p.item]!;
    const h = heroes.find(
      (x) =>
        !busy(x) &&
        Math.abs(x.x - p.x) <= reach.x &&
        Math.abs(x.z - p.z) <= reach.z &&
        ((def.health > 0 && x.health < x.maxHealth) ||
          (def.defense > 0 && x.defense < DEFENSE.max) ||
          (def.meter > 0 && x.meter < METER.max)),
    );
    if (!h) continue;
    p.taken = true;
    p.by = h.id;
    h.health = Math.min(h.maxHealth, h.health + Math.trunc((def.health * pct) / 100));
    h.defense = Math.min(DEFENSE.max, h.defense + def.defense);
    h.meter = Math.min(METER.max, h.meter + def.meter);
    gh.record.eaten += 1;
    log(world, GhEvent.Ate, p.id, h.id);
  }
}

/**
 * Irrigation purge jet: Warn (telegraph), then Active along the current lane: everyone in
 * it is pushed away from the valve once; enemies also take the authored damage. A purge
 * clears the pump a little. Then a cooldown.
 */
function stepJet(world: World): void {
  const gh = world.greenhouse!;
  const j = gh.jet;
  const def = roomOf(gh).jet;
  if (!j || !def) return;
  const since = world.frame - j.frame;
  if (j.phase === JetPhase.Warn && since >= def.warn) {
    j.phase = JetPhase.Active;
    j.frame = world.frame;
    gh.record.purges += 1;
    for (const a of gh.assets) if (kindDef(a).circulation) restore(world, a, def.restore);
    log(world, GhEvent.JetFire, j.lane);
    return;
  }
  if (j.phase === JetPhase.Active) {
    const lane = def.lanes[j.lane] ?? def.lanes[0]!;
    for (const t of [...world.bodies].sort((a, b) => a.id - b.id)) {
      if (busy(t) || t.protectedRecovery || j.hits.includes(t.id) || t.y > fx(150)) continue;
      if (t.x < lane.x0 || t.x > lane.x1 || t.z < lane.z0 || t.z > lane.z1) continue;
      if (t.state === MoveState.Down || t.state === MoveState.GetUp) continue;
      j.hits.push(t.id);
      const dir = t.x >= def.x ? 1 : -1;
      if (t.team === 'hero') {
        interrupt(t);
        t.vx = dir * def.push;
        t.vz = 0;
        enter(t, MoveState.Hitstun, 16);
        continue;
      }
      knock(world, t, dir, t.id === GRENADIER_ID ? 0 : def.damage, def.push, fx(4));
    }
    if (since >= def.active) {
      j.phase = JetPhase.Cooldown;
      j.frame = world.frame;
    }
    return;
  }
  if (j.phase === JetPhase.Cooldown && since >= def.cooldown) {
    j.phase = JetPhase.Ready;
    j.frame = world.frame;
    j.hits = [];
  }
}

// --- encoding ------------------------------------------------------------------------------

/** Canonical encoding (part of the world hash and snapshots). */
export function encodeGreenhouse(w: ByteWriter, gh: Greenhouse | null): void {
  w.u8(gh ? 1 : 0);
  if (!gh) return;
  w.u32(gh.room);
  w.u32(gh.difficulty);
  w.u32(gh.assets.length);
  for (const a of gh.assets) {
    w.u32(a.id);
    w.u32(a.kind);
    w.i32(a.x);
    w.i32(a.z);
    w.i32(a.condition);
    w.u8(a.state);
    w.i32(a.guardUntil);
    w.u32(a.hits);
    w.u32(a.damage);
  }
  w.u32(gh.containers.length);
  for (const c of gh.containers) {
    w.u32(c.id);
    w.u32(c.kind);
    w.i32(c.x);
    w.i32(c.z);
    w.u8(c.opened ? 1 : 0);
    w.i32(c.integrity);
    w.u32(c.by);
  }
  w.u32(gh.pantry.length);
  for (const p of gh.pantry) {
    w.u32(p.id);
    w.u32(p.item);
    w.i32(p.x);
    w.i32(p.z);
    w.u8(p.taken ? 1 : 0);
    w.u32(p.by);
  }
  w.u32(gh.nextProp);
  w.u32(gh.shutterId);
  w.u32(gh.shutterImpacts);
  w.u8(gh.rack ? 1 : 0);
  if (gh.rack) {
    w.u8(gh.rack.state);
    w.i32(gh.rack.power);
    w.u8(gh.rack.spawned ? 1 : 0);
    w.i32(gh.rack.since);
  }
  w.u8(gh.jet ? 1 : 0);
  if (gh.jet) {
    w.u8(gh.jet.phase);
    w.i32(gh.jet.frame);
    w.u8(gh.jet.lane);
    w.u32(gh.jet.hits.length);
    for (const id of gh.jet.hits) w.u32(id);
  }
  w.u8(gh.redirect ? 1 : 0);
  if (gh.redirect) {
    w.i32(gh.redirect.progress);
    w.i32(gh.redirect.ready);
  }
  w.u8(gh.restraint ? 1 : 0);
  if (gh.restraint) {
    w.u32(gh.restraint.target);
    w.i32(gh.restraint.until);
    w.i32(gh.restraint.ready);
  }
  const g = gh.grenade;
  w.u8(g ? 1 : 0);
  if (g) {
    w.u8(g.phase);
    w.i32(g.frame);
    w.u32(g.item);
    w.u8(g.armed ? 1 : 0);
    w.i32(g.fuse);
    for (const v of [g.aimX, g.aimZ, g.x, g.z, g.y, g.vx, g.vz, g.vy]) w.i32(v);
    w.u8(g.returned ? 1 : 0);
    w.i32(g.nextAt);
    w.u32(g.rounds);
  }
  w.i32(gh.stableUntil);
  for (const c of gh.channel) {
    w.u8(c.kind);
    w.u32(c.target);
    w.i32(c.progress);
  }
  for (const v of Object.values(gh.record)) w.u32(v);
  w.u8(gh.log.kind);
  w.u32(gh.log.frame);
  w.i32(gh.log.a);
  w.i32(gh.log.b);
}

/** Lab and HUD: is this fighter the restraint's current target? */
export function restrained(world: World, f: Fighter): boolean {
  const r = world.greenhouse?.restraint;
  return !!r && r.target === f.id && world.frame < r.until;
}

/** Enemy profile check used by the Lab lines (the thrower has no profile). */
export function isDrillBody(f: Fighter): boolean {
  return f.id === GRENADIER_ID && profileOf(f) === null;
}
