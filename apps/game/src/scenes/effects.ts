import * as Phaser from 'phaser';
import {
  type AssetRegistry,
  EffectBudget,
  type EffectKind,
  type PresentationEvent,
  type QualityLevel,
  type Tier,
} from '@ffp/platform';
import { presentation } from '../shell/presentation';

/** Which effect sheet cells animate each effect (VFX-* sheets, 3 × 2 cells). */
const LOOKS: Record<string, { sheet: string; cells: number[]; ms: number }> = {
  'hit.0': { sheet: 'vfx.hit-sparks.sheet', cells: [0, 1], ms: 160 },
  'hit.1': { sheet: 'vfx.hit-sparks.sheet', cells: [2, 3], ms: 200 },
  'hit.2': { sheet: 'vfx.hit-sparks.sheet', cells: [4, 5], ms: 240 },
  guard: { sheet: 'vfx.guard.sheet', cells: [0, 1], ms: 160 },
  exact: { sheet: 'vfx.guard.sheet', cells: [2, 3], ms: 260 },
  counter: { sheet: 'vfx.guard.sheet', cells: [4, 5], ms: 260 },
  breaker: { sheet: 'vfx.breaker-team.sheet', cells: [0, 1], ms: 320 },
  crush: { sheet: 'vfx.hit-sparks.sheet', cells: [4, 5], ms: 260 },
  dash: { sheet: 'vfx.dust.sheet', cells: [0, 1], ms: 220 },
  land: { sheet: 'vfx.dust.sheet', cells: [2, 3], ms: 220 },
  knockdown: { sheet: 'vfx.dust.sheet', cells: [4, 5], ms: 320 },
  'ultimate.mountain': { sheet: 'vfx.ultimate.sheet', cells: [0, 1, 2], ms: 620 },
  'ultimate.river': { sheet: 'vfx.ultimate.sheet', cells: [3, 4, 5], ms: 620 },
  team: { sheet: 'vfx.breaker-team.sheet', cells: [4, 5], ms: 520 },
  phase: { sheet: 'vfx.hit-sparks.sheet', cells: [4, 5], ms: 420 },
};
const SPARK_COLORS: Record<number, number> = { 0: 0xfff2c0, 1: 0xffd166, 2: 0xbfefff, 3: 0xff9ad0 };

interface Live {
  sprite: Phaser.GameObjects.Sprite | null;
  ring: { x: number; y: number; r: number; color: number } | null;
  cells: number[];
  born: number;
  ms: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  color: number;
}

/** Counters for tests and the Lab: cores, cosmetic layers, merges (since the page opened). */
export const EFFECT_STATS = { cores: 0, sparks: 0, flashes: 0, shakes: 0, merged: 0, events: 0 };

/**
 * M13 effect layers (Layered Scalable Spectacle): each presentation event gets its
 * readable impact core from the delivered VFX sheets (a drawn ring when a sheet is
 * missing), plus cosmetic sparks, a screen flash and camera shake scaled by its tier,
 * within the per-screen budget and the player's flash, shake and particle settings.
 */
export class EffectsLayer {
  private readonly budget = new EffectBudget();
  private live: Live[] = [];
  private sparks: Spark[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Graphics;
  private flashAlpha = 0;
  readonly stats = EFFECT_STATS;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly assets: AssetRegistry,
  ) {}

  create(): void {
    this.gfx = this.scene.add.graphics().setDepth(15);
    this.flash = this.scene.add.graphics().setScrollFactor(0).setDepth(29);
  }

