import { describe, expect, it } from 'vitest';
import {
  AssetRegistry,
  CinematicPlayer,
  EffectBudget,
  MOTIFS,
  MusicDirector,
  type MusicCueDef,
  STAGE1_ENDING,
  STAGE1_INTRO,
  STAGE1_MUSIC,
  SfxMixer,
  barMs,
  resolveCinematic,
  stage1MediaIds,
  tierOfAction,
} from '../src/index';

describe('M13 cinematic player', () => {
  const shots = resolveCinematic(STAGE1_INTRO, MOTIFS);

  it('resolves the intro: six shots, the first one the shared village motif', () => {
    expect(shots.map((s) => s.id)).toEqual([
      'motif.village.peace',
      'shot.stage1.intro.02',
      'shot.stage1.intro.03',
      'shot.stage1.intro.04',
      'shot.stage1.intro.05',
      'shot.stage1.intro.06',
    ]);
    for (const s of shots) {
      expect(s.still).toMatch(/^story\.stage1\./);
      expect(s.cues.length).toBeGreaterThan(0);
    }
  });

  it('chooses ending shots by state (condition inserts)', () => {
    const all = resolveCinematic(STAGE1_ENDING, MOTIFS, {
      workersFreed: 4,
      workersTotal: 4,
      clues: 2,
      cluesTotal: 2,
    });
    expect(all.map((s) => s.id)).toEqual([
      'shot.stage1.end.01',
      'shot.stage1.end.02.all',
      'motif.sponsor.evidence',
    ]);
    expect(all[2]!.cues.map((c) => c.text)).toEqual(['ending.3', 'ending.3b']);
    const some = resolveCinematic(STAGE1_ENDING, MOTIFS, {
      workersFreed: 1,
      workersTotal: 4,
      clues: 0,
      cluesTotal: 2,
    });
    expect(some.map((s) => s.id)).toEqual([
      'shot.stage1.end.01',
      'shot.stage1.end.02.some',
      'motif.sponsor.evidence',
    ]);
    expect(some[2]!.cues.map((c) => c.text)).toEqual(['ending.3']);
  });

  it('runs on its own clock: shots advance, pause holds, next and skip finish', () => {
    const p = new CinematicPlayer(shots);
    p.advance(7999);
    expect(p.frame()!.index).toBe(0);
    p.advance(2);
    expect(p.frame()!.index).toBe(1);
    expect(p.frame()!.time).toBe(1);
    p.setPaused(true);
    p.advance(5000);
    expect(p.frame()!.time).toBe(1);
    p.setPaused(false);
    p.next();
    expect(p.frame()!.index).toBe(2);
    p.advance(1e6);
    expect(p.done).toBe(true);
    const q = new CinematicPlayer(shots);
    q.skip();
    expect(q.done).toBe(true);
  });

  it('latches the subtitle language at the cue boundary', () => {
    const p = new CinematicPlayer<'en' | 'de'>(shots);
    p.advance(1000);
    expect(p.subtitle('en')).toMatchObject({ locale: 'en', cue: { text: 'intro.1' } });
    // The player switches to German mid-line: this line stays English …
    expect(p.subtitle('de')!.locale).toBe('en');
    // … and the next line appears in German.
    p.advance(7500);
    expect(p.subtitle('de')).toMatchObject({ locale: 'de', cue: { text: 'intro.2' } });
  });
});

