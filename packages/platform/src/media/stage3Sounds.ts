/**
 * M27 Stage 3 gameplay sounds (Stage 3 spec §16.3, roadmap M27 "hook Stage 3 sounds into
 * gameplay"): which of the coded Stage 3 recipes (stage3sfx.ts) a snapshot change plays.
 * Like the presentation tracker it only reads snapshots, remembers what it has already
 * sounded (by frame and id, so a repeated or re-simulated frame never plays twice) and
 * forgets everything on a new world. Pure: the game plays the returned ids.
 */
import {
  BreakState,
  type Breakable,
  ENEMIES,
  type Fighter,
  type Item,
  ItemState,
  MoveState,
  MoverPhase,
  type SharedState,
  SharedEvent,
  WEAPONS,
  kitOf,
  phaseOf,
  routeAction,
} from '@ffp/sim';
import type { SfxCategory } from './mixer';
import { STAGE3_SFX } from './codedSfx';

export interface Stage3Sound {
  id: string;
  category: SfxCategory;
}

/** Sounds at the start of an action (weapon swings, enemy tells, Garran's moves). */
export const ACTION_START: Readonly<Record<string, string>> = {
  // Hero weapons (and Garran with his Hookstaff).
  'hike-thrust': 'sfx.staff.swing',
  'hike-sweep': 'sfx.staff.swing',
  'hike-hook': 'sfx.staff.swing',
  'hike-lunge': 'sfx.staff.swing',
  'hike-rise': 'sfx.staff.swing',
  'hike-low': 'sfx.staff.swing',
  'hike-air': 'sfx.staff.swing',
  'hike-ground': 'sfx.staff.swing',
  'hike-dash': 'sfx.staff.swing',
  'axe-flat': 'sfx.axe.swing',
  'axe-haft': 'sfx.axe.swing',
  'axe-cleave': 'sfx.axe.swing',
  'axe-hook': 'sfx.axe.swing',
  'axe-rise': 'sfx.axe.swing',
  'axe-low': 'sfx.axe.swing',
  'axe-air': 'sfx.axe.swing',
  'axe-ground': 'sfx.axe.chop',
  'axe-dash': 'sfx.axe.swing',
  'hammer-shove': 'sfx.hammer.swing',
  'hammer-drop': 'sfx.hammer.swing',
  'hammer-swing': 'sfx.hammer.swing',
  'hammer-hook': 'sfx.hammer.swing',
  'hammer-rise': 'sfx.hammer.swing',
  'hammer-low': 'sfx.hammer.swing',
  'hammer-air': 'sfx.hammer.swing',
  'hammer-ground': 'sfx.hammer.swing',
  'hammer-dash': 'sfx.hammer.swing',
  'bandit-shot': 'sfx.revolver.aim',
  'bandit-whip': 'sfx.revolver.empty',
  'hookstaff-sweep': 'sfx.hookstaff.sweep',
  'hookstaff-thrust': 'sfx.hookstaff.thrust',
  'hookstaff-pull': 'sfx.hookstaff.hook',
  'hookstaff-low': 'sfx.hookstaff.sweep',
  'hookstaff-descent': 'sfx.hookstaff.thrust',
  // Bandit tells.
  'flank-dash': 'sfx.ambusher.dash',
  'low-lunge': 'sfx.ambusher.flank',
  'ledge-drop': 'sfx.ambusher.flank',
  'hammer-fist': 'sfx.bruiser.windup',
  'quarry-charge': 'sfx.bruiser.windup',
  'boulder-heave': 'sfx.bruiser.windup',
  'rope-throw': 'sfx.rope.twirl',
  'rope-pull': 'sfx.rope.taut',
  'rope-lash': 'sfx.rope.throw',
  'baton-strike': 'sfx.raider.charge',
  'spin-stave': 'sfx.stalker.strike',
  'flank-order': 'sfx.captain.order',
  'signal-break': 'sfx.captain.broken',
  // Garran Voss.
  'collar-tie': 'sfx.garran.clinch',
  'shoulder-cast': 'sfx.garran.cast',
  'ridge-trip': 'sfx.garran.trip',
  'shoulder-rush': 'sfx.garran.roar',
  'winch-crank': 'sfx.winch.crank',
};

