/**
 * Stage 1 and Stage 2 sound effects made in code, plus the shared fight sounds that every
 * stage plays (hits, guard, Exact Block, Counter, Combo Breaker, grabs, throws, Ultimate,
 * Team Attack, boss phases). They replace the M13/M22 one-tone placeholders under the
 * same logical ids, so no trigger in the game changes.
 *
 * Palette: Stage 1 (*The Broken Water Pact*) is wood, cloth, rope, river water and the
 * village chimes; Stage 2 (*Prosperity Under Siege*) adds glass, steel, pumps, the
 * motorbike engine, firearms and the greenhouse grenade drill.
 */
import {
  A4,
  A5,
  D4,
  D5,
  F4,
  F5,
  G4,
  R,
  type Recipe,
  type Synth,
  beepPair,
  bodyFall,
  cloth,
  grit,
  grunt,
  hz,
  iron,
  leather,
  ropeZip,
  splinter,
  wood,
} from './sfxKit.ts';

/** A skin-and-cloth slap on top of a body impact (fist or kick landing). */
function slap(s: Synth, at: number, gain: number): void {
  s.noise({ at, dur: 0.03, c0: 2200, q: 0.7, gain, decay: 110 });
  s.noise({ at, dur: 0.05, c0: 900, q: 0.8, gain: gain * 0.6, decay: 60 });
}

/** Glass breaking: bright pings and shards. */
function glass(s: Synth, at: number, gain: number, pieces = 9): void {
  s.noise({ at, dur: 0.06, c0: 5000, q: 0.6, gain, decay: 50, mode: 'high' });
  for (let k = 0; k < pieces; k += 1) {
    const t = at + 0.02 + 0.5 * Math.pow(k / pieces, 1.4) + 0.02 * s.r01();
    s.modal({
      at: t,
      f: 2800 + 3200 * s.r01(),
      modes: [
        [1, 1, 35],
        [1.47, 0.5, 45],
        [2.13, 0.3, 60],
      ],
      gain: gain * 0.35 * (1 - k / (pieces + 3)),
      dur: 0.15,
    });
  }
}

/** Water rushing (river, irrigation, purge jet): low-passed noise swell. */
function water(s: Synth, at: number, dur: number, gain: number, c0 = 500, c1 = 1500): void {
  s.noise({ at, dur, c0, c1, q: 0.6, gain, bell: 0.5 });
  s.crackle({ at, dur, rate: 500, c: 2600, q: 3, gain: gain * 0.5, bell: 0.5 });
}

/** A bubble: a short sine whose pitch rises. */
function bubble(s: Synth, at: number, f: number, gain: number): void {
  s.tone({ at, dur: 0.04, f0: f, f1: f * 2.2, gain, attack: 0.002, decay: 50 });
}

/** A motorbike engine: firing pulses (cylinder rate f0→f1 Hz) through an exhaust body. */
function engine(
  s: Synth,
  at: number,
  dur: number,
  f0: number,
  f1: number,
  gain: number,
  shape: 'bell' | 'fade' = 'bell',
): void {
  s.tone({
    at,
    dur,
    f0,
    f1,
    wave: 'saw',
    gain: gain * 0.5,
    vib: 0.04,
    vibRate: 23,
    ...(shape === 'bell' ? { bell: 0.4 } : { attack: 0.01, decay: 3 / dur }),
  });
  s.tone({
    at,
    dur,
    f0: f0 * 2,
    f1: f1 * 2,
    wave: 'square',
    gain: gain * 0.15,
    ...(shape === 'bell' ? { bell: 0.4 } : { attack: 0.01, decay: 3 / dur }),
  });
  s.noise({
    at,
    dur,
    c0: f0 * 6,
    c1: f1 * 6,
    q: 1,
    gain: gain * 0.4,
    ...(shape === 'bell' ? { bell: 0.4 } : { attack: 0.01, decay: 3 / dur }),
  });
}