describe('M13 music state machine', () => {
  const marek: MusicCueDef = {
    id: 'mus.test.marek',
    title: 'x',
    bpm: 120,
    beatsPerBar: 4,
    states: {
      mounted: { asset: 'a.mounted', bars: 8 },
      armed: { asset: 'a.armed', bars: 8 },
      unbound: { asset: 'a.unbound', bars: 8 },
      surrender: { asset: 'a.surrender', bars: 4, once: true },
    },
    stingers: [
      { from: 'mounted', to: 'armed', asset: 's.dismount', bars: 1 },
      { to: 'surrender', asset: 's.end', bars: 2 },
    ],
  };
  const other: MusicCueDef = {
    id: 'mus.test.other',
    title: 'y',
    bpm: 90,
    beatsPerBar: 4,
    states: { calm: { asset: 'b.calm', bars: 8 } },
  };

  it('supports more than two states with transitions on bar lines and authored stingers', () => {
    const d = new MusicDirector([marek, other]);
    const bar = barMs(marek); // 2000 ms
    d.request('mus.test.marek');
    expect(d.update(0)).toMatchObject([{ kind: 'start', asset: 'a.mounted', at: 0 }]);
    d.request('mus.test.marek', 'armed');
    const cmds = d.update(500);
    // The stinger plays on the next bar line, the new state after it.
    expect(cmds).toMatchObject([
      { kind: 'stop', asset: 'a.mounted', at: bar },
      { kind: 'stinger', asset: 's.dismount', at: bar },
      { kind: 'start', asset: 'a.armed', at: 2 * bar },
    ]);
    expect(d.update(2 * bar)).toEqual([]);
    expect(d.playing).toMatchObject({ state: 'armed', since: 2 * bar });
    // No stinger declared: switch on the bar line with a short crossfade.
    d.request('mus.test.marek', 'unbound');
    expect(d.update(2 * bar + 100)).toMatchObject([
      { kind: 'stop', asset: 'a.armed', at: 3 * bar },
      { kind: 'start', asset: 'a.unbound', at: 3 * bar, loop: true },
    ]);
    d.update(3 * bar);
    // The generic stinger into the final state, which plays once.
    d.request('mus.test.marek', 'surrender');
    const end = d.update(3 * bar + 10);
    expect(end.map((c) => c.kind)).toEqual(['stop', 'stinger', 'start']);
    expect(end[2]).toMatchObject({ asset: 'a.surrender', loop: false, at: 6 * bar });
  });

  it('crossfades a new cue at the next bar and fades out on silence', () => {
    const d = new MusicDirector([marek, other]);
    d.request('mus.test.marek');
    d.update(0);
    d.request('mus.test.other');
    expect(d.update(2100)).toMatchObject([
      { kind: 'stop', asset: 'a.mounted', at: 4000, fadeMs: 2000 },
      { kind: 'start', asset: 'b.calm', at: 4000, fadeMs: 2000 },
    ]);
    d.update(4000);
    d.request(null);
    expect(d.update(4100)).toMatchObject([{ kind: 'stop', asset: 'b.calm' }]);
    expect(d.playing).toBeNull();
  });

  it('requests only declared cues and states', () => {
    const d = new MusicDirector(STAGE1_MUSIC);
    expect(() => d.request('mus.stage1.keeper-of-the-gate', 'phase4')).toThrow();
    expect(() => d.request('mus.nope')).toThrow();
    expect(
      Object.keys(STAGE1_MUSIC.find((c) => c.id === 'mus.stage1.keeper-of-the-gate')!.states),
    ).toHaveLength(4);
  });
});