/** Sounds when an action reaches its active frames (the strike lands or is thrown). */
export const ACTION_ACTIVE: Readonly<Record<string, string>> = {
  'bandit-shot': 'sfx.revolver.shot',
  'hammer-drop': 'sfx.hammer.ground',
  'rope-throw': 'sfx.rope.throw',
  'boulder-heave': 'sfx.bruiser.slam',
  'hammer-fist': 'sfx.bruiser.slam',
};

/** Sounds when a weapon's strike connects (by the action id's family). */
const HIT_FAMILY: Readonly<Record<string, string>> = {
  hike: 'sfx.staff.hit',
  axe: 'sfx.axe.hit',
  hammer: 'sfx.hammer.hit',
  hookstaff: 'sfx.hookstaff.clash',
};

const FOOD: Readonly<Record<string, string>> = {
  'trail-rice': 'sfx.food.rice',
  'vegetable-broth': 'sfx.food.broth',
  'seed-cake': 'sfx.food.seedcake',
  'camp-meal': 'sfx.food.campmeal',
};
const STAGE3_WEAPONS = new Set([
  'hiking-staff',
  'wood-axe',
  'quarry-hammer',
  'bandit-revolver',
  'quarry-hookstaff',
]);
/** Breaking a Stage 3 weapon. */
const WEAPON_BREAK: Readonly<Record<string, string>> = {
  'hiking-staff': 'sfx.staff.break',
  'wood-axe': 'sfx.axe.break',
  'quarry-hookstaff': 'sfx.hookstaff.break',
};

/** Garran's boss state the tracker reads. */
export interface Stage3BossView {
  id: number;
  phase: number;
  capture: number;
  stagger: number;
}

export interface Stage3Snapshot {
  frame: number;
  generation: number;
  fighters: readonly Fighter[];
  items: readonly Item[];
  shared: SharedState | null;
  breakables: readonly Breakable[];
  boss: Stage3BossView | null;
}

const CATEGORY = new Map(STAGE3_SFX.map((d) => [d.id, d.category]));

/** The category a Stage 3 sound plays in (its recipe's), 'contact' when unknown. */
export function stage3Category(id: string): SfxCategory {
  return CATEGORY.get(id) ?? 'contact';
}

interface FighterSeen {
  state: number;
  action: number;
  hits: number;
  rider: number;
}

export class Stage3SoundTracker {
  private generation = -1;
  private fighters = new Map<number, FighterSeen>();
  private items = new Map<number, number>();
  private movers = new Map<number, number>();
  private breaks = new Map<number, number>();
  private log = '';
  private boss: Stage3BossView | null = null;
  private emitted = new Set<string>();
  private order: string[] = [];

