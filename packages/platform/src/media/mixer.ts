/**
 * M13 Priority-Aware Combat Mix (F&D Module 18). Every triggered sound asks the mixer
 * first: categories have authored priorities and voice limits, repeats of one sound are
 * rate-limited, a full mix steals the least important voice or drops the newcomer, and
 * essential cues (defensive confirmations, boss telegraphs, objective warnings) may duck
 * music and ambience briefly. Time is passed in (ms). Presentation only.
 */

export type SfxCategory =
  'critical' | 'confirm' | 'contact' | 'weapon' | 'ui' | 'crowd' | 'debris' | 'ambience';

export interface CategoryRule {
  priority: number;
  /** Simultaneous voices of this category. */
  voices: number;
  /** The same sound id may not start again within this many ms. */
  repeatMs: number;
  /** Essential: never dropped for budget reasons, never reduced by performance settings. */
  essential?: boolean;
  /** Music/ambience duck while it plays: gain multiplier and length. */
  duck?: { gain: number; ms: number };
}

export const MIX_RULES: Readonly<Record<SfxCategory, CategoryRule>> = {
  critical: {
    priority: 100,
    voices: 4,
    repeatMs: 60,
    essential: true,
    duck: { gain: 0.55, ms: 450 },
  },
  confirm: {
    priority: 80,
    voices: 4,
    repeatMs: 50,
    essential: true,
    duck: { gain: 0.75, ms: 250 },
  },
  contact: { priority: 60, voices: 5, repeatMs: 45 },
  weapon: { priority: 55, voices: 3, repeatMs: 60 },
  ui: { priority: 50, voices: 2, repeatMs: 40 },
  crowd: { priority: 30, voices: 3, repeatMs: 140 },
  debris: { priority: 20, voices: 2, repeatMs: 120 },
  ambience: { priority: 10, voices: 2, repeatMs: 500 },
};

/** Total voices; the cosmetic share shrinks under the performance setting. */
export const MAX_VOICES = 14;

export interface SfxRequest {
  /** Logical asset id (`sfx.hit.heavy`). */
  id: string;
  category: SfxCategory;
  /** Length of the sound in ms (for voice accounting). */
  ms: number;
  /** 0 (on screen centre / the player's own) … 1 (far edge). */
  distance?: number;
  /** A player's own action (slightly louder than a crowd's). */
  own?: boolean;
}

export interface MixDecision {
  play: boolean;
  gain: number;
  /** A playing voice to stop (stolen). */
  steal?: number;
  /** Voice handle when played. */
  voice?: number;
  duck?: { gain: number; ms: number };
  reason?: 'repeat' | 'full' | 'category';
}

interface Voice {
  handle: number;
  id: string;
  category: SfxCategory;
  priority: number;
  until: number;
}

export class SfxMixer {
  private voices: Voice[] = [];
  private lastStart = new Map<string, number>();
  private nextHandle = 1;
  /** Reduced: cosmetic categories get fewer voices (Auto Quality / performance). */
  reduced = false;

  get active(): number {
    return this.voices.length;
  }

  private limit(cat: SfxCategory): number {
    const r = MIX_RULES[cat];
    if (!this.reduced || r.essential) return r.voices;
    return Math.max(1, Math.floor(r.voices / 2));
  }

  trigger(req: SfxRequest, now: number): MixDecision {
    this.voices = this.voices.filter((v) => v.until > now);
    const rule = MIX_RULES[req.category];
    const last = this.lastStart.get(req.id);
    if (last !== undefined && now - last < rule.repeatMs)
      return { play: false, gain: 0, reason: 'repeat' };
    let steal: number | undefined;
    const same = this.voices.filter((v) => v.category === req.category);
    if (same.length >= this.limit(req.category)) {
      if (!rule.essential) return { play: false, gain: 0, reason: 'category' };
      steal = this.drop(same.reduce((a, b) => (a.until < b.until ? a : b)));
    } else if (this.voices.length >= (this.reduced ? MAX_VOICES - 4 : MAX_VOICES)) {
      const weakest = this.voices.reduce((a, b) => (a.priority <= b.priority ? a : b));
      if (weakest.priority >= rule.priority) return { play: false, gain: 0, reason: 'full' };
      steal = this.drop(weakest);
    }
    const handle = this.nextHandle++;
    this.voices.push({
      handle,
      id: req.id,
      category: req.category,
      priority: rule.priority,
      until: now + req.ms,
    });
    this.lastStart.set(req.id, now);
    const d = Math.min(1, Math.max(0, req.distance ?? 0));
    const gain = (1 - 0.45 * d) * (req.own === false ? 0.8 : 1);
    return {
      play: true,
      gain,
      voice: handle,
      ...(steal !== undefined ? { steal } : {}),
      ...(rule.duck ? { duck: rule.duck } : {}),
    };
  }

  private drop(v: Voice): number {
    this.voices = this.voices.filter((x) => x !== v);
    return v.handle;
  }
}