describe('M13 priority mix', () => {
  it('rate-limits repeats, limits a category and protects essential cues', () => {
    const m = new SfxMixer();
    expect(m.trigger({ id: 'sfx.hit.light', category: 'contact', ms: 200 }, 0).play).toBe(true);
    expect(m.trigger({ id: 'sfx.hit.light', category: 'contact', ms: 200 }, 10).reason).toBe(
      'repeat',
    );
    // Crowd sounds stop at their voice limit …
    let played = 0;
    for (let i = 0; i < 10; i += 1)
      if (m.trigger({ id: `sfx.crowd.${i}`, category: 'crowd', ms: 1000 }, 100).play) played += 1;
    expect(played).toBe(3);
    // … but an essential confirmation always plays, ducking the music.
    for (let i = 0; i < 6; i += 1) {
      const d = m.trigger({ id: `sfx.exact.${i}`, category: 'confirm', ms: 1000 }, 200);
      expect(d.play).toBe(true);
      expect(d.duck).toBeDefined();
    }
  });

  it('steals the least important voice when the whole mix is full', () => {
    const m = new SfxMixer();
    const cats = ['contact', 'weapon', 'ui', 'crowd', 'debris', 'ambience'] as const;
    let n = 0;
    for (const c of cats)
      for (let i = 0; i < 5; i += 1) m.trigger({ id: `${c}.${i}`, category: c, ms: 5000 }, n++);
    expect(m.active).toBe(14);
    const d = m.trigger({ id: 'sfx.phase.boss', category: 'critical', ms: 500 }, 100);
    expect(d.play).toBe(true);
    expect(d.steal).toBeDefined();
    const low = m.trigger({ id: 'amb.x', category: 'ambience', ms: 500 }, 101);
    expect(low.play).toBe(false);
  });
});

describe('M13 spectacle tiers and budget', () => {
  const full = { flashes: true, shake: 1, particles: 'full' as const, quality: 'high' as const };

  it('tiers actions by importance', () => {
    expect(tierOfAction('standing')).toBe(0);
    expect(tierOfAction('standing', ['wallBounce'])).toBe(1);
    expect(tierOfAction('standing', [], true)).toBe(1);
    expect(tierOfAction('counter')).toBe(2);
    expect(tierOfAction('ultimate')).toBe(3);
  });

  it('keeps every core, budgets cosmetics and merges overlaps', () => {
    const b = new EffectBudget();
    const plans = Array.from({ length: 30 }, (_, i) =>
      b.plan({ kind: 'hit', tier: 1, x: i * 100, y: 0 }, i, full),
    );
    expect(plans.every((p) => p.core)).toBe(true);
    expect(plans.filter((p) => p.sparks > 0).length).toBe(10);
    // An Ultimate still gets its full presentation in a crowded screen.
    const ult = b.plan({ kind: 'ultimate', tier: 3, x: 5000, y: 0 }, 40, full);
    expect(ult.sparks).toBeGreaterThan(0);
    expect(ult.flash).toBeGreaterThan(0);
    // The same hit again on the same spot merges into the first.
    const again = b.plan({ kind: 'hit', tier: 1, x: 0, y: 0 }, 41, full);
    expect(again.merged).toBe(true);
  });

  it('follows the flash, shake and particle settings', () => {
    const b = new EffectBudget();
    const p = b.plan({ kind: 'counter', tier: 2, x: 0, y: 0 }, 0, {
      flashes: false,
      shake: 0,
      particles: 'off',
      quality: 'high',
    });
    expect(p).toMatchObject({ core: true, sparks: 0, flash: 0, shake: 0 });
  });
});

describe('M13 Stage 1 media ids (Museum guardrail)', () => {
  it('keeps the stable logical ids', () => {
    expect(stage1MediaIds()).toMatchSnapshot();
  });

  it('every clip and still the cinematics use is delivered in the manifest', () => {
    const reg = new AssetRegistry();
    for (const id of stage1MediaIds()) {
      if (id.startsWith('cine.')) expect(reg.video(id), id).toBeDefined();
      if (id.startsWith('story.')) expect(reg.url(id), id).toBeDefined();
    }
    const v = reg.video('cine.stage1.intro.02')!;
    expect(v.video.ms).toBe(6500);
    expect(v.provenance?.tool).toContain('Flow');
    for (const s of resolveCinematic(STAGE1_INTRO, MOTIFS))
      expect(reg.video(s.clip!)!.video.ms).toBe(s.ms);
    expect(reg.audio('mus.stage1.river-returned.victory')).toBeDefined();
    expect(reg.sheet('vfx.hit-sparks.sheet')?.sheet.cells.filter(Boolean)).toHaveLength(6);
  });
});