  play(events: readonly PresentationEvent[], now: number, quality: QualityLevel): void {
    for (const e of events) {
      EFFECT_STATS.events += 1;
      const r = request(e);
      if (!r) continue;
      const plan = this.budget.plan({ kind: r.kind, tier: r.tier, x: r.x, y: r.y }, now, {
        flashes: !presentation.reducedFlashing,
        shake: presentation.reducedShake ? 0 : 1,
        particles: presentation.particles,
        quality,
      });
      if (plan.merged) {
        this.stats.merged += 1;
        continue;
      }
      const look = LOOKS[r.look];
      this.stats.cores += 1;
      const meta = look ? this.assets.sheet(look.sheet) : undefined;
      if (look && meta && this.scene.textures.exists(look.sheet)) {
        const sp = this.scene.add.sprite(r.x, r.y, look.sheet, look.cells[0]);
        sp.setDepth(14).setScale(plan.scale * (r.kind === 'ultimate' ? 1.6 : 1.2));
        sp.setBlendMode(Phaser.BlendModes.ADD);
        if (r.kind === 'ultimate') sp.setOrigin(0.5, 0.85);
        this.live.push({ sprite: sp, ring: null, cells: look.cells, born: now, ms: look.ms });
      } else {
        this.live.push({
          sprite: null,
          ring: { x: r.x, y: r.y, r: 40 + r.tier * 30, color: SPARK_COLORS[r.tier] ?? 0xffffff },
          cells: [0],
          born: now,
          ms: 220,
        });
      }
      for (let i = 0; i < plan.sparks; i += 1) {
        const a = (i / plan.sparks) * Math.PI * 2 + (now % 628) / 100;
        const v = 0.35 + (0.25 * ((i * 7) % 5)) / 5;
        this.sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 0.1,
          born: now,
          color: SPARK_COLORS[r.tier] ?? 0xffffff,
        });
      }
      this.stats.sparks += plan.sparks;
      if (plan.flash > 0) {
        this.flashAlpha = Math.max(this.flashAlpha, plan.flash);
        this.stats.flashes += 1;
      }
      if (plan.shake > 0) {
        this.scene.cameras.main.shake(plan.shakeMs, plan.shake);
        this.stats.shakes += 1;
      }
    }
  }

  update(now: number, dtMs: number): void {
    const g = this.gfx;
    g.clear();
    this.live = this.live.filter((l) => {
      const k = (now - l.born) / l.ms;
      if (k >= 1) {
        l.sprite?.destroy();
        return false;
      }
      if (l.sprite) {
        l.sprite.setFrame(l.cells[Math.min(l.cells.length - 1, Math.floor(k * l.cells.length))]!);
        l.sprite.setAlpha(1 - Math.max(0, k - 0.6) / 0.4);
      } else if (l.ring) {
        g.lineStyle(6, l.ring.color, 1 - k);
        g.strokeCircle(l.ring.x, l.ring.y, l.ring.r * (0.6 + k * 0.6));
      }
      return true;
    });
    this.sparks = this.sparks.filter((s) => {
      const age = now - s.born;
      if (age > 360) return false;
      s.x += s.vx * dtMs;
      s.y += s.vy * dtMs;
      s.vy += 0.0015 * dtMs;
      g.fillStyle(s.color, 1 - age / 360);
      g.fillCircle(s.x, s.y, 5);
      return true;
    });
    this.flash.clear();
    if (this.flashAlpha > 0.01) {
      this.flash.fillStyle(0xffffff, this.flashAlpha);
      this.flash.fillRect(0, 0, 1920, 1080);
      this.flashAlpha *= Math.pow(0.82, dtMs / 16.7);
    } else this.flashAlpha = 0;
  }

  clear(): void {
    for (const l of this.live) l.sprite?.destroy();
    this.live = [];
    this.sparks = [];
  }
}

function request(
  e: PresentationEvent,
): { kind: EffectKind; tier: Tier; x: number; y: number; look: string } | null {
  switch (e.kind) {
    case 'hit':
      return { kind: 'hit', tier: e.tier, x: e.x, y: e.y, look: `hit.${Math.min(2, e.tier)}` };
    case 'defense': {
      const tier: Tier = e.what === 'guard' || e.what === 'armor' ? 0 : 2;
      const look = e.what === 'armor' ? 'guard' : e.what;
      return {
        kind: e.what === 'crush' ? 'hit' : (e.what as EffectKind),
        tier,
        x: e.x,
        y: e.y,
        look,
      };
    }
    case 'dash':
    case 'land':
    case 'knockdown':
      return { kind: e.kind, tier: 0, x: e.x, y: e.y, look: e.kind };
    case 'ultimate':
      return {
        kind: 'ultimate',
        tier: 3,
        x: e.x,
        y: e.y,
        look: `ultimate.${e.hero === 'river' ? 'river' : 'mountain'}`,
      };
    case 'team':
      return { kind: 'team', tier: 3, x: e.x, y: e.y, look: 'team' };
    case 'bossPhase':
      return { kind: 'phase', tier: 3, x: e.x, y: e.y, look: 'phase' };
    default:
      return null;
  }
}
