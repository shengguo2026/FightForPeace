import { describe, expect, it } from 'vitest';
import {
  AssetRegistry,
  MIX_RULES,
  SFX3_GROUPS,
  SFX3_RATE,
  STAGE3_SFX,
  renderStage3Sfx,
  stage3Sfx,
} from '../src/index';

describe('Stage 3 sound effects made in code', () => {
  it('has unique logical ids in the sfx.<family>.<variant> form', () => {
    const ids = STAGE3_SFX.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^sfx\.[a-z]+\.[a-z-]+$/);
  });

  it('keeps clear of the Stage 1/2 placeholder families', () => {
    const old = [
      'hit',
      'guard',
      'exact',
      'counter',
      'breaker',
      'crush',
      'armor',
      'ultimate',
      'team',
      'dash',
      'land',
      'knockdown',
      'grab',
      'throw',
      'rescue',
      'phase',
      'run',
      'ui',
      'weapon',
      'warn',
      'ride',
    ];
    for (const d of STAGE3_SFX) expect(old).not.toContain(d.id.split('.')[1]);
  });

  it('covers the Stage 3 content the spec names', () => {
    const fam = new Set(STAGE3_SFX.map((d) => d.id.split('.')[1]));
    for (const f of [
      'horse',
      'staff',
      'axe',
      'hammer',
      'revolver',
      'ambusher',
      'bruiser',
      'rope',
      'raider',
      'stalker',
      'captain',
      'hookstaff',
      'garran',
      'scaffold',
      'winch',
      'food',
      'hostage',
      'research',
    ])
      expect(fam).toContain(f);
    for (const g of SFX3_GROUPS) expect(STAGE3_SFX.some((d) => d.group === g)).toBe(true);
    // Every food family of spec §10.2 has its own sound.
    for (const f of ['rice', 'broth', 'seedcake', 'campmeal'])
      expect(stage3Sfx(`sfx.food.${f}`)).toBeDefined();
  });

  it('uses mixer categories; warnings and tells are critical', () => {
    for (const d of STAGE3_SFX) expect(MIX_RULES[d.category]).toBeDefined();
    for (const id of [
      'sfx.revolver.aim',
      'sfx.hostage.warn',
      'sfx.winch.warn',
      'sfx.scaffold.crack',
      'sfx.hookstaff.hook',
      'sfx.horse.stability-low',
      'sfx.objective.alert',
    ])
      expect(stage3Sfx(id)?.category).toBe('critical');
  });

  it('renders every sound: right length, audible, never clipping, click-free ends', () => {
    for (const d of STAGE3_SFX) {
      const x = renderStage3Sfx(d.id)!;
      expect(x.length).toBe(Math.round((d.ms / 1000) * SFX3_RATE));
      let peak = 0;
      let sq = 0;
      let finite = true;
      for (const v of x) {
        if (!Number.isFinite(v)) finite = false;
        peak = Math.max(peak, Math.abs(v));
        sq += v * v;
      }
      expect(finite, d.id).toBe(true);
      expect(peak, d.id).toBeLessThan(1);
      expect(peak, d.id).toBeGreaterThan(0.2);
      expect(Math.sqrt(sq / x.length), d.id).toBeGreaterThan(0.01);
      expect(Math.abs(x[0]!)).toBeLessThan(1e-3);
      expect(Math.abs(x[x.length - 1]!)).toBeLessThan(1e-3);
    }
  });

  it('is deterministic for an id and silent for other ids', () => {
    const a = renderStage3Sfx('sfx.revolver.shot')!;
    const b = renderStage3Sfx('sfx.revolver.shot')!;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(renderStage3Sfx('sfx.hit.heavy')).toBeNull();
    expect(stage3Sfx('sfx.hit.heavy')).toBeUndefined();
  });

  it('resolves through the asset registry like every other sound (a delivered file replaces it)', () => {
    const reg = new AssetRegistry({ version: 1, assets: {} });
    expect(reg.resolve('sfx.horse.gallop')).toMatchObject({ kind: 'placeholder', family: 'sound' });
  });
});
