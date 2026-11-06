/**
 * M13 Layered Scalable Spectacle (F&D Module 18). Every successful contact keeps a
 * mandatory readable impact core; cosmetic sparks, flashes and camera motion scale with
 * the authored importance of the move, are bounded by a per-screen budget (overlaps
 * merge), and follow the player's flash, shake and particle settings and Auto Quality.
 * The budget never removes a core, a telegraph or a defensive cue. Presentation only.
 */
import type { QualityLevel } from '../render/quality';

/** 0 ordinary, 1 heavy / weapon / launcher, 2 Exact Block · Counter · Breaker, 3 Ultimate · team finisher · boss transition. */
export type Tier = 0 | 1 | 2 | 3;

export type EffectKind =
  | 'hit'
  | 'guard'
  | 'exact'
  | 'counter'
  | 'breaker'
  | 'ultimate'
  | 'team'
  | 'dash'
  | 'land'
  | 'knockdown'
  | 'phase';

export interface EffectRequest {
  kind: EffectKind;
  tier: Tier;
  x: number;
  y: number;
  /** Fighter that owns the effect (aura colour, merging). */
  owner?: number;
  /** For auras: which hero (`mountain`, `river`). */
  hero?: string;
}

export interface SpectacleSettings {
  flashes: boolean;
  /** 0 (none) … 1 (full). */
  shake: number;
  particles: 'full' | 'reduced' | 'off';
  quality: QualityLevel;
}

export interface EffectPlan {
  /** The readable impact core (always drawn unless merged into an identical one). */
  core: boolean;
  /** Extra cosmetic sparks / flecks. */
  sparks: number;
  /** Screen flash alpha (0 none). */
  flash: number;
  /** Camera shake intensity (0 none) and length. */
  shake: number;
  shakeMs: number;
  /** Scale of the core sprite. */
  scale: number;
  /** The request was merged into a recent identical one (only its core is kept). */
  merged: boolean;
}

/** The tier of an action from its category and tags (spec: ordinary attacks restrained). */
const HEAVY_TAGS = new Set([
  'terminalKnockdown',
  'wallBounce',
  'relaunch',
  'launcher',
  'guardPressure',
  'heavy',
]);

export function tierOfAction(
  category: string | undefined,
  tags: readonly string[] = [],
  weapon = false,
): Tier {
  if (category === 'ultimate' || category === 'team' || tags.includes('teamFinisher')) return 3;
  if (category === 'counter') return 2;
  if (
    category === 'special' ||
    category === 'throw' ||
    category === 'weaponThrow' ||
    weapon ||
    tags.some((t) => HEAVY_TAGS.has(t))
  )
    return 1;
  return 0;
}

const SPARKS: Record<Tier, number> = { 0: 0, 1: 3, 2: 5, 3: 10 };
const FLASH: Record<Tier, number> = { 0: 0, 1: 0, 2: 0.18, 3: 0.32 };
const SHAKE: Record<Tier, number> = { 0: 0, 1: 0.0025, 2: 0.004, 3: 0.008 };
const SCALE: Record<Tier, number> = { 0: 0.5, 1: 0.7, 2: 0.85, 3: 1.1 };

/** Cosmetic effects allowed on screen at once, per quality level. */
export const COSMETIC_BUDGET: Record<QualityLevel, number> = {
  high: 10,
  medium: 6,
  low: 3,
  minimal: 2,
};
const MERGE_PX = 70;
const MERGE_MS = 90;
const LIFE_MS = 400;

export class EffectBudget {
  private live: {
    kind: EffectKind;
    x: number;
    y: number;
    at: number;
    cosmetic: boolean;
    tier: Tier;
  }[] = [];

  /** Cosmetic effects currently counted against the budget. */
  get cosmetic(): number {
    return this.live.filter((e) => e.cosmetic).length;
  }

  plan(req: EffectRequest, now: number, s: SpectacleSettings): EffectPlan {
    this.live = this.live.filter((e) => now - e.at < LIFE_MS);
    const merged = this.live.some(
      (e) =>
        e.kind === req.kind &&
        e.tier >= req.tier &&
        now - e.at < MERGE_MS &&
        Math.abs(e.x - req.x) < MERGE_PX &&
        Math.abs(e.y - req.y) < MERGE_PX,
    );
    const plan: EffectPlan = {
      core: true,
      sparks: 0,
      flash: 0,
      shake: 0,
      shakeMs: 0,
      scale: SCALE[req.tier],
      merged,
    };
    if (merged) {
      this.live.push({ ...req, at: now, cosmetic: false });
      return plan;
    }
    const budget = COSMETIC_BUDGET[s.quality];
    let room = this.cosmetic < budget;
    // The largest presentations may displace an ordinary cosmetic effect (never a core).
    if (!room && req.tier >= 2) {
      const i = this.live.findIndex((e) => e.cosmetic && e.tier < req.tier);
      if (i !== -1) {
        this.live[i]!.cosmetic = false;
        room = true;
      }
    }
    if (room && s.particles !== 'off') {
      const n = SPARKS[req.tier];
      plan.sparks = s.particles === 'reduced' ? Math.ceil(n / 2) : n;
      if (s.quality === 'low' || s.quality === 'minimal') plan.sparks = Math.min(plan.sparks, 2);
    }
    if (room) {
      plan.flash = s.flashes ? FLASH[req.tier] : 0;
      plan.shake = SHAKE[req.tier] * Math.max(0, Math.min(1, s.shake));
      plan.shakeMs = req.tier >= 3 ? 260 : 140;
    }
    const cosmetic = room && (plan.sparks > 0 || plan.flash > 0 || plan.shake > 0);
    this.live.push({ kind: req.kind, x: req.x, y: req.y, at: now, cosmetic, tier: req.tier });
    return plan;
  }
}