/** A firearm report: crack, body and a room or yard echo. */
function gunshot(s: Synth, at: number, gain: number, body = 140): void {
  s.noise({ at, dur: 0.01, c0: 3200, q: 0.4, gain: 0.6 * gain, decay: 250, mode: 'high' });
  s.noise({ at, dur: 0.16, c0: 1400, c1: 450, q: 0.6, gain: 0.9 * gain, decay: 28 });
  s.noise({ at, dur: 0.22, c0: 650, q: 0.7, gain, decay: 22, mode: 'low' });
  s.thud({ at, f0: body, f1: body * 0.35, dur: 0.25, gain });
}

/** A rising run of village-motif chime notes. */
function arpeggio(
  s: Synth,
  at: number,
  notes: readonly number[],
  step: number,
  gain: number,
): void {
  notes.forEach((n, i) => s.chime(at + i * step, n, gain, 3.2));
}

export const STAGE12_RECIPES: readonly Recipe[] = [
  // ---- Shared fight sounds (every stage) ---------------------------------------------
  R('sfx.hit.light', 'combat', 'contact', 170, 'Light hit lands (jab, quick kick)', (s) => {
    s.thud({ f0: 240, f1: 120, dur: 0.09, gain: 0.7 });
    slap(s, 0, 0.6);
  }),
  R('sfx.hit.medium', 'combat', 'contact', 240, 'Medium hit lands', (s) => {
    s.thud({ f0: 180, f1: 75, dur: 0.15, gain: 0.85 });
    slap(s, 0, 0.6);
    cloth(s, 0, 0.06, 0.2);
  }),
  R('sfx.hit.heavy', 'combat', 'contact', 360, 'Heavy hit lands (launcher, finisher)', (s) => {
    s.thud({ f0: 130, f1: 45, dur: 0.28, gain: 1 });
    slap(s, 0, 0.7);
    s.whoosh({ dur: 0.08, c0: 1800, c1: 900, gain: 0.25 });
    s.drive(1.5);
  }),
  R('sfx.guard.block', 'combat', 'contact', 200, 'An attack is guarded', (s) => {
    s.thud({ f0: 300, f1: 200, dur: 0.07, gain: 0.6 });
    leather(s, 0, 0.08, 0.5);
    s.noise({ dur: 0.04, c0: 1200, q: 1.2, gain: 0.35, decay: 80 });
  }),
  R('sfx.armor.clank', 'combat', 'contact', 280, 'A hit on armor (armored enemies)', (s) => {
    iron(s, 0, 720, 0.55, 0.28, 13);
    s.thud({ f0: 200, f1: 90, dur: 0.1, gain: 0.45 });
  }),
  R('sfx.exact.confirm', 'combat', 'confirm', 480, 'Exact Block confirmed', (s) => {
    s.modal({
      f: 1760,
      modes: [
        [1, 1, 6],
        [2.76, 0.4, 9],
        [5.4, 0.15, 14],
      ],
      gain: 0.5,
      dur: 0.48,
      click: 0.4,
    });
    s.noise({ dur: 0.12, c0: 7000, q: 0.8, gain: 0.25, decay: 25, mode: 'high' });
    s.chime(0.04, A5, 0.25, 6);
  }),
  R('sfx.counter.confirm', 'combat', 'confirm', 400, 'Counter lands', (s) => {
    s.whoosh({ dur: 0.1, c0: 900, c1: 2400, gain: 0.45, skew: 0.5 });
    s.thud({ at: 0.08, f0: 210, f1: 80, dur: 0.15, gain: 0.8 });
    s.chime(0.1, D5, 0.25, 7).chime(0.17, A5, 0.25, 7);
  }),
  R('sfx.breaker.confirm', 'combat', 'confirm', 560, 'Combo Breaker bursts free', (s) => {
    s.noise({ dur: 0.25, c0: 400, c1: 2500, q: 0.7, gain: 0.7, attack: 0.005, decay: 10 });
    s.tone({ dur: 0.3, f0: 260, f1: 1100, wave: 'tri', gain: 0.25, decay: 6 });
    s.thud({ f0: 150, f1: 60, dur: 0.2, gain: 0.6 });
    s.chime(0.18, F5, 0.2, 5).chime(0.24, A5, 0.2, 5);
  }),
  R('sfx.crush.break', 'combat', 'critical', 420, 'Guard Crush: the guard breaks', (s) => {
    splinter(s, 0, 0.8, 0.2);
    s.thud({ f0: 160, f1: 55, dur: 0.25, gain: 0.8 });
    s.tone({ at: 0.06, dur: 0.3, f0: hz(A4), f1: hz(D4), wave: 'tri', gain: 0.25, release: 0.08 });
  }),
  R('sfx.grab.hold', 'combat', 'critical', 320, 'A grab connects (escape window opens)', (s) => {
    cloth(s, 0, 0.14, 0.6);
    s.thud({ at: 0.02, f0: 150, f1: 80, dur: 0.1, gain: 0.5 });
    grunt(s, 0.06, 0.22, 0.35, 115);
  }),
  R('sfx.throw.release', 'combat', 'contact', 480, 'A throw sends a fighter flying', (s) => {
    s.whoosh({ dur: 0.22, c0: 350, c1: 1100, gain: 0.6 });
    bodyFall(s, 0.2, 0.85);
  }),
  R('sfx.rescue.free', 'combat', 'confirm', 420, 'A grab escape or a partner rescue', (s) => {
    cloth(s, 0, 0.1, 0.5);
    s.noise({ at: 0.06, dur: 0.05, c0: 2600, q: 0.6, gain: 0.5, decay: 60 });
    s.chime(0.1, A4, 0.2, 6).chime(0.17, D5, 0.2, 6);
  }),
  // Dash and run (2026-11-18): rushing air with a thin wind whistle, no grit or impact.
  R('sfx.dash.step', 'combat', 'contact', 340, 'Dash or quick step (a gust of wind)', (s) => {
    s.whoosh({ dur: 0.3, c0: 450, c1: 1500, gain: 0.5, q: 0.9, skew: 0.45 });
    s.whoosh({ at: 0.02, dur: 0.26, c0: 1300, c1: 2600, gain: 0.2, q: 2.5, skew: 0.5 });
    s.noise({
      at: 0.03,
      dur: 0.27,
      c0: 1900,
      c1: 2500,
      q: 10,
      gain: 0.22,
      attack: 0.05,
      release: 0.12,
    });
  }),
  R('sfx.land.step', 'combat', 'debris', 170, 'Landing from a jump', (s) => {
    s.thud({ f0: 150, f1: 70, dur: 0.09, gain: 0.6 });
    grit(s, 0.005, 0.12, 0.3, 800);
  }),
  R('sfx.knockdown.fall', 'combat', 'debris', 420, 'A fighter is knocked down', (s) => {
    bodyFall(s, 0.03, 1);
  }),
  R('sfx.ultimate.start', 'combat', 'confirm', 1000, 'Ultimate begins (full bar)', (s) => {
    s.whoosh({ dur: 0.6, c0: 300, c1: 3000, gain: 0.5, skew: 1.6 });
    s.tone({ dur: 0.6, f0: 110, f1: 440, wave: 'saw', gain: 0.12, bell: 1.4 });
    [0.12, 0.27, 0.4, 0.5].forEach((t, i) =>
      s.thud({ at: t, f0: 120, f1: 60, dur: 0.12, gain: 0.35 + 0.12 * i }),
    );
    [D5, F5, A5].forEach((n) => s.chime(0.58, n, 0.18, 2.5));
    s.echo(0.18, 0.2, 0.15);
  }),
  R('sfx.team.finisher', 'combat', 'confirm', 950, 'Team Attack finisher (co-op)', (s) => {
    s.thud({ f0: 140, f1: 50, dur: 0.25, gain: 0.9 });
    s.thud({ at: 0.12, f0: 120, f1: 45, dur: 0.3, gain: 1 });
    slap(s, 0.12, 0.6);
    [D5, F5, A5, D5 + 12].forEach((n, i) => s.chime(0.25 + i * 0.05, n, 0.18, 2.8));
    s.echo(0.2, 0.25, 0.2);
  }),
  R('sfx.phase.boss', 'combat', 'critical', 1200, 'Boss changes phase', (s) => {
    for (let k = 0; k < 6; k += 1)
      s.thud({ at: k * 0.07, f0: 110, f1: 70, dur: 0.1, gain: 0.3 + 0.08 * k });
    iron(s, 0.42, 98, 0.8, 0.75, 3.5);
    s.tone({ at: 0.42, dur: 0.75, f0: 49, gain: 0.35, attack: 0.02, release: 0.3 });
    s.echo(0.26, 0.3, 0.25);
  }),

  // ---- Stage 1 · The Broken Water Pact (run events) ----------------------------------
  R('sfx.run.checkpoint', 'stage1', 'ui', 650, 'Checkpoint reached', (s) => {
    wood(s, 0, 380, 0.4, 0.2);
    s.chime(0.06, D5, 0.25, 4).chime(0.18, A5, 0.22, 4);
  }),
  R('sfx.run.worker-freed', 'stage1', 'confirm', 1100, 'A worker is freed', (s) => {
    ropeZip(s, 0, 0.2, 0.4, 1600, 900);
    s.thud({ at: 0.2, f0: 130, dur: 0.1, gain: 0.35 });
    arpeggio(s, 0.25, [D5, F5, G4 + 12, A5], 0.1, 0.22);
  }),
  R('sfx.run.cache', 'stage1', 'ui', 600, 'A supply cache is opened', (s) => {
    s.creak({ dur: 0.25, r0: 45, r1: 25, f: 520, q: 9, gain: 0.45, attack: 0.02 });
    wood(s, 0.24, 300, 0.5, 0.25);
    s.chime(0.32, A5, 0.18, 5);
  }),
  R('sfx.run.food', 'stage1', 'ui', 550, 'Food eaten (Stage 1 and the greenhouse pantry)', (s) => {
    for (let k = 0; k < 2; k += 1)
      s.crackle({ at: k * 0.13, dur: 0.08, rate: 2500, c: 2600, q: 1.2, gain: 0.35, decay: 25 });
    s.chime(0.28, D5, 0.16, 4).chime(0.36, F5, 0.14, 4);
  }),
  R('sfx.run.clue', 'stage1', 'ui', 650, 'A clue is found', (s) => {
    s.crackle({ dur: 0.22, rate: 1000, c: 4800, q: 1, gain: 0.3, bell: 0.6 });
    s.chime(0.15, F5, 0.2, 4).chime(0.27, A5, 0.22, 4);
  }),
  R('sfx.run.evidence', 'stage1', 'confirm', 750, 'Evidence collected', (s) => {
    s.crackle({ dur: 0.2, rate: 1100, c: 4800, q: 1, gain: 0.3, bell: 0.6 });
    s.thud({ at: 0.2, f0: 220, f1: 110, dur: 0.08, gain: 0.5 });
    s.chime(0.26, D5, 0.2, 3.5).chime(0.34, A5, 0.2, 3.5);
  }),
  R(
    'sfx.run.river-restored',
    'stage1',
    'confirm',
    1900,
    'The river is restored (stage goal)',
    (s) => {
      water(s, 0, 1.6, 0.6, 300, 1400);
      for (let k = 0; k < 9; k += 1)
        bubble(s, 0.2 + k * 0.13 + 0.04 * s.r01(), 350 + 400 * s.r01(), 0.12);
      arpeggio(s, 0.5, [D4 + 12, F4 + 12, G4 + 12, A4 + 12, D5 + 12], 0.13, 0.18);
    },
  ),
  R('sfx.run.downed', 'stage1', 'critical', 850, 'A hero is downed (partner can revive)', (s) => {
    bodyFall(s, 0, 0.7);
    s.tone({ at: 0.15, dur: 0.25, f0: hz(A4), wave: 'tri', gain: 0.3, release: 0.05 });
    s.tone({ at: 0.42, dur: 0.38, f0: hz(F4), f1: hz(D4), wave: 'tri', gain: 0.3, release: 0.15 });
  }),
  R('sfx.run.revived', 'stage1', 'confirm', 750, 'A downed hero is revived', (s) => {
    s.noise({ dur: 0.35, c0: 600, c1: 1800, q: 0.8, gain: 0.3, bell: 0.8 });
    arpeggio(s, 0.2, [D5, F5, A5], 0.08, 0.2);
  }),

  // ---- Stage 2 · firearms (shared Stage 2 combat) -------------------------------------
  R(
    'sfx.warn.aim',
    'stage2',
    'critical',
    420,
    'A firearm is raised: the shot warning (captioned)',
    (s) => {
      s.modal({
        f: 1900,
        modes: [
          [1, 1, 80],
          [1.6, 0.5, 100],
        ],
        gain: 0.4,
        dur: 0.06,
        click: 0.3,
      });
      s.noise({ at: 0.05, dur: 0.07, c0: 2500, q: 1.5, gain: 0.25, decay: 40 });
      s.modal({
        at: 0.11,
        f: 1500,
        modes: [
          [1, 1, 70],
          [1.7, 0.5, 90],
        ],
        gain: 0.45,
        dur: 0.07,
        click: 0.4,
      });
      for (let k = 0; k < 3; k += 1)
        s.tone({
          at: 0.2 + k * 0.07,
          dur: 0.05,
          f0: hz(A5 + 12),
          wave: 'tri',
          gain: 0.2,
          release: 0.015,
        });
    },
  ),
  R(
    'sfx.weapon.shot',
    'stage2',
    'weapon',
    900,
    'A single shot',
    (s) => {
      gunshot(s, 0, 1);
      s.drive(2);
      s.echo(0.14, 0.3, 0.25, 0.55);
    },
    -12,
  ),
  R(
    'sfx.weapon.burst',
    'stage2',
    'weapon',
    900,
    'A three-round burst',
    (s) => {
      for (let k = 0; k < 3; k += 1) gunshot(s, k * 0.085, 1 - k * 0.08, 150);
      s.drive(2);
      s.echo(0.14, 0.3, 0.25, 0.55);
    },
    -12,
  ),

  // ---- Stage 2 · motorbike pursuit ----------------------------------------------------
  R('sfx.ride.engine', 'pursuit', 'crowd', 1300, 'A rider breaks away (engine rev)', (s) => {
    engine(s, 0, 1.25, 38, 72, 0.7);
  }),
  R('sfx.ride.crash', 'pursuit', 'critical', 1400, 'A bike crashes', (s) => {
    s.noise({ dur: 0.35, c0: 2400, c1: 1200, q: 2, gain: 0.5, attack: 0.01, decay: 4 });
    iron(s, 0.3, 380, 0.6, 0.5, 7);
    iron(s, 0.42, 610, 0.4, 0.4, 9);
    iron(s, 0.6, 520, 0.25, 0.3, 12);
    s.thud({ at: 0.3, f0: 110, f1: 40, dur: 0.4, gain: 1 });
    grit(s, 0.32, 0.8, 0.4, 900);
    engine(s, 0.5, 0.8, 30, 18, 0.3, 'fade');
    s.drive(1.4);
  }),
  R('sfx.ride.impact', 'pursuit', 'contact', 450, 'Bike hits an obstacle or another bike', (s) => {
    iron(s, 0, 520, 0.6, 0.35, 11);
    s.thud({ f0: 130, f1: 50, dur: 0.25, gain: 0.8 });
    grit(s, 0.01, 0.25, 0.25);
  }),
  R('sfx.ride.hit', 'pursuit', 'contact', 300, 'A rider is hit (mounted attack)', (s) => {
    s.thud({ f0: 190, f1: 70, dur: 0.15, gain: 0.8 });
    slap(s, 0, 0.5);
    iron(s, 0.01, 980, 0.15, 0.2, 18);
  }),
  R('sfx.ride.ramp', 'pursuit', 'debris', 750, 'Bike jumps a ramp and lands', (s) => {
    engine(s, 0, 0.4, 45, 80, 0.5);
    s.thud({ at: 0.45, f0: 120, f1: 50, dur: 0.22, gain: 0.8 });
    s.creak({ at: 0.46, dur: 0.18, r0: 70, r1: 40, f: 650, q: 8, gain: 0.3 });
    grit(s, 0.46, 0.25, 0.3);
  }),
  R('sfx.ride.brace', 'pursuit', 'contact', 320, 'Rider braces (block on the bike)', (s) => {
    s.thud({ f0: 260, f1: 160, dur: 0.08, gain: 0.6 });
    iron(s, 0, 820, 0.2, 0.25, 16);
    leather(s, 0, 0.1, 0.4);
  }),
  R('sfx.warn.critical', 'pursuit', 'critical', 650, 'Bike health critical (warning)', (s) => {
    for (let k = 0; k < 3; k += 1)
      s.tone({
        at: k * 0.12,
        dur: 0.08,
        f0: hz(D5 + 12),
        wave: 'square',
        gain: 0.12,
        release: 0.02,
      });
    engine(s, 0.36, 0.28, 34, 22, 0.35, 'fade');
  }),

  // ---- Stage 2 · greenhouse rooms -----------------------------------------------------
  R('sfx.rescue.open', 'greenhouse', 'ui', 550, 'A protected container is opened', (s) => {
    s.modal({ f: 2300, modes: [[1, 1, 90]], gain: 0.3, dur: 0.05, click: 0.2 });
    s.noise({ at: 0.05, dur: 0.3, c0: 3000, c1: 1800, q: 1.2, gain: 0.2, bell: 0.5 });
    s.chime(0.3, A5, 0.18, 5);
  }),
  R('sfx.crush.case', 'greenhouse', 'debris', 650, 'A breakable case is broken open', (s) => {
    glass(s, 0, 0.7);
    s.thud({ f0: 180, f1: 70, dur: 0.12, gain: 0.5 });
  }),
  R('sfx.rescue.repair', 'greenhouse', 'confirm', 800, 'A Ledger asset is repaired', (s) => {
    for (let k = 0; k < 5; k += 1)
      s.modal({
        at: k * 0.075,
        f: 2000 + 120 * (k % 2),
        modes: [
          [1, 1, 80],
          [1.5, 0.5, 100],
        ],
        gain: 0.25,
        dur: 0.05,
        click: 0.2,
      });
    iron(s, 0.4, 640, 0.25, 0.25, 14);
    s.chime(0.48, D5, 0.2, 4).chime(0.58, A5, 0.2, 4);
  }),
  R(
    'sfx.phase.fallback',
    'greenhouse',
    'critical',
    900,
    'A room falls back to its fallback state',
    (s) => {
      s.tone({ dur: 0.9, f0: 60, gain: 0.25, attack: 0.05, release: 0.3 });
      s.tone({ dur: 0.25, f0: hz(A5), wave: 'tri', gain: 0.25, release: 0.05 });
      s.tone({ at: 0.3, dur: 0.4, f0: hz(F5), wave: 'tri', gain: 0.25, release: 0.15 });
    },
  ),
  R('sfx.phase.lost', 'greenhouse', 'critical', 1000, 'A Ledger asset is lost', (s) => {
    glass(s, 0, 0.5, 5);
    s.tone({ at: 0.2, dur: 0.25, f0: hz(D5), wave: 'tri', gain: 0.3, release: 0.05 });
    s.tone({
      at: 0.47,
      dur: 0.45,
      f0: hz(A4),
      f1: hz(A4 - 2),
      wave: 'tri',
      gain: 0.3,
      release: 0.2,
    });
  }),
  R('sfx.knockdown.rack', 'greenhouse', 'debris', 1000, 'The seedling rack topples', (s) => {
    s.creak({ dur: 0.25, r0: 40, r1: 18, f: 900, q: 9, gain: 0.35 });
    iron(s, 0.25, 430, 0.5, 0.5, 9);
    [0.3, 0.38, 0.47, 0.6].forEach((t, i) =>
      s.modal({
        at: t,
        f: 900 + 250 * i,
        modes: [
          [1, 1, 30],
          [2.1, 0.4, 45],
        ],
        gain: 0.25,
        dur: 0.18,
        click: 0.2,
      }),
    );
    grit(s, 0.3, 0.6, 0.35, 700);
  }),
  R('sfx.exact.jet', 'greenhouse', 'critical', 750, 'Purge jet warning (it fires next)', (s) => {
    s.noise({ dur: 0.7, c0: 2500, c1: 5000, q: 1, gain: 0.35, attack: 0.4, release: 0.05 });
    beepPair(s, 0, A5, A5, 0.25, 0.07);
    beepPair(s, 0.3, A5, A5, 0.25, 0.07);
  }),
  R('sfx.dash.jet', 'greenhouse', 'contact', 900, 'Purge jet fires', (s) => {
    s.noise({ dur: 0.85, c0: 1800, c1: 900, q: 0.5, gain: 0.8, attack: 0.01, release: 0.3 });
    water(s, 0.02, 0.8, 0.4, 700, 400);
  }),
  R(
    'sfx.run.redirect',
    'greenhouse',
    'confirm',
    650,
    'Purge jet redirected (valve turned)',
    (s) => {
      iron(s, 0, 760, 0.4, 0.3, 14);
      water(s, 0.05, 0.4, 0.3, 900, 500);
      s.chime(0.3, D5, 0.2, 4).chime(0.4, A5, 0.2, 4);
    },
  ),
  R('sfx.grab.strap', 'greenhouse', 'contact', 450, 'A strap is lashed (rack or shutter)', (s) => {
    ropeZip(s, 0, 0.18, 0.4, 1800, 3000);
    for (let k = 0; k < 3; k += 1)
      s.modal({
        at: 0.2 + k * 0.06,
        f: 2400,
        modes: [[1, 1, 90]],
        gain: 0.25,
        dur: 0.04,
        click: 0.15,
      });
  }),
  R('sfx.exact.draw', 'greenhouse', 'critical', 380, 'Grenade drill: a grenade is drawn', (s) => {
    cloth(s, 0, 0.15, 0.45);
    s.modal({
      at: 0.14,
      f: 2100,
      modes: [
        [1, 1, 70],
        [1.7, 0.4, 90],
      ],
      gain: 0.35,
      dur: 0.06,
      click: 0.2,
    });
    s.tone({ at: 0.22, dur: 0.1, f0: hz(D5 + 12), wave: 'tri', gain: 0.2, release: 0.03 });
  }),
  R('sfx.exact.arm', 'greenhouse', 'critical', 420, 'Grenade drill: the pin is pulled', (s) => {
    s.modal({
      f: 3300,
      modes: [
        [1, 1, 18],
        [1.52, 0.6, 22],
        [2.4, 0.3, 30],
      ],
      gain: 0.35,
      dur: 0.25,
      click: 0.3,
    });
    s.creak({ at: 0.04, dur: 0.06, r0: 300, f: 3800, q: 8, gain: 0.15 });
    s.tone({ at: 0.25, dur: 0.12, f0: hz(A5 + 12), wave: 'tri', gain: 0.22, release: 0.03 });
  }),
  R('sfx.exact.aim', 'greenhouse', 'critical', 420, 'Grenade drill: aiming a throw', (s) => {
    s.tone({
      dur: 0.35,
      f0: hz(A5),
      f1: hz(D5 + 12),
      wave: 'tri',
      gain: 0.22,
      attack: 0.03,
      release: 0.05,
    });
  }),
  R('sfx.throw.lob', 'greenhouse', 'contact', 420, 'Grenade drill: the grenade is thrown', (s) => {
    s.whoosh({ dur: 0.3, c0: 700, c1: 1800, gain: 0.5 });
  }),
  R(
    'sfx.exact.live',
    'greenhouse',
    'critical',
    800,
    'A live grenade is dropped (get clear)',
    (s) => {
      s.modal({
        f: 1600,
        modes: [
          [1, 1, 40],
          [2.4, 0.5, 60],
        ],
        gain: 0.45,
        dur: 0.12,
        click: 0.3,
      });
      s.modal({
        at: 0.13,
        f: 1700,
        modes: [
          [1, 1, 50],
          [2.4, 0.5, 70],
        ],
        gain: 0.3,
        dur: 0.1,
        click: 0.2,
      });
      for (let k = 0; k < 6; k += 1)
        s.tone({
          at: 0.25 + k * 0.09,
          dur: 0.05,
          f0: hz(D5 + 12 + (k % 2) * 7),
          wave: 'square',
          gain: 0.1,
          release: 0.015,
        });
    },
  ),
  R('sfx.ui.drop', 'greenhouse', 'ui', 320, 'Grenade drill: an unarmed grenade is dropped', (s) => {
    s.modal({
      f: 1500,
      modes: [
        [1, 1, 45],
        [2.4, 0.5, 60],
      ],
      gain: 0.4,
      dur: 0.12,
      click: 0.3,
    });
    s.modal({ at: 0.12, f: 1550, modes: [[1, 1, 60]], gain: 0.2, dur: 0.08, click: 0.15 });
    s.thud({ at: 0.0, f0: 200, f1: 120, dur: 0.06, gain: 0.3 });
  }),
  R('sfx.rescue.secure', 'greenhouse', 'confirm', 600, 'Grenade secured', (s) => {
    s.modal({ f: 2200, modes: [[1, 1, 80]], gain: 0.3, dur: 0.05, click: 0.25 });
    s.chime(0.08, A4, 0.22, 5).chime(0.16, D5, 0.22, 5).chime(0.24, A5, 0.2, 5);
  }),
  R(
    'sfx.throw.grenade',
    'greenhouse',
    'contact',
    500,
    'A grenade is returned away from people',
    (s) => {
      s.whoosh({ dur: 0.28, c0: 600, c1: 1700, gain: 0.55 });
      s.modal({
        at: 0.3,
        f: 1450,
        modes: [
          [1, 1, 45],
          [2.4, 0.5, 60],
        ],
        gain: 0.3,
        dur: 0.12,
        click: 0.2,
      });
    },
  ),
  R(
    'sfx.crush.blast',
    'greenhouse',
    'critical',
    1600,
    'Grenade blast (stuns, breaks glass)',
    (s) => {
      s.noise({ dur: 0.02, c0: 2500, q: 0.4, gain: 0.7, decay: 120, mode: 'high' });
      s.noise({
        dur: 0.9,
        c0: 500,
        c1: 120,
        q: 0.6,
        gain: 1,
        attack: 0.002,
        decay: 5,
        mode: 'low',
      });
      s.thud({ f0: 70, f1: 28, dur: 0.8, gain: 1 });
      glass(s, 0.08, 0.35, 10);
      s.drive(2);
      s.echo(0.2, 0.3, 0.25, 0.6);
    },
    -11,
  ),
];
