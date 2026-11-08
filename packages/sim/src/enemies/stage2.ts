import { fx } from '../math/fixed';
import {
  AiMode,
  type Axis,
  EncEvent,
  type Fighter,
  type FrameInput,
  GunLost,
  type Item,
  ItemState,
  MoveState,
  Order,
  Special,
  Verdict,
  type World,
} from '../world/types';
import { type ActionDef, type AiAttackDef, CallKind, type EnemyProfile } from '../combat/types';
import { ENEMY_VARIANTS } from '../combat/heroes.gen';
import { ENEMIES, kitOf } from '../combat/roster';
import { WEAPONS, weaponIndex } from '../combat/armory';
import { claim, heldItem, spawnItem } from '../combat/held';
import { startAction } from '../combat/actions';
import { enter, interrupt } from '../combat/reactions';
import { nonCombatant } from '../combat/damage';
import { ARENAS, actionIndex, bossPhase, enemyKitIndex, livingHeroes, profileOf } from './data';
import { judge, logDecision, release, reserve, usage, visible } from './director';
import { bossOf, isBoss, spawnEnemy, startStagger } from './boss';
import {
  AssetState,
  GREENHOUSE,
  GrenadePhase,
  ROOMS,
  forceAsset,
  stepGrenadier,
} from '../preservation/greenhouse';
import { face, paced, raiseGuard, walkTo } from './ai';

/**
 * M19 Stage 2 roles (Stage 2 spec §11, §12): difficulty variants, firearm rules for the
 * Revolver Marauder and Marek, the Systems Saboteur's Control Breach and grenade, the Jackal
 * Signalman's calls, the Black-Iron Enforcer's Lockstep Escort, the Road Rider's dismounted
 * entry and Marek's armed phase, Scorched Claim and capture. Every number is a Combat Lab
 * candidate.
 */
export const S2 = {
  /** Escort threat and range of an ordered ally without its own escort profile (a Reaver). */
  escortThreat: 12,
  escortRange: fx(700),
  /** Frames of a self-started escort, and the pause before the next one. */
  escortFrames: 420,
  escortRest: 240,
  /** The escort's place in front of the specialist, towards the hero. */
  escortGap: fx(120),
  /** A hero this close in front ends the escort (the escort attacks instead). */
  escortClose: fx(190),
  /** Crossfang: depth offset and stand-off of the two allies. */
  crossfangDepth: fx(110),
  crossfangGap: fx(150),
  /** Frames between two calls of any Signalman, and an ally's reach for a call. */
  callGap: 120,
  callRange: fx(1000),
  /** An ally below this Health percent may be replaced. */
  wounded: 50,
  /** A warned reserve entry shows its warning this long before the enemy steps in. */
  entryWarn: 90,
  /** Stand-off from a control or the scorch target while working it. */
  objectiveReach: fx(90),
  /** Extra Resolve damage when Scorched Claim is interrupted. */
  scorchResolve: 60,
  /** Frames of the forced capture's last attempt (harmless presentation). */
  lastAttempt: 60,
  /** A Road Rider on foot arrives knocked down for this long, with protected recovery. */
  dismountDown: 50,
  /** A Saboteur with the room's grenade throws at a hero within this distance. */
  grenadeRange: fx(800),
  /** Frames Marek lies knocked down after a broken intercept (the earned opening). */
  opening: 90,
  /** Marek reclaims his dropped gun after a Stagger Break only within this distance. */
  reclaim: fx(220),
  /** An interrupted summon (Command Pressure) is ready again after this many frames. */
  summonRetry: 240,
  /** Resolve percent of a firearm hit on the boss (others: by category). */
  firearmResolve: 120,
} as const;

const BREACH_STEPS = ['breach-access', 'breach-tamper', 'breach-commit'] as const;