  update(s: Stage3Snapshot): Stage3Sound[] {
    const out: Stage3Sound[] = [];
    if (s.generation !== this.generation) {
      this.generation = s.generation;
      this.fighters.clear();
      this.items.clear();
      this.movers.clear();
      this.breaks.clear();
      this.log = s.shared ? `${s.shared.log.kind}/${s.shared.log.frame}` : '';
      this.boss = s.boss ? { ...s.boss } : null;
      this.remember(s);
      return out;
    }
    const play = (key: string, id: string | undefined) => {
      if (!id) return;
      const k = `${key}:${id}`;
      if (this.emitted.has(k)) return;
      this.emitted.add(k);
      this.order.push(k);
      if (this.order.length > 512) this.emitted.delete(this.order.shift()!);
      out.push({ id, category: stage3Category(id) });
    };
    for (const f of s.fighters) {
      const prev = this.fighters.get(f.id);
      if (!prev) continue;
      const a = f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
      if (a && f.state === MoveState.Attack) {
        const start = s.frame - f.stateFrame;
        if (f.action !== prev.action || prev.state !== MoveState.Attack)
          play(`${start}:${f.id}:start`, ACTION_START[a.id]);
        if (phaseOf(a, f.stateFrame + 1).phase === 'active')
          play(`${start}:${f.id}:active`, ACTION_ACTIVE[a.id]);
      }
      // A Stage 3 weapon strike connected on this fighter.
      const hits = f.ctx.open ? f.ctx.hits : 0;
      if (hits > prev.hits) {
        const code = f.ctx.route[f.ctx.route.length - 1];
        const atk = code === undefined ? undefined : routeAction(code);
        const family = atk?.id.split('-')[0] ?? '';
        play(`${s.frame}:${f.id}:hit:${hits}`, HIT_FAMILY[family]);
      }
      // A Mounted Raider charging its lane, then disengaging safely.
      const rider = f.ext?.rider?.phase ?? -1;
      if (rider !== prev.rider && rider >= 0 && ENEMIES[f.hero]?.art === 'rider3') {
        if (rider === 1) play(`${s.frame}:${f.id}:charge`, 'sfx.raider.charge');
        if (rider === 3) play(`${s.frame}:${f.id}:off`, 'sfx.raider.disengage');
      }
      // The Rope Trapper's bind and the hero getting free.
      if (f.team === 'hero' && f.state !== prev.state) {
        const by = s.fighters.find((x) => x.id === f.grabbedBy);
        const rope = by && kitOf(by)?.id.startsWith('trapper');
        if (rope && (f.state === MoveState.Grabbed || f.state === MoveState.Restrained))
          play(`${s.frame}:${f.id}:bind`, 'sfx.rope.bind');
        if (
          (prev.state === MoveState.Grabbed || prev.state === MoveState.Restrained) &&
          f.state !== MoveState.Grabbed &&
          f.state !== MoveState.Restrained &&
          this.ropeHold.has(f.id)
        )
          play(`${s.frame}:${f.id}:escape`, 'sfx.rope.escape');
      }
    }
    // Pick-ups: a Stage 3 weapon or food taken into a hand; a weapon breaking.
    for (const it of s.items) {
      const prev = this.items.get(it.id);
      const id = WEAPONS[it.def]?.id ?? '';
      if (prev !== undefined && prev !== it.state) {
        if (it.state === ItemState.Held && FOOD[id])
          play(`${s.frame}:${it.id}:pick`, 'sfx.pickup.food');
        else if (it.state === ItemState.Held && STAGE3_WEAPONS.has(id))
          play(`${s.frame}:${it.id}:pick`, 'sfx.pickup.weapon');
        if (it.state === ItemState.Gone && !FOOD[id])
          play(`${s.frame}:${it.id}:break`, WEAPON_BREAK[id]);
      }
    }
    // Scenery: scaffold creak, crack and collapse; timber and loose stone.
    for (const b of s.breakables) {
      const prev = this.breaks.get(b.id);
      if (prev === undefined || prev === b.state || !b.tags) continue;
      const tags = b.tags;
      if (tags.includes('scaffold'))
        play(
          `${s.frame}:b${b.id}`,
          b.state === BreakState.Broken
            ? 'sfx.scaffold.collapse'
            : b.state === 2
              ? 'sfx.scaffold.crack'
              : 'sfx.scaffold.creak',
        );
      else if (tags.includes('timber') && b.state === BreakState.Broken)
        play(`${s.frame}:b${b.id}`, 'sfx.timber.break');
      else if (tags.includes('stone')) play(`${s.frame}:b${b.id}`, 'sfx.stone.loose');
    }
    // Movers: the winch release and warning, carts rolling, cargo swinging.
    for (const m of s.shared?.movers ?? []) {
      const prev = this.movers.get(m.id);
      if (prev === undefined || prev === m.phase) continue;
      const cart = m.tags.includes('cart');
      const load = m.tags.includes('cargo') || m.tags.includes('cover');
      if (m.phase === MoverPhase.Warn) {
        if (m.trigger) play(`${s.frame}:m${m.id}:rel`, 'sfx.winch.release');
        play(
          `${s.frame}:m${m.id}:warn`,
          cart ? 'sfx.cart.roll' : load ? 'sfx.winch.warn' : undefined,
        );
      }
      if (m.phase === MoverPhase.Active && m.tags.includes('cargo'))
        play(`${s.frame}:m${m.id}:swing`, 'sfx.cargo.swing');
    }
    // The shared log's latest event (redirects, impacts, food eaten, feints, tools).
    if (s.shared) {
      const l = s.shared.log;
      const key = `${l.kind}/${l.frame}`;
      if (key !== this.log) {
        this.log = key;
        const mover = s.shared.movers.find((m) => m.id === l.a);
        const tag = (t: string) => mover?.tags.includes(t) ?? false;
        switch (l.kind) {
          case SharedEvent.Redirect:
            play(`${l.frame}:redirect:${l.a}`, 'sfx.winch.redirect');
            break;
          case SharedEvent.MoverHit:
            play(
              `${l.frame}:mhit:${l.a}:${l.b}`,
              tag('cart')
                ? 'sfx.cart.impact'
                : tag('cargo')
                  ? 'sfx.cargo.drop'
                  : tag('cover')
                    ? 'sfx.wall.impact'
                    : undefined,
            );
            break;
          case SharedEvent.Eat:
            play(`${l.frame}:eat:${l.a}`, FOOD[WEAPONS[l.b]?.id ?? '']);
            break;
          case SharedEvent.Feint: {
            const f = s.fighters.find((x) => x.id === l.a);
            if (f && kitOf(f)?.id.startsWith('stalker'))
              play(`${l.frame}:feint:${l.a}`, 'sfx.stalker.feint');
            break;
          }
          case SharedEvent.Opened:
            play(`${l.frame}:open:${l.a}`, 'sfx.timber.break');
            break;
        }
      }
    }
    // Garran Voss: the Hookstaff cast aside, the winch phase, the Resolve break and custody.
    const b = s.boss;
    const bf = b ? s.fighters.find((f) => f.id === b.id) : undefined;
    if (b && this.boss && bf && ENEMIES[bf.hero]?.id === 'garran') {
      if (b.phase !== this.boss.phase && b.phase === 1)
        play(`${s.frame}:g:disarm`, 'sfx.hookstaff.disarm');
      if (b.phase !== this.boss.phase && b.phase === 2)
        play(`${s.frame}:g:radio`, 'sfx.garran.radio');
      if (b.capture !== this.boss.capture && b.capture > 0) {
        play(
          `${s.frame}:g:capture`,
          b.capture === 1 ? 'sfx.garran.resolve-break' : 'sfx.garran.restrain',
        );
        if (b.capture === 1) this.restrainAt = s.frame + 90;
      }
      if (this.restrainAt > 0 && s.frame >= this.restrainAt) {
        play(`${this.restrainAt}:g:restrain`, 'sfx.garran.restrain');
        this.restrainAt = 0;
      }
    }
    this.boss = b ? { ...b } : null;
    this.remember(s);
    return out;
  }

  private restrainAt = 0;
  /** Heroes currently held by a Rope Trapper (for the escape sound). */
  private ropeHold = new Set<number>();

  private remember(s: Stage3Snapshot): void {
    for (const f of s.fighters) {
      this.fighters.set(f.id, {
        state: f.state,
        action: f.action,
        hits: f.ctx.open ? f.ctx.hits : 0,
        rider: f.ext?.rider?.phase ?? -1,
      });
      const by = s.fighters.find((x) => x.id === f.grabbedBy);
      if (by && kitOf(by)?.id.startsWith('trapper')) this.ropeHold.add(f.id);
      else if (f.state !== MoveState.Grabbed && f.state !== MoveState.Restrained)
        this.ropeHold.delete(f.id);
    }
    for (const it of s.items) this.items.set(it.id, it.state);
    for (const b of s.breakables) this.breaks.set(b.id, b.state);
    for (const m of s.shared?.movers ?? []) this.movers.set(m.id, m.phase);
  }
}
