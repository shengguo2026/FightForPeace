import { describe, expect, it } from 'vitest';
import {
  AssetRegistry,
  CODED_SFX,
  MIX_RULES,
  SFX_GROUPS,
  SFX_RATE,
  STAGE12_SFX,
  STAGE3_SFX,
  codedSfx,
  renderCodedSfx,
  renderStage3Sfx,
  stage3Sfx,
} from '../src/index';

describe('Sound effects made in code', () => {
  it('has unique logical ids in the sfx.<family>.<variant> form', () => {
    const ids = CODED_SFX.map((d) => d.id);
    expect(CODED_SFX.length).toBe(STAGE12_SFX.length + STAGE3_SFX.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^sfx\.[a-z]+\.[a-z-]+$/);
  });

  it('Stage 3 keeps clear of the Stage 1/2 families', () => {
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
    for (const { group } of SFX_GROUPS) expect(CODED_SFX.some((d) => d.group === group)).toBe(true);
    // Every food family of spec §10.2 has its own sound.
    for (const f of ['rice', 'broth', 'seedcake', 'campmeal'])
      expect(stage3Sfx(`sfx.food.${f}`)).toBeDefined();
  });

  it('uses mixer categories; warnings and tells are critical', () => {
    for (const d of CODED_SFX) expect(MIX_RULES[d.category]).toBeDefined();
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
    for (const d of CODED_SFX) {
      const x = renderCodedSfx(d.id)!;
      expect(x.length).toBe(Math.round((d.ms / 1000) * SFX_RATE));
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
    expect(renderCodedSfx('sfx.nothing.here')).toBeNull();
    expect(codedSfx('sfx.nothing.here')).toBeUndefined();
    // Stage 3 names answer only for Stage 3 sounds.
    expect(renderStage3Sfx('sfx.hit.heavy')).toBeNull();
    expect(stage3Sfx('sfx.hit.heavy')).toBeUndefined();
    expect(stage3Sfx('sfx.horse.gallop')?.group).toBe('horse');
  });

  it('codes every sound id the Stage 1 and 2 game code plays', () => {
    // The ids below are every literal sfx id in the game, the M13 event mapping and the
    // M18/M19/M22 scenes (Stage 1, Stage 2 and the shared fight sounds).
    const played = [
      'sfx.hit.light',
      'sfx.hit.medium',
      'sfx.hit.heavy',
      'sfx.guard.block',
      'sfx.armor.clank',
      'sfx.crush.break',
      'sfx.exact.confirm',
      'sfx.counter.confirm',
      'sfx.breaker.confirm',
      'sfx.grab.hold',
      'sfx.throw.release',
      'sfx.rescue.free',
      'sfx.dash.step',
      'sfx.land.step',
      'sfx.knockdown.fall',
      'sfx.ultimate.start',
      'sfx.team.finisher',
      'sfx.phase.boss',
      'sfx.warn.aim',
      'sfx.weapon.burst',
      'sfx.weapon.shot',
      'sfx.run.checkpoint',
      'sfx.run.worker-freed',
      'sfx.run.cache',
      'sfx.run.food',
      'sfx.run.clue',
      'sfx.run.evidence',
      'sfx.run.river-restored',
      'sfx.run.downed',
      'sfx.run.revived',
      'sfx.rescue.open',
      'sfx.crush.case',
      'sfx.rescue.repair',
      'sfx.phase.fallback',
      'sfx.phase.lost',
      'sfx.knockdown.rack',
      'sfx.exact.jet',
      'sfx.dash.jet',
      'sfx.run.redirect',
      'sfx.grab.strap',
      'sfx.rescue.secure',
      'sfx.throw.grenade',
      'sfx.crush.blast',
      'sfx.exact.draw',
      'sfx.exact.arm',
      'sfx.exact.aim',
      'sfx.throw.lob',
      'sfx.ui.drop',
      'sfx.exact.live',
      'sfx.ride.crash',
      'sfx.ride.impact',
      'sfx.ride.hit',
      'sfx.ride.ramp',
      'sfx.ride.brace',
      'sfx.ride.engine',
      'sfx.warn.critical',
    ];
    for (const id of played) expect(codedSfx(id), id).toBeDefined();
    expect(STAGE12_SFX.length).toBe(played.length);
  });

  it('resolves through the asset registry like every other sound (a delivered file replaces it)', () => {
    const reg = new AssetRegistry({ version: 1, assets: {} });
    expect(reg.resolve('sfx.horse.gallop')).toMatchObject({ kind: 'placeholder', family: 'sound' });
  });
});