function sign(v: number): Axis {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function event(world: World, kind: number, a = 0, b = 0): void {
  const enc = world.encounter;
  if (enc) enc.event = { kind, frame: world.frame, a, b };
}

// --- variants ----------------------------------------------------------------------------

/** The kit of `kit` at a difficulty: its strongest variant allowed there, else the base. */
export function variantKit(kit: string, difficulty: number): number {
  let id = kit;
  for (const [v, min] of ENEMY_VARIANTS[kit] ?? []) if (difficulty >= min) id = v;
  return enemyKitIndex(id);
}

/** The base kit id of an enemy (its art key; variants share their base's look). */
export function baseKitId(f: Fighter): string {
  const k = ENEMIES[f.hero];
  return k?.art ?? k?.id ?? '';
}

// --- firearms ----------------------------------------------------------------------------

export function isFirearm(item: Item): boolean {
  return WEAPONS[item.def]?.class === 'firearm';
}

/** The firearm in this fighter's hands, if any. */
export function firearmOf(world: World, f: Fighter): Item | undefined {
  const item = heldItem(world, f);
  return item && isFirearm(item) ? item : undefined;
}

/** May this enemy take this item (Stage 2 roles never take firearms or the grenade)? */
export function mayTake(f: Fighter, prof: EnemyProfile, item: Item): boolean {
  if (!isFirearm(item)) return true;
  if (prof.firearms) return true;
  // A Revolver Marauder reclaims only its own loaded sidearm.
  return !!prof.armed && item.lastHolder === f.id && item.ammo > 0;
}

/** An armed profile starts with its weapon in hand (rounds by difficulty). */
export function armOnSpawn(world: World, f: Fighter): void {
  const prof = profileOf(f);
  const enc = world.encounter;
  if (!prof?.armed || !enc) return;
  const item = spawnItem(world, weaponIndex(prof.armed.weapon), f.x, f.z);
  item.ammo = prof.armed.ammo[enc.difficulty] ?? item.ammo;
  claim(world, f, item);
}

/**
 * Attack slots that do not apply now (skipped, not refused): armed-only or unarmed-only
 * slots, rounds the held firearm does not have, the Empty Cast while rounds remain, a
 * summon already used, a call outside the call logic.
 */
export function attackSkipped(world: World, f: Fighter, at: AiAttackDef, a: ActionDef): boolean {
  const gun = firearmOf(world, f);
  if (at.when === 1 && !gun) return true;
  if (at.when === 2 && gun) return true;
  if (a.ammo > 0 && !(gun && gun.ammo >= a.ammo)) return true;
  if (a.category === 'weaponThrow' && gun && gun.ammo > 0 && profileOf(f)?.armed) return true;
  const ph = bossPhase(world, f);
  if (ph && ph.summon !== '' && ph.summon === at.action && world.encounter!.boss!.summoned)
    return true;
  if (!ph && a.tags.includes('command')) return true;
  return false;
}

/** An enemy's action spends the held firearm's real rounds (own actions included). */
export function spendAmmo(world: World, f: Fighter, a: ActionDef): void {
  // The boss's summon is a call: interrupted, it comes back soon (see specialInterrupted).
  if (a.tags.includes('command') && isBoss(world, f)) f.special = Special.Summon;
  if (a.ammo <= 0) return;
  const gun = firearmOf(world, f);
  if (!gun) return;
  gun.ammo = Math.max(0, gun.ammo - a.ammo);
  const b = world.encounter?.boss;
  if (b && b.id === f.id) b.gunAmmo = gun.ammo;
}

/** Puts a held item down at the fighter's feet. */
export function dropHeld(world: World, f: Fighter, ahead = fx(50)): Item | undefined {
  const item = heldItem(world, f);
  if (!item) return undefined;
  item.state = ItemState.Ground;
  item.holder = 0;
  item.x = Math.max(
    world.bounds.minX + fx(30),
    Math.min(world.bounds.maxX - fx(30), f.x + f.facing * ahead),
  );
  item.z = f.z;
  item.y = 0;
  item.vx = 0;
  item.vy = 0;
  f.item = 0;
  f.wkit = -1;
  return item;
}

/**
 * The input an AI action's `depthFrom: input` moves read: evasions move away from the
 * target in depth (towards open floor), other moves towards it.
 */
export function aiInput(world: World, f: Fighter, a: ActionDef): FrameInput {
  const t = world.bodies.find((b) => b.id === f.targetId);
  let z: Axis = 0;
  if (t) {
    if (a.tags.includes('evade')) {
      z = sign(f.z - t.z) || 1;
      if (z > 0 && f.z >= world.bounds.maxZ - fx(40)) z = -1;
      if (z < 0 && f.z <= world.bounds.minZ + fx(40)) z = 1;
    } else z = sign(t.z - f.z);
  }
  return { moveX: 0, moveZ: z, pressed: 0, held: 0, dirPressed: 0 };
}

// --- morale ------------------------------------------------------------------------------

/**
 * The Health percent at which this enemy's morale breaks now: its authored `breakAt`, the
 * higher `shaken` threshold once it is isolated, disarmed, shaken or interrupted twice,
 * and command collapse (everyone) once the boss is captured.
 */
export function moraleAt(world: World, f: Fighter, prof: EnemyProfile): number {
  const b = world.encounter?.boss;
  if (b && b.capture > 0 && b.id !== f.id) return 101;
  let at = prof.breakAt;
  if (prof.shaken > 0) {
    const isolated = !world.bodies.some(
      (e) => e.team === 'enemy' && e.id !== f.id && profileOf(e) && !e.ko && !nonCombatant(e),
    );
    const disarmed = !!prof.armed && f.item === 0;
    if (f.shaken || f.interrupts >= 2 || isolated || disarmed) at = Math.max(at, prof.shaken);
  }
  return at;
}

// --- shared helpers ----------------------------------------------------------------------

function free(world: World, e: Fighter): boolean {
  const p = profileOf(e);
  return (
    !!p &&
    !e.ko &&
    !nonCombatant(e) &&
    e.threat === 0 &&
    e.order === Order.None &&
    e.special === Special.None &&
    !isBoss(world, e) &&
    p.role !== 'commander' &&
    (e.state === MoveState.Idle || e.state === MoveState.Walk || e.state === MoveState.Guard)
  );
}

function specialist(e: Fighter): boolean {
  const p = profileOf(e);
  return !!p && (p.role === 'objective' || (p.role === 'ranged' && !!p.armed));
}

function canEscort(e: Fighter): boolean {
  return !!profileOf(e)?.escort || baseKitId(e) === 'reaver';
}

function escorted(world: World, spec: Fighter): boolean {
  return world.bodies.some((e) => e.order === Order.Escort && e.orderTarget === spec.id);
}

function distance(a: Fighter, b: Fighter): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

// --- special actions: start, interruption, completion ------------------------------------

/**
 * A special action (breach step, call, Scorched Claim, the boss's summon) that stopped
 * before its end was interrupted: the role's consequence follows. Called on the first
 * actionable frame afterwards.
 */
export function specialInterrupted(world: World, f: Fighter): void {
  const enc = world.encounter;
  const kind = f.special;
  f.special = Special.None;
  if (!enc) return;
  switch (kind) {
    case Special.Breach: {
      f.interrupts += 1;
      if (enc.sabotage === f.id) enc.sabotage = 0;
      event(world, EncEvent.BreachStopped, f.id, f.breach);
      f.breach = 1;
      f.objectiveAt = world.frame + paced(world, profileOf(f)?.objective?.cooldown ?? 300);
      // Exit Route: a depth retreat with no invulnerability.
      const i = actionIndex(f, 'exit-route');
      if (i >= 0 && f.state === MoveState.Idle) {
        startAction(f, i);
        f.aiAttack = -1;
      }
      return;
    }
    case Special.Call: {
      f.interrupts += 1;
      if (enc.call === f.id) enc.call = 0;
      enc.callReadyAt = world.frame + S2.callGap;
      event(world, EncEvent.CallBroken, f.id, f.callKind);
      f.callKind = 0;
      const i = actionIndex(f, 'signal-break');
      if (i >= 0 && f.state === MoveState.Idle) {
        startAction(f, i);
        f.aiAttack = -1;
      }
      return;
    }
    case Special.Scorch: {
      const b = enc.boss;
      const ph = bossPhase(world, f);
      if (!b) return;
      b.scorch = 2;
      b.scorchStops += 1;
      b.scorchAt = world.frame + paced(world, ph?.scorch?.cooldown ?? 420);
      event(world, EncEvent.ScorchStopped, f.id);
      if (b.stagger === 0 && b.shift === 0) {
        b.resolve = Math.max(0, b.resolve - S2.scorchResolve);
        if (b.resolve === 0) startStagger(world, f);
      }
      return;
    }
    case Special.Summon: {
      // An interrupted Command Pressure is tried again soon (the pair still comes once).
      const ph = bossPhase(world, f);
      const slot = ph ? ph.attacks.findIndex((at) => at.action === ph.summon) : -1;
      if (slot >= 0 && slot < f.readyAt.length) f.readyAt[slot] = world.frame + S2.summonRetry;
      event(world, EncEvent.CallBroken, f.id, 0);
      return;
    }
    default:
      return;
  }
}

/** A special action ran to its end: the breach step, the call, the scorch or the summon. */
export function completeSpecial(world: World, f: Fighter, a: ActionDef): void {
  const enc = world.encounter;
  const kind = f.special;
  f.special = Special.None;
  if (!enc) return;
  if (kind === Special.Breach) {
    const obj = profileOf(f)?.objective;
    if (f.breach < 3) {
      f.breach += 1;
      event(world, EncEvent.BreachStep, f.id, f.breach);
      return;
    }
    const idx = f.breachAsset - 1;
    forceAsset(world, idx, false);
    enc.breached.push(idx);
    if (enc.sabotage === f.id) enc.sabotage = 0;
    f.breach = 0;
    f.breachAsset = 0;
    f.objectiveAt = world.frame + paced(world, obj?.cooldown ?? 300);
    event(world, EncEvent.BreachDone, f.id, idx);
    return;
  }
  if (kind === Special.Call) {
    applyCall(world, f);
    return;
  }
  if (kind === Special.Summon) {
    summonSupports(world, f);
    return;
  }
  if (kind === Special.Scorch) {
    const b = enc.boss;
    const gh = world.greenhouse;
    if (!b || !gh) return;
    forceAsset(world, ROOMS[gh.room]!.scorch, true);
    b.scorch = 3;
    event(world, EncEvent.ScorchDone, f.id);
    return;
  }
  if (a.tags.includes('command') && isBoss(world, f)) summonSupports(world, f);
}

// --- Systems Saboteur --------------------------------------------------------------------

/**
 * The Saboteur's grenade (rooms authored `grenade: saboteur`): the room's first Saboteur
 * runs the M18 Remove, Arm, Aim and Release sequence once. Returns true while it does.
 * Runs before defense planning: a guard would interrupt the sequence.
 */
export function grenadeTurn(world: World, f: Fighter): boolean {
  const gh = world.greenhouse;
  const g = gh?.grenade;
  const prof = profileOf(f);
  if (!gh || !g || !prof?.objective || !ROOMS[gh.room]?.saboteurGrenade) return false;
  if (f.threat > 0 || f.special !== Special.None) return false;
  if (g.thrower !== 0 && g.thrower !== f.id) return false;
  if (g.thrower === 0) {
    if (g.rounds > 0 || !visible(world, f)) return false;
    const near = livingHeroes(world).some((h) => distance(h, f) <= S2.grenadeRange);
    if (!near) return false;
    g.thrower = f.id;
    g.nextAt = 0;
  }
  if (g.rounds > 0 && g.phase === GrenadePhase.Wait) return false;
  if (g.phase >= GrenadePhase.Lob) return false;
  f.aiMode = AiMode.Objective;
  stepGrenadier(world, f);
  return true;
}

/**
 * Control Breach (Interruptible Objective Specialist): one sabotage per room at a time,
 * each control at most once. The Saboteur walks to its control and runs Access, Tamper and
 * Commit, each a separate visible action that asks the director for its threat. Returns
 * true while it works the objective.
 */
export function stepSaboteur(
  world: World,
  f: Fighter,
  prof: EnemyProfile,
  target: Fighter,
): boolean {
  const obj = prof.objective;
  const enc = world.encounter;
  const gh = world.greenhouse;
  if (!obj || !enc || !gh || f.threat > 0 || world.frame < f.objectiveAt) return false;
  if (enc.sabotage !== 0 && enc.sabotage !== f.id) return false;
  let idx = f.breachAsset - 1;
  const usable = (i: number) => {
    const a = gh.assets[i];
    if (!a || enc.breached.includes(i)) return false;
    if (a.state === AssetState.Lost || a.state === AssetState.Fallback) return false;
    return true;
  };
  if (idx < 0 || !usable(idx)) {
    idx = -1;
    let best = 0;
    gh.assets.forEach((a, i) => {
      if (!controlKind(world, a.kind) || !usable(i)) return;
      const d = Math.abs(a.x - f.x) + Math.abs(a.z - f.z);
      if (idx < 0 || d < best) {
        idx = i;
        best = d;
      }
    });
    if (idx < 0) {
      f.breachAsset = 0;
      if (enc.sabotage === f.id) enc.sabotage = 0;
      return false;
    }
    f.breachAsset = idx + 1;
    f.breach = 1;
  }
  const step = Math.max(1, Math.min(3, f.breach));
  const index = actionIndex(f, BREACH_STEPS[step - 1]!);
  if (index < 0) return false;
  const act = kitOf(f)!.actions[index]!;
  const verdict = judge(world, f, act, obj.threat, target.id);
  if (verdict !== Verdict.Ok) return false;
  enc.sabotage = f.id;
  f.aiMode = AiMode.Objective;
  const a = gh.assets[idx]!;
  const side: Axis = f.x <= a.x ? -1 : 1;
  if (!walkTo(f, prof, a.x + side * S2.objectiveReach, a.z + fx(10), fx(14), fx(10))) return true;
  f.facing = side > 0 ? -1 : 1;
  reserve(world, f, act, obj.threat, target.id);
  startAction(f, index);
  f.aiAttack = -1;
  f.special = Special.Breach;
  f.breach = step;
  logDecision(world, f, index, Verdict.Ok);
  event(world, EncEvent.BreachStep, f.id, step);
  return true;
}

function controlKind(world: World, kind: number): boolean {
  return !!world.greenhouse && !!GH_LEDGER()[kind]?.control;
}

/** The Ledger kinds (lazy, avoids an import cycle at module load). */
const GH_LEDGER = () => GREENHOUSE?.ledger ?? [];

// --- Jackal Signalman --------------------------------------------------------------------

/** Command slots use the top of the per-attack cooldown table. */
const commandSlot = (i: number) => 7 - i;

function callApplies(world: World, f: Fighter, kind: number, target: Fighter): boolean {
  const enc = world.encounter!;
  const allies = world.bodies.filter(
    (e) =>
      e.team === 'enemy' && e.id !== f.id && free(world, e) && distance(e, target) <= S2.callRange,
  );
  if (kind === CallKind.Crossfang) return allies.length >= 2;
  if (kind === CallKind.Guard)
    return (
      allies.some(canEscort) &&
      world.bodies.some((e) => specialist(e) && !e.ko && !nonCombatant(e) && !escorted(world, e))
    );
  if (kind === CallKind.Replace) {
    const reserve = ARENAS[enc.arena]?.reserve ?? [];
    return (
      enc.reserveUsed < reserve.length &&
      enc.entryKit < 0 &&
      allies.some((e) => e.health * 100 < S2.wounded * e.maxHealth)
    );
  }
  return false;
}

/**
 * Visible Call-and-Response: one call at a time in the room, never during a boss
 * transition or a group attack. The raised-arm startup reserves the call's threat; a hit,
 * throw or enough control before it confirms breaks it (Signal Break follows).
 */
export function tryCall(world: World, f: Fighter, prof: EnemyProfile, target: Fighter): boolean {
  const enc = world.encounter;
  if (!enc || prof.commands.length === 0 || f.threat > 0) return false;
  if (enc.call !== 0 || world.frame < enc.callReadyAt) return false;
  const b = enc.boss;
  if (b && (b.shift > 0 || b.pending)) return false;
  if (usage(world).group || !visible(world, f)) return false;
  const n = prof.commands.length;
  for (let k = 0; k < n; k += 1) {
    const i = (f.aiStep + k) % n;
    const c = prof.commands[i]!;
    if (c.minDifficulty > enc.difficulty) continue;
    if (world.frame < (f.readyAt[commandSlot(i)] ?? 0)) continue;
    if (!callApplies(world, f, c.kind, target)) continue;
    const index = actionIndex(f, c.action);
    if (index < 0) continue;
    const a = kitOf(f)!.actions[index]!;
    const verdict = judge(world, f, a, c.threat, target.id);
    logDecision(world, f, index, verdict);
    if (verdict !== Verdict.Ok) return false;
    reserve(world, f, a, c.threat, target.id);
    face(f, target.x);
    startAction(f, index);
    f.aiAttack = -1;
    f.aiStep += 1;
    f.special = Special.Call;
    f.callKind = c.kind;
    f.readyAt[commandSlot(i)] = world.frame + paced(world, c.cooldown);
    enc.call = f.id;
    event(world, EncEvent.Call, f.id, c.kind);
    return true;
  }
  return false;
}

function commandOf(f: Fighter, kind: number) {
  return profileOf(f)?.commands.find((c) => c.kind === kind);
}

/** The confirmed call takes effect. */
function applyCall(world: World, f: Fighter): void {
  const enc = world.encounter!;
  const kind = f.callKind;
  f.callKind = 0;
  if (enc.call === f.id) enc.call = 0;
  enc.callReadyAt = world.frame + S2.callGap;
  const target = world.bodies.find((b) => b.id === f.targetId);
  const c = commandOf(f, kind);
  if (!target || !c) return;
  const allies = world.bodies
    .filter((e) => e.team === 'enemy' && e.id !== f.id && free(world, e))
    .sort((p, q) => distance(p, target) - distance(q, target) || p.id - q.id);
  if (kind === CallKind.Crossfang) {
    // Two allies close from opposite depth sides; each still asks the director.
    allies.slice(0, 2).forEach((e, i) => {
      e.order = Order.Crossfang;
      e.orderTarget = target.id;
      e.orderSide = i === 0 ? -1 : 1;
      e.orderAt = world.frame;
      e.orderUntil = world.frame + c.frames;
      e.targetId = target.id;
    });
  } else if (kind === CallKind.Guard) {
    const escort = allies.find(canEscort);
    const spec = world.bodies
      .filter((e) => specialist(e) && !e.ko && !nonCombatant(e) && !escorted(world, e))
      .sort((p, q) => (escort ? distance(p, escort) - distance(q, escort) : 0) || p.id - q.id)[0];
    if (escort && spec) startEscort(world, escort, spec, c.frames, target);
  } else if (kind === CallKind.Replace) {
    const wounded = allies.find((e) => e.health * 100 < S2.wounded * e.maxHealth);
    const reserveList = ARENAS[enc.arena]?.reserve ?? [];
    const kit = reserveList[enc.reserveUsed];
    if (!wounded || !kit) return;
    // The wounded raider withdraws as it is (no healing, no new Health).
    release(wounded);
    interrupt(wounded);
    enter(wounded, MoveState.Flee, 0);
    enc.reserveUsed += 1;
    // The finite reserve enters through a warned edge, away from the target.
    const left = target.x - enc.viewMin > enc.viewMax - target.x;
    enc.entryKit = variantKit(kit, enc.difficulty);
    enc.entryX = left
      ? Math.max(world.bounds.minX + fx(40), enc.viewMin + fx(40))
      : Math.min(world.bounds.maxX - fx(40), enc.viewMax - fx(40));
    enc.entryZ = target.z;
    enc.entryAt = world.frame + S2.entryWarn;
    event(world, EncEvent.ReserveWarn, enc.entryX, enc.entryKit);
    return;
  }
  event(world, EncEvent.CallDone, f.id, kind);
}

// --- Lockstep Escort ---------------------------------------------------------------------

function startEscort(
  world: World,
  e: Fighter,
  spec: Fighter,
  frames: number,
  target: Fighter,
): boolean {
  const p = profileOf(e)!;
  const threat = p.escort?.threat ?? S2.escortThreat;
  const index = actionIndex(e, p.attacks[0]?.action ?? '');
  const a = kitOf(e)!.actions[index];
  if (!a) return false;
  if (judge(world, e, a, threat, target.id, 0, 0) !== Verdict.Ok) return false;
  reserve(world, e, a, threat, target.id, 0);
  e.order = Order.Escort;
  e.orderTarget = spec.id;
  e.orderAt = world.frame;
  e.orderUntil = world.frame + frames;
  e.targetId = target.id;
  event(world, EncEvent.Escort, e.id, spec.id);
  return true;
}

/** A Black-Iron Enforcer starts its own escort of a nearby specialist. */
export function tryEscort(world: World, f: Fighter, prof: EnemyProfile, target: Fighter): boolean {
  if (!prof.escort || f.order !== Order.None || f.threat > 0) return false;
  if (world.frame < f.objectiveAt) return false;
  if (Math.abs(target.x - f.x) <= S2.escortClose * 2) return false;
  const spec = world.bodies
    .filter(
      (e) =>
        specialist(e) &&
        !e.ko &&
        !nonCombatant(e) &&
        !escorted(world, e) &&
        distance(e, f) <= prof.escort!.range,
    )
    .sort((p, q) => distance(p, f) - distance(q, f) || p.id - q.id)[0];
  if (!spec) return false;
  if (!startEscort(world, f, spec, S2.escortFrames, target)) return false;
  return stepOrder(world, f, prof, target);
}

function endOrder(world: World, f: Fighter): void {
  const wasEscort = f.order === Order.Escort;
  f.order = Order.None;
  f.orderTarget = 0;
  f.orderSide = 0;
  if (wasEscort) {
    release(f);
    f.objectiveAt = world.frame + S2.escortRest;
  }
}

/**
 * Orders in force: the escort walks between the hero and its specialist with its guard
 * up (attacking, being hit, the specialist leaving its range or the time running out end
 * it); Crossfang keeps an ally on its depth side (tactical movement reads it). Returns
 * true when the order took this frame.
 */
export function stepOrder(world: World, f: Fighter, prof: EnemyProfile, target: Fighter): boolean {
  if (f.order === Order.None) return false;
  if (world.frame >= f.orderUntil) {
    endOrder(world, f);
    return false;
  }
  if (f.order === Order.Crossfang) {
    const t = world.bodies.find((b) => b.id === f.orderTarget);
    if (!t || t.ko) endOrder(world, f);
    return false;
  }
  const spec = world.bodies.find((b) => b.id === f.orderTarget);
  const range = prof.escort?.range ?? S2.escortRange;
  const hit = f.lastHitFrame >= f.orderAt;
  const close =
    Math.abs(target.x - f.x) <= S2.escortClose &&
    Math.abs(target.z - f.z) <= fx(60) &&
    sign(target.x - f.x) === f.facing;
  if (!spec || spec.ko || nonCombatant(spec) || distance(spec, f) > range * 2 || hit || close) {
    endOrder(world, f);
    return false;
  }
  f.aiMode = AiMode.Hold;
  const side = sign(target.x - spec.x) || 1;
  walkTo(f, prof, spec.x + side * S2.escortGap, spec.z, fx(16), fx(10));
  face(f, target.x);
  if (Math.abs(target.x - f.x) <= fx(320) && f.defense > 0 && f.state !== MoveState.Guard)
    raiseGuard(world, f, target, prof.defense.guardHold, false);
  return true;
}

/** Crossfang's position: the target's depth side the order names (tactical reads it). */
export function crossfangSpot(
  world: World,
  f: Fighter,
  t: Fighter,
): { x: number; z: number } | null {
  if (f.order !== Order.Crossfang || f.orderTarget !== t.id || world.frame >= f.orderUntil)
    return null;
  const side = sign(f.x - t.x) || 1;
  return { x: t.x + side * S2.crossfangGap, z: t.z + f.orderSide * S2.crossfangDepth };
}

// --- encounter bookkeeping ---------------------------------------------------------------

/**
 * Once per frame: the warned reserve entry, and room-wide locks (a call, a sabotage) held
 * by an enemy that is gone or out of the fight.
 */
export function stepStage2(world: World): void {
  const enc = world.encounter;
  if (!enc) return;
  const gone = (id: number) => {
    const e = world.bodies.find((b) => b.id === id);
    return !e || e.ko || nonCombatant(e);
  };
  if (enc.call !== 0 && gone(enc.call)) enc.call = 0;
  if (enc.sabotage !== 0 && gone(enc.sabotage)) enc.sabotage = 0;
  if (enc.entryKit >= 0 && world.frame >= enc.entryAt) {
    const kit = enc.entryKit;
    enc.entryKit = -1;
    const e = spawnEnemy(world, kit, enc.entryX, enc.entryZ);
    armOnSpawn(world, e);
    event(world, EncEvent.ReserveIn, e.id, kit);
  }
}

/** A Road Rider on foot arrives knocked down at the room edge, with protected recovery. */
export function arrive(world: World, f: Fighter): void {
  const prof = profileOf(f);
  if (!prof) return;
  armOnSpawn(world, f);
  if (prof.entry === 'dismount') {
    enter(f, MoveState.Down, S2.dismountDown);
    f.protectedRecovery = true;
  }
}

// --- Marek -------------------------------------------------------------------------------

/**
 * The mounted intercept's outcome: broken into a safe crash, he arrives knocked down with
 * half his Resolve (the earned opening); forced to dismount, he walks in ready.
 */
export function intercepted(world: World, f: Fighter): void {
  const enc = world.encounter;
  const b = enc?.boss;
  if (!enc || !b || enc.opening === 0) return;
  b.intercept = enc.opening;
  if (enc.opening !== 1) return;
  b.resolve = Math.trunc(b.resolve / 2);
  enter(f, MoveState.Down, S2.opening);
  f.protectedRecovery = false;
}

/** The armed phase's gun goes into the boss's hands at the phase start (full rounds). */
export function armPhase(world: World, f: Fighter, weapon: string): void {
  const b = world.encounter!.boss!;
  const item = spawnItem(world, weaponIndex(weapon), f.x, f.z);
  claim(world, f, item);
  b.gunItem = item.id;
  b.gunAmmo = item.ammo;
  b.gunLost = GunLost.None;
  b.summoned = false;
}

function gunOf(world: World): Item | undefined {
  const b = world.encounter?.boss;
  if (!b || b.gunItem === 0) return undefined;
  return world.items.find((i) => i.id === b.gunItem);
}

/** A Stagger Break in the armed phase drops the gun at his feet for the heroes. */
export function staggerDrop(world: World, f: Fighter): void {
  const ph = bossPhase(world, f);
  if (!ph?.armed || !firearmOf(world, f)) return;
  dropHeld(world, f);
  event(world, EncEvent.Disarmed, f.id, 0);
}

/** After the window he takes his gun back if it still lies loaded at his feet. */
export function staggerReclaim(world: World, f: Fighter): void {
  const ph = bossPhase(world, f);
  const gun = gunOf(world);
  if (!ph?.armed || !gun || f.item !== 0) return;
  if (gun.state !== ItemState.Ground || gun.ammo <= 0) return;
  if (Math.abs(gun.x - f.x) > S2.reclaim || Math.abs(gun.z - f.z) > fx(80)) return;
  claim(world, f, gun);
}

/**
 * Armed Command ends when he no longer holds a loaded gun (disarmed, broken, or emptied
 * and tossed aside): the transition is queued like a Health threshold. The gun is never
 * replaced.
 */
export function checkDisarmed(world: World, f: Fighter): void {
  const enc = world.encounter;
  const b = enc?.boss;
  const ph = bossPhase(world, f);
  if (!b || !ph?.untilDisarmed || b.pending || b.stagger > 0 || b.shift > 0 || f.ko) return;
  const held = firearmOf(world, f);
  if (held && held.ammo > 0) return;
  const gun = gunOf(world);
  if (held && held.ammo <= 0) {
    // Emptied: he tosses it aside (the Empty Cast).
    dropHeld(world, f, fx(90));
    b.gunLost = GunLost.Emptied;
  } else if (!gun || gun.state === ItemState.Gone || gun.integrity <= 0) b.gunLost = GunLost.Broken;
  else b.gunLost = gun.ammo <= 0 ? GunLost.Emptied : GunLost.Disarmed;
  b.gunAmmo = gun && gun.state !== ItemState.Gone ? gun.ammo : 0;
  b.pending = true;
  b.pendingSince = world.frame;
  event(world, EncEvent.Disarmed, f.id, b.gunLost);
}

/** Leaving the armed phase: a gun still in his hands is tossed aside. */
export function disarmForPhase(world: World, f: Fighter): void {
  const gun = firearmOf(world, f);
  if (!gun) return;
  dropHeld(world, f, fx(90));
}

/** Command Pressure: the phase's support pair (and co-op extra) arrives once. */
export function summonSupports(world: World, f: Fighter): void {
  const enc = world.encounter!;
  const b = enc.boss!;
  if (b.summoned) return;
  const ph = bossPhase(world, f);
  if (!ph) return;
  b.summoned = true;
  spawnSupports(world, ph.supports, ph.eliteSupports, ph.coopSupports);
  event(world, EncEvent.Summon, f.id);
}

/** Spawns a phase's supports at the room edges (variants by difficulty). */
export function spawnSupports(
  world: World,
  supports: readonly string[],
  elite: readonly string[],
  coop: { minDifficulty: number; kits: readonly string[] } | null,
): void {
  const enc = world.encounter!;
  const kits = [...(enc.difficulty >= 2 ? elite : supports)];
  if (coop && enc.difficulty >= coop.minDifficulty && livingHeroes(world).length >= 2)
    kits.push(...coop.kits);
  kits.forEach((kit, i) => {
    const e = spawnEnemy(
      world,
      variantKit(kit, enc.difficulty),
      i % 2 === 0 ? world.bounds.minX + fx(60) : world.bounds.maxX - fx(60),
      fx(760 + (i % 2) * 140 + Math.trunc(i / 2) * 70),
    );
    armOnSpawn(world, e);
  });
}

/**
 * Scorched Claim (no phase, no refill): at low Health he walks to the room's authored
 * optional asset and runs a long interruptible action on it. Returns true while he does.
 */
export function stepScorch(world: World, f: Fighter, prof: EnemyProfile): boolean {
  const ph = bossPhase(world, f);
  const b = world.encounter?.boss;
  const gh = world.greenhouse;
  if (!ph?.scorch || !b || !gh || f.threat > 0) return false;
  if (b.scorch === 1 || b.scorch === 3 || world.frame < b.scorchAt) return false;
  if (f.health * 100 > ph.scorch.below * f.maxHealth) return false;
  const idx = ROOMS[gh.room]?.scorch ?? -1;
  const a = gh.assets[idx];
  if (!a || a.state === AssetState.Lost) return false;
  const index = actionIndex(f, ph.scorch.action);
  if (index < 0) return false;
  f.aiMode = AiMode.Objective;
  const side: Axis = f.x <= a.x ? -1 : 1;
  if (!walkTo(f, prof, a.x + side * S2.objectiveReach, a.z + fx(10), fx(14), fx(10))) return true;
  f.facing = side > 0 ? -1 : 1;
  startAction(f, index);
  f.aiAttack = -1;
  f.special = Special.Scorch;
  if (b.scorch === 0) event(world, EncEvent.ScorchStart, f.id);
  else event(world, EncEvent.ScorchStart, f.id, 1);
  b.scorch = 1;
  return true;
}

/**
 * Capture (no execution): a Resolve break at or below the surrender line, or a final blow
 * inside a Stagger window, is the clean Resolve surrender (1); Health 0 while Resolve
 * remains is the forced capture (2), a short harmless last attempt first. Every enemy
 * still in the room loses its nerve (command collapse).
 */
export function capture(world: World, f: Fighter, kind: number): void {
  const b = world.encounter?.boss;
  if (!b || b.capture !== 0) return;
  b.capture = kind;
  b.captureAt = world.frame;
  if (firearmOf(world, f)) dropHeld(world, f);
  event(world, EncEvent.Capture, f.id, kind);
}

/** A Resolve break at or below the surrender line ends the fight at once. */
export function resolveSurrender(world: World, f: Fighter): boolean {
  const prof = profileOf(f)?.boss;
  const b = world.encounter?.boss;
  if (!prof?.capture || !b || prof.surrender <= 0) return false;
  if (f.health * 100 > prof.surrender * f.maxHealth) return false;
  capture(world, f, 1);
  interrupt(f);
  f.ko = true;
  f.y = 0;
  f.vy = 0;
  f.vx = 0;
  f.vz = 0;
  f.threat = 0;
  enter(f, MoveState.Surrender, 0);
  return true;
}

/** Health ran out: which capture this is (recorded at the final blow). */
export function finalBlow(world: World, f: Fighter): void {
  const prof = profileOf(f)?.boss;
  const b = world.encounter?.boss;
  if (!prof?.capture || !b || b.id !== f.id) return;
  capture(world, f, b.stagger > 0 || b.resolve === 0 ? 1 : 2);
}

/** The boss's kit look now (1–4): phase look, Scorched Claim look, captured look. */
export function marekLook(world: World, f: Fighter, phaseLook: number): number {
  const b = world.encounter?.boss;
  if (!b || b.id !== f.id) return phaseLook;
  if (b.capture > 0) return 4;
  const ph = bossPhase(world, f);
  if (ph?.scorch && b.scorch !== 0) return ph.scorch.look;
  return phaseLook;
}

export { bossOf };
