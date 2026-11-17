/**
 * Stage 3 sound effects made in code (Stage 3 spec §9–§13 and §16.3, roadmap M27/M28).
 * The palette follows the *Mist and Resolve* brief: wood and stone percussion, hoof
 * rhythm, rope and timber, a formant voice for the horse and the bandits, a short
 * mountain echo, and minor-pentatonic chimes for confirmations beside the village motif.
 * Gameplay triggers arrive with the Stage 3 systems (M27); until then the Lab plays them.
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
  beepPair,
  bodyFall,
  cloth,
  gallopTimes,
  grit,
  grunt,
  hoof,
  hooves,
  hz,
  iron,
  leather,
  ropeZip,
  shout,
  snort,
  splinter,
  whinny,
  whistle,
  wood,
} from './sfxKit.ts';

export const STAGE3_RECIPES: readonly Recipe[] = [
  // ---- Mountain horse (spec §9) -------------------------------------------------------
  R('sfx.horse.mount', 'horse', 'contact', 700, 'A hero mounts a horse', (s) => {
    cloth(s, 0, 0.18, 0.3);
    leather(s, 0.12, 0.35, 0.5);
    s.thud({ at: 0.2, f0: 110, dur: 0.18, gain: 0.5 });
    hooves(s, [0.34, 0.48], () => 0.45);
  }),
  R('sfx.horse.dismount', 'horse', 'debris', 450, 'A hero dismounts', (s) => {
    leather(s, 0, 0.18, 0.35);
    cloth(s, 0.02, 0.15, 0.25);
    s.thud({ at: 0.2, f0: 130, f1: 70, dur: 0.12, gain: 0.6 });
    grit(s, 0.2, 0.2, 0.35, 900);
    s.modal({
      at: 0.22,
      f: 3100,
      modes: [
        [1, 1, 40],
        [1.5, 0.6, 50],
      ],
      gain: 0.08,
      dur: 0.2,
    });
  }),
  R('sfx.horse.trot', 'horse', 'crowd', 900, 'Mounted movement at trot speed', (s) => {
    hooves(s, [0, 0.21, 0.42, 0.63], (i) => (i % 2 ? 0.7 : 0.9));
    leather(s, 0.05, 0.8, 0.12);
  }),
  R('sfx.horse.gallop', 'horse', 'crowd', 1000, 'Mounted movement at gallop on the trail', (s) => {
    hooves(s, gallopTimes(0, 2), (i) => [0.8, 0.65, 1][i % 3]!);
    leather(s, 0.05, 0.9, 0.1);
  }),
  R(
    'sfx.horse.gallop-stone',
    'horse',
    'crowd',
    1000,
    'Gallop on quarry stone (Echo Quarry pursuit)',
    (s) => {
      hooves(s, gallopTimes(0, 2), (i) => [0.8, 0.65, 1][i % 3]!, true);
      s.echo(0.11, 0.25, 0.25);
    },
  ),
  R('sfx.horse.whinny', 'horse', 'confirm', 1300, 'Horse call (arrival, Lab)', (s) => {
    whinny(s, 0, 1.2, 0.6);
    s.echo(0.23, 0.2, 0.15);
  }),
  R('sfx.horse.snort', 'horse', 'debris', 450, 'Idle horse, after a stop', (s) => snort(s, 0, 0.7)),
  R(
    'sfx.horse.strike',
    'horse',
    'contact',
    380,
    'Mounted attack (bike kit actions with horse timing)',
    (s) => {
      s.whoosh({ dur: 0.18, c0: 500, c1: 1500, gain: 0.5 });
      hoof(s, 0.12, 1);
      s.thud({ at: 0.13, f0: 180, f1: 70, dur: 0.2, gain: 0.7 });
    },
  ),
  R(
    'sfx.horse.stumble',
    'horse',
    'contact',
    800,
    'Horse loses Stability from a hit or collision',
    (s) => {
      hooves(s, [0, 0.06, 0.11, 0.2], (i) => 0.9 - i * 0.12);
      s.noise({ dur: 0.3, c0: 2400, c1: 900, q: 0.8, gain: 0.35, decay: 6 });
      snort(s, 0.32, 0.6);
    },
  ),
  R('sfx.horse.stability-low', 'horse', 'critical', 700, 'Stability is low: warning', (s) => {
    beepPair(s, 0, A4, F4, 0.35, 0.11);
    snort(s, 0.3, 0.5);
  }),
  R(
    'sfx.horse.disengage',
    'horse',
    'critical',
    1800,
    'Stability at zero: the horse leaves safely',
    (s) => {
      whinny(s, 0, 0.9, 0.55);
      hooves(s, gallopTimes(0.7, 3, 0.36), (i) => 0.8 * Math.pow(0.84, i));
      s.echo(0.21, 0.25, 0.2);
    },
  ),
  R(
    'sfx.horse.return',
    'horse',
    'confirm',
    1500,
    'Replacement horse arrives (after An Bo) or the horse returns',
    (s) => {
      hooves(s, [0, 0.21, 0.42, 0.63, 0.84], (i) => 0.25 + i * 0.15);
      snort(s, 0.95, 0.45);
      s.chime(1.0, D5, 0.18).chime(1.12, A5, 0.14);
    },
  ),

  // ---- Weapons (spec §10.1) ----------------------------------------------------------
  R('sfx.pickup.weapon', 'weapons', 'ui', 260, 'A weapon is picked up (J)', (s) => {
    cloth(s, 0, 0.1, 0.3);
    wood(s, 0.06, 520, 0.35, 0.2);
  }),
  R(
    'sfx.gear.drop',
    'weapons',
    'debris',
    600,
    'A weapon is dropped, thrown aside or lands',
    (s) => {
      [0, 0.17, 0.29, 0.37].forEach((t, i) =>
        wood(s, t, 480 + 60 * i, 0.5 * Math.pow(0.6, i), 0.25),
      );
      grit(s, 0, 0.45, 0.15);
    },
  ),
  R('sfx.staff.swing', 'weapons', 'contact', 260, 'Hiking Staff swing', (s) => {
    s.whoosh({ dur: 0.22, c0: 700, c1: 1700, gain: 0.7, q: 1.5 });
  }),
  R('sfx.staff.hit', 'weapons', 'contact', 260, 'Hiking Staff hit', (s) => {
    wood(s, 0, 430, 0.7, 0.25);
    s.thud({ f0: 160, dur: 0.12, gain: 0.5 });
  }),
  R('sfx.staff.break', 'weapons', 'debris', 600, 'Hiking Staff breaks (durability)', (s) => {
    splinter(s, 0, 0.9, 0.3);
    wood(s, 0.28, 610, 0.3, 0.2);
    wood(s, 0.4, 560, 0.2, 0.18);
  }),
  R('sfx.axe.swing', 'weapons', 'contact', 340, 'Wood Axe swing (committed)', (s) => {
    s.whoosh({ dur: 0.3, c0: 380, c1: 1100, gain: 0.75, q: 1.3, skew: 0.9 });
    s.tone({ dur: 0.3, f0: 95, f1: 130, gain: 0.1, bell: 0.9 });
  }),
  R('sfx.axe.hit', 'weapons', 'contact', 380, 'Wood Axe hit (blunt side)', (s) => {
    s.thud({ f0: 170, f1: 60, dur: 0.22, gain: 0.8 });
    iron(s, 0, 1240, 0.18, 0.35, 14);
    s.drive(1.4);
  }),
  R('sfx.axe.chop', 'weapons', 'debris', 450, 'Wood Axe bites timber or a barrier', (s) => {
    wood(s, 0, 260, 0.7, 0.35);
    s.thud({ f0: 140, dur: 0.15, gain: 0.5 });
    s.crackle({ at: 0.01, dur: 0.25, rate: 1200, c: 1500, gain: 0.4, decay: 14 });
  }),
  R('sfx.axe.break', 'weapons', 'debris', 650, 'Wood Axe handle breaks', (s) => {
    splinter(s, 0, 0.9, 0.3);
    iron(s, 0.3, 980, 0.25, 0.3, 16);
    iron(s, 0.44, 1010, 0.12, 0.2, 18);
  }),
  R('sfx.hammer.swing', 'weapons', 'contact', 450, 'Quarry Hammer swing (slow)', (s) => {
    s.whoosh({ dur: 0.4, c0: 260, c1: 700, gain: 0.8, q: 1.1, skew: 1.1 });
    s.tone({ dur: 0.4, f0: 70, f1: 100, gain: 0.15, bell: 1.1 });
  }),
  R('sfx.hammer.hit', 'weapons', 'contact', 550, 'Quarry Hammer impact', (s) => {
    s.thud({ f0: 120, f1: 40, dur: 0.38, gain: 1 });
    iron(s, 0, 640, 0.2, 0.45, 8);
    grit(s, 0.01, 0.3, 0.2);
    s.drive(1.6);
  }),
  R(
    'sfx.hammer.ground',
    'weapons',
    'debris',
    1000,
    'Quarry Hammer hits stone (environment)',
    (s) => {
      s.thud({ f0: 100, f1: 36, dur: 0.45, gain: 1 });
      s.modal({
        at: 0,
        f: 820,
        modes: [
          [1, 1, 30],
          [1.9, 0.6, 40],
          [3.1, 0.4, 55],
        ],
        gain: 0.3,
        dur: 0.3,
        click: 0.4,
      });
      grit(s, 0.02, 0.6, 0.35, 900);
      s.echo(0.19, 0.3, 0.3);
      s.drive(1.4);
    },
  ),
  R(
    'sfx.revolver.aim',
    'weapons',
    'critical',
    450,
    'Revolver raised: the shot warning (captioned)',
    (s) => {
      s.modal({
        at: 0,
        f: 2600,
        modes: [
          [1, 1, 90],
          [1.7, 0.5, 120],
        ],
        gain: 0.3,
        dur: 0.06,
        click: 0.2,
      });
      s.creak({ at: 0.04, dur: 0.08, r0: 260, f: 3200, q: 8, gain: 0.25 });
      s.modal({
        at: 0.13,
        f: 2200,
        modes: [
          [1, 1, 70],
          [1.6, 0.6, 90],
        ],
        gain: 0.5,
        dur: 0.08,
        click: 0.4,
      });
      beepPair(s, 0.2, D5 + 12, A5, 0.12, 0.07);
    },
  ),
  R(
    'sfx.revolver.shot',
    'weapons',
    'weapon',
    1300,
    'Revolver shot (five rounds, no reload)',
    (s) => {
      s.noise({ dur: 0.01, c0: 3000, q: 0.4, gain: 0.6, decay: 250, mode: 'high' });
      s.noise({ dur: 0.2, c0: 1200, c1: 400, q: 0.6, gain: 0.9, decay: 24 });
      s.noise({ dur: 0.3, c0: 700, q: 0.7, gain: 1, decay: 18, mode: 'low' });
      s.thud({ f0: 150, f1: 50, dur: 0.3, gain: 1 });
      s.drive(2.2);
      s.echo(0.26, 0.4, 0.3, 0.6);
    },
    -11,
  ),
  R(
    'sfx.revolver.empty',
    'weapons',
    'weapon',
    220,
    'Revolver with no rounds left (still throwable)',
    (s) => {
      s.modal({
        f: 2400,
        modes: [
          [1, 1, 110],
          [1.8, 0.5, 140],
        ],
        gain: 0.5,
        dur: 0.06,
        click: 0.3,
      });
      s.creak({ at: 0.03, dur: 0.06, r0: 300, f: 3500, q: 8, gain: 0.15 });
    },
  ),
  R('sfx.revolver.ricochet', 'weapons', 'debris', 550, 'A round strikes rock', (s) => {
    grit(s, 0, 0.15, 0.4, 1500);
    s.tone({
      at: 0.01,
      dur: 0.45,
      f0: 2600,
      f1: 900,
      gain: 0.25,
      attack: 0.002,
      decay: 5,
      vib: 0.02,
      vibRate: 30,
    });
    s.echo(0.17, 0.25, 0.2);
  }),

  // ---- Enemies (spec §11) ------------------------------------------------------------
  R('sfx.ambusher.dash', 'enemies', 'crowd', 350, 'Trail Ambusher sprints or flanks', (s) => {
    s.noise({ dur: 0.28, c0: 1800, c1: 900, q: 0.6, gain: 0.5, attack: 0.01, decay: 8 });
    grit(s, 0.02, 0.3, 0.35, 1100);
  }),
  R(
    'sfx.ambusher.flank',
    'enemies',
    'critical',
    450,
    'Trail Ambusher flank tell (whistle)',
    (s) => {
      whistle(s, 0, 0.12, 1900, 2300, 0.4);
      whistle(s, 0.17, 0.2, 2300, 1950, 0.4);
    },
  ),
  R('sfx.bruiser.windup', 'enemies', 'critical', 650, 'Quarry Bruiser heavy wind-up tell', (s) => {
    grunt(s, 0, 0.55, 0.6, 92);
    leather(s, 0.05, 0.4, 0.3);
    s.tone({ dur: 0.6, f0: 55, f1: 75, gain: 0.25, bell: 1.3 });
  }),
  R('sfx.bruiser.slam', 'enemies', 'contact', 800, 'Quarry Bruiser slam', (s) => {
    s.thud({ f0: 110, f1: 38, dur: 0.45, gain: 1 });
    grit(s, 0.01, 0.55, 0.4, 800);
    s.echo(0.2, 0.25, 0.22);
    s.drive(1.5);
  }),
  R(
    'sfx.rope.twirl',
    'enemies',
    'critical',
    900,
    'Rope Trapper set-up tell (lasso twirls)',
    (s) => {
      for (let k = 0; k < 3; k += 1)
        s.whoosh({ at: k * 0.27, dur: 0.24, c0: 800, c1: 1900, gain: 0.35 + 0.12 * k, q: 2 });
    },
  ),
  R('sfx.rope.throw', 'enemies', 'contact', 380, 'Rope Trapper throw', (s) => {
    ropeZip(s, 0, 0.26, 0.5);
    s.noise({ at: 0.25, dur: 0.03, c0: 3000, q: 0.5, gain: 0.9, decay: 120 });
  }),
  R(
    'sfx.rope.bind',
    'enemies',
    'critical',
    550,
    'Restraint lands (escape or partner rescue)',
    (s) => {
      s.creak({ dur: 0.3, r0: 80, r1: 160, f: 900, q: 8, gain: 0.5, attack: 0.01 });
      cloth(s, 0, 0.2, 0.35);
      beepPair(s, 0.22, F4 + 12, D5, 0.18, 0.08);
    },
  ),
  R('sfx.rope.escape', 'enemies', 'confirm', 450, 'Restraint broken free', (s) => {
    s.creak({ dur: 0.18, r0: 120, r1: 220, f: 1100, q: 8, gain: 0.4 });
    s.noise({ at: 0.17, dur: 0.06, c0: 2400, q: 0.6, gain: 0.6, decay: 60 });
    s.chime(0.2, A4, 0.2, 6).chime(0.28, D5, 0.18, 6);
  }),
  R(
    'sfx.rope.taut',
    'enemies',
    'critical',
    750,
    'Hostile action: a rope line pulled taut near captives',
    (s) => {
      s.creak({ dur: 0.7, r0: 30, r1: 120, f: 700, q: 10, gain: 0.6, attack: 0.05, release: 0.1 });
      s.tone({ dur: 0.7, f0: 180, f1: 240, gain: 0.08, wave: 'tri', bell: 0.8 });
    },
  ),
  R('sfx.raider.charge', 'enemies', 'critical', 1100, 'Mounted Raider charge tell', (s) => {
    shout(s, 0, 0.5);
    hooves(s, gallopTimes(0.25, 2, 0.36), (i) => 0.5 + i * 0.08);
  }),
  R(
    'sfx.raider.disengage',
    'enemies',
    'crowd',
    1500,
    'Raider horse breaks off at zero Stability (never dies)',
    (s) => {
      whinny(s, 0, 0.7, 0.4);
      hooves(s, gallopTimes(0.55, 2, 0.4), (i) => 0.6 * Math.pow(0.8, i));
    },
  ),
  R(
    'sfx.stalker.feint',
    'enemies',
    'crowd',
    320,
    'Ridge Stalker feint (timing only, tell kept)',
    (s) => {
      s.whoosh({ dur: 0.15, c0: 1500, c1: 2600, gain: 0.3, q: 1.8 });
      s.crackle({ at: 0.1, dur: 0.15, rate: 120, c: 3200, gain: 0.4, decay: 15 });
    },
  ),
  R('sfx.stalker.strike', 'enemies', 'contact', 320, 'Ridge Stalker real strike', (s) => {
    s.whoosh({ dur: 0.12, c0: 900, c1: 2400, gain: 0.6, q: 1.6, skew: 0.5 });
    s.thud({ at: 0.11, f0: 200, f1: 80, dur: 0.15, gain: 0.7 });
  }),
  R(
    'sfx.captain.order',
    'enemies',
    'critical',
    600,
    'Pack Captain flank order (two-note whistle)',
    (s) => {
      whistle(s, 0, 0.18, hz(D5 + 12), hz(D5 + 12), 0.45);
      whistle(s, 0.24, 0.28, hz(A5), hz(A5 + 5), 0.45);
    },
  ),
  R(
    'sfx.captain.broken',
    'enemies',
    'confirm',
    500,
    'Command benefit broken (separation, interrupt, defeat)',
    (s) => {
      whistle(s, 0, 0.3, hz(A5), hz(D5), 0.3);
      s.chime(0.25, D5, 0.2, 7);
    },
  ),

  // ---- Garran Voss and the Quarry Hookstaff (spec §12) --------------------------------
  R('sfx.hookstaff.sweep', 'garran', 'contact', 600, 'Hookstaff long sweep', (s) => {
    s.whoosh({ dur: 0.5, c0: 280, c1: 1300, gain: 0.85, q: 1.1, skew: 0.8 });
    iron(s, 0.42, 1500, 0.08, 0.15, 20);
  }),
  R('sfx.hookstaff.thrust', 'garran', 'contact', 300, 'Hookstaff guarded thrust', (s) => {
    s.whoosh({ dur: 0.14, c0: 900, c1: 2000, gain: 0.6, skew: 0.4 });
    wood(s, 0.13, 380, 0.5, 0.18);
  }),
  R('sfx.hookstaff.hook', 'garran', 'critical', 650, 'Hooked pull (partner can interrupt)', (s) => {
    iron(s, 0, 1750, 0.35, 0.4, 12);
    cloth(s, 0.03, 0.15, 0.4);
    s.noise({ at: 0.12, dur: 0.35, c0: 600, c1: 1500, q: 1.2, gain: 0.45, bell: 0.5 });
    grunt(s, 0.12, 0.35, 0.4, 98);
  }),
  R('sfx.hookstaff.clash', 'garran', 'contact', 450, 'Hookstaff clash or guard', (s) => {
    wood(s, 0, 360, 0.6, 0.3);
    iron(s, 0, 1380, 0.25, 0.4, 10);
  }),
  R(
    'sfx.hookstaff.disarm',
    'garran',
    'confirm',
    1100,
    'Garran is disarmed: the Hookstaff clatters away',
    (s) => {
      iron(s, 0, 1600, 0.35, 0.4, 12);
      [0.3, 0.52, 0.66, 0.75].forEach((t, i) => {
        wood(s, t, 340 + 30 * i, 0.55 * Math.pow(0.6, i), 0.25);
        iron(s, t + 0.01, 1450 + 80 * i, 0.15 * Math.pow(0.6, i), 0.2, 16);
      });
      s.chime(0.32, D5, 0.18, 4).chime(0.44, A5, 0.14, 4);
    },
  ),
  R(
    'sfx.hookstaff.break',
    'garran',
    'critical',
    900,
    'The Hookstaff breaks (Museum: The Broken Hookstaff)',
    (s) => {
      splinter(s, 0, 1, 0.45);
      s.thud({ f0: 180, f1: 60, dur: 0.25, gain: 0.7 });
      iron(s, 0.38, 1300, 0.3, 0.45, 9);
      s.echo(0.2, 0.25, 0.2);
    },
  ),
  R('sfx.garran.clinch', 'garran', 'critical', 500, 'Collar tie / clinch grab (breakable)', (s) => {
    cloth(s, 0, 0.2, 0.6);
    s.thud({ at: 0.05, f0: 140, f1: 80, dur: 0.12, gain: 0.5 });
    grunt(s, 0.08, 0.32, 0.5, 100);
  }),
  R('sfx.garran.cast', 'garran', 'contact', 850, 'Shoulder throw (Clinch and Cast)', (s) => {
    grunt(s, 0, 0.3, 0.45, 96);
    s.whoosh({ at: 0.1, dur: 0.35, c0: 300, c1: 900, gain: 0.6 });
    bodyFall(s, 0.42, 1);
  }),
  R('sfx.garran.trip', 'garran', 'contact', 550, 'Low trip or sweep to the ground', (s) => {
    s.whoosh({ dur: 0.16, c0: 600, c1: 1400, gain: 0.5, skew: 0.5 });
    bodyFall(s, 0.16, 0.85);
  }),
  R('sfx.garran.roar', 'garran', 'critical', 950, 'Garran phase change or big tell', (s) => {
    s.voice({
      dur: 0.85,
      gain: 0.6,
      attack: 0.05,
      release: 0.2,
      pitch: (k) => 88 + 40 * Math.sin(Math.PI * Math.min(1, k * 1.3)),
      rough: 0.06,
      breath: 0.7,
      formants: [
        [520, 3, 1],
        [950, 4, 0.7],
        [2400, 5, 0.25],
      ],
    });
    s.tone({ dur: 0.9, f0: 46, f1: 41, gain: 0.3, bell: 0.6 });
    s.echo(0.24, 0.3, 0.25);
  }),
  R(
    'sfx.garran.resolve-break',
    'garran',
    'confirm',
    1200,
    'Garran Resolve break (capture window)',
    (s) => {
      s.thud({ f0: 90, f1: 40, dur: 0.5, gain: 0.8 });
      s.noise({ at: 0.08, dur: 0.6, c0: 900, c1: 350, q: 0.9, gain: 0.35, attack: 0.03, decay: 4 });
      s.chime(0.15, D4 + 12, 0.25, 3)
        .chime(0.3, A4, 0.22, 3)
        .chime(0.45, F4 + 12, 0.2, 3);
    },
  ),
  R('sfx.garran.restrain', 'garran', 'confirm', 850, 'Garran restrained (live capture)', (s) => {
    ropeZip(s, 0, 0.3, 0.45, 900, 2200);
    s.creak({ at: 0.3, dur: 0.25, r0: 90, r1: 180, f: 850, q: 9, gain: 0.5 });
    s.chime(0.55, D5, 0.18, 5);
  }),
  R('sfx.garran.radio', 'garran', 'ui', 750, "Garran's compact radio (intercept, orders)", (s) => {
    s.noise({ dur: 0.12, c0: 2200, q: 0.7, gain: 0.5, attack: 0.002, release: 0.01 });
    s.noise({ at: 0.12, dur: 0.45, c0: 1700, q: 0.9, gain: 0.18, release: 0.05 });
    s.tone({ at: 0.6, dur: 0.1, f0: 1400, wave: 'square', gain: 0.08, release: 0.02 });
  }),

  // ---- Environment (spec §13) --------------------------------------------------------
  R(
    'sfx.scaffold.creak',
    'environment',
    'debris',
    1100,
    'Quarry scaffold damaged: creaks under load',
    (s) => {
      s.creak({ dur: 1.05, r0: 28, r1: 14, f: 520, q: 9, gain: 0.6, attack: 0.08, release: 0.2 });
      s.creak({
        at: 0.35,
        dur: 0.5,
        r0: 40,
        r1: 22,
        f: 760,
        q: 9,
        gain: 0.3,
        attack: 0.05,
        release: 0.15,
      });
    },
  ),
  R(
    'sfx.scaffold.crack',
    'environment',
    'critical',
    550,
    'Scaffold reaches the critical state (warning)',
    (s) => {
      splinter(s, 0, 0.8, 0.25);
      s.creak({ at: 0.15, dur: 0.35, r0: 40, r1: 20, f: 600, q: 9, gain: 0.45 });
      s.echo(0.17, 0.2, 0.2);
    },
  ),
  R(
    'sfx.scaffold.collapse',
    'environment',
    'critical',
    1900,
    'Scaffold breaks and comes down',
    (s) => {
      splinter(s, 0, 1, 0.4);
      [0.25, 0.42, 0.55, 0.8, 1.05].forEach((t, i) => {
        wood(s, t, 220 + 50 * ((i * 7) % 3), 0.7 * Math.pow(0.78, i), 0.35);
        s.thud({ at: t, f0: 120, f1: 50, dur: 0.2, gain: 0.5 * Math.pow(0.8, i) });
      });
      grit(s, 0.3, 1.3, 0.35, 900);
      s.echo(0.23, 0.35, 0.3);
    },
  ),
  R(
    'sfx.scaffold.hit',
    'environment',
    'contact',
    420,
    'A fighter is driven into a scaffold',
    (s) => {
      wood(s, 0, 240, 0.8, 0.35);
      s.thud({ f0: 140, dur: 0.2, gain: 0.6 });
      s.creak({ at: 0.1, dur: 0.25, r0: 35, f: 560, q: 9, gain: 0.25 });
    },
  ),
  R('sfx.winch.warn', 'environment', 'critical', 950, 'Winch Pressure: activation warning', (s) => {
    for (let k = 0; k < 8; k += 1) {
      // Ratchet clicks speeding up (each gap 18 % shorter), then two bell strikes.
      const t = (0.09 * (1 - Math.pow(0.82, k))) / 0.18;
      s.modal({
        at: t,
        f: 2100,
        modes: [
          [1, 1, 90],
          [1.5, 0.5, 120],
        ],
        gain: 0.3,
        dur: 0.05,
        click: 0.2,
      });
    }
    s.modal({
      at: 0.5,
      f: hz(A5),
      modes: [
        [1, 1, 5],
        [2.76, 0.4, 8],
        [5.4, 0.2, 12],
      ],
      gain: 0.35,
      dur: 0.45,
    });
    s.modal({
      at: 0.68,
      f: hz(A5),
      modes: [
        [1, 1, 5],
        [2.76, 0.4, 8],
        [5.4, 0.2, 12],
      ],
      gain: 0.35,
      dur: 0.27,
    });
  }),
  R('sfx.winch.crank', 'environment', 'debris', 800, 'Winch ratchet turning', (s) => {
    for (let k = 0; k < 9; k += 1) {
      s.modal({
        at: k * 0.085,
        f: 1900 + 100 * (k % 2),
        modes: [
          [1, 1, 80],
          [1.6, 0.6, 100],
        ],
        gain: 0.3,
        dur: 0.06,
        click: 0.25,
      });
    }
    s.creak({ dur: 0.78, r0: 60, f: 300, q: 5, gain: 0.25, attack: 0.05, release: 0.1 });
  }),
  R(
    'sfx.winch.release',
    'environment',
    'critical',
    1000,
    'Winch line released: cargo moves',
    (s) => {
      s.modal({
        f: 1100,
        modes: [
          [1, 1, 30],
          [2.2, 0.5, 40],
        ],
        gain: 0.5,
        dur: 0.15,
        click: 0.5,
      });
      ropeZip(s, 0.05, 0.6, 0.55, 800, 2600);
      iron(s, 0.68, 420, 0.5, 0.3, 12);
      s.thud({ at: 0.68, f0: 110, dur: 0.25, gain: 0.7 });
    },
  ),
  R(
    'sfx.winch.redirect',
    'environment',
    'confirm',
    900,
    'A winch activation redirected (grade: winch redirects)',
    (s) => {
      iron(s, 0, 900, 0.4, 0.3, 14);
      s.thud({ f0: 130, dur: 0.18, gain: 0.5 });
      s.chime(0.12, D5, 0.22, 4).chime(0.22, F5, 0.2, 4).chime(0.32, A5, 0.2, 4);
    },
  ),
  R('sfx.cargo.swing', 'environment', 'debris', 1000, 'Hanging cargo swings on its line', (s) => {
    s.whoosh({ dur: 0.9, c0: 200, c1: 450, gain: 0.5, q: 0.9, skew: 1 });
    s.creak({ dur: 0.9, r0: 22, r1: 12, f: 480, q: 9, gain: 0.35, bell: 0.7 });
  }),
  R('sfx.cargo.drop', 'environment', 'contact', 1200, 'Cargo crate lands', (s) => {
    s.thud({ f0: 90, f1: 34, dur: 0.5, gain: 1 });
    wood(s, 0, 180, 0.6, 0.4);
    s.crackle({ at: 0.02, dur: 0.3, rate: 900, c: 1400, gain: 0.35, decay: 12 });
    grit(s, 0.03, 0.7, 0.3, 700);
    s.echo(0.22, 0.3, 0.25);
    s.drive(1.3);
  }),
  R('sfx.cart.roll', 'environment', 'debris', 1300, 'Quarry cart rolling on rails', (s) => {
    s.noise({ dur: 1.25, c0: 160, q: 0.7, gain: 0.6, attack: 0.15, release: 0.25, mode: 'low' });
    for (let k = 0; k < 6; k += 1) {
      const t = 0.12 + k * 0.19;
      s.modal({
        at: t,
        f: 900,
        modes: [
          [1, 1, 60],
          [2.3, 0.4, 80],
        ],
        gain: 0.2,
        dur: 0.06,
      });
      s.modal({
        at: t + 0.05,
        f: 950,
        modes: [
          [1, 1, 60],
          [2.3, 0.4, 80],
        ],
        gain: 0.15,
        dur: 0.06,
      });
    }
    s.tone({ dur: 1.25, f0: 2800, f1: 3100, gain: 0.02, bell: 0.5, vib: 0.01, vibRate: 13 });
  }),
  R(
    'sfx.cart.impact',
    'environment',
    'contact',
    750,
    'Cart hits a stop, a wall or a fighter',
    (s) => {
      iron(s, 0, 520, 0.6, 0.5, 8);
      s.thud({ f0: 110, f1: 40, dur: 0.35, gain: 0.9 });
      grit(s, 0.02, 0.4, 0.3);
      s.drive(1.4);
    },
  ),
  R('sfx.stone.loose', 'environment', 'debris', 900, 'Loose stone falls or scatters', (s) => {
    for (let k = 0; k < 10; k += 1) {
      const t = 0.03 * k + 0.6 * Math.pow(k / 10, 1.6);
      s.modal({
        at: t,
        f: 1100 + 900 * s.r01(),
        modes: [
          [1, 1, 70],
          [1.7, 0.5, 90],
        ],
        gain: 0.18 * (1 - k / 13),
        dur: 0.08,
        click: 0.1,
      });
    }
    grit(s, 0, 0.8, 0.3, 700);
  }),
  R('sfx.timber.break', 'environment', 'debris', 700, 'Timber barrier or cover breaks', (s) => {
    splinter(s, 0, 1, 0.45);
    wood(s, 0.2, 300, 0.4, 0.3);
    wood(s, 0.34, 260, 0.25, 0.25);
  }),
  R(
    'sfx.wall.impact',
    'environment',
    'contact',
    650,
    'A fighter hits a retaining wall or rail',
    (s) => {
      s.thud({ f0: 130, f1: 45, dur: 0.35, gain: 1 });
      grit(s, 0.02, 0.45, 0.35, 900);
      s.echo(0.15, 0.2, 0.18);
    },
  ),

  // ---- Rescue, research and Stage 3 objectives (spec §6, §7, §14) ---------------------
  R(
    'sfx.hostage.warn',
    'rescue',
    'critical',
    750,
    'Hostage warning: a hostile action starts near a group',
    (s) => {
      for (let k = 0; k < 3; k += 1) beepPair(s, k * 0.22, A5, F5, 0.3, 0.06);
    },
  ),
  R(
    'sfx.hostage.interrupt',
    'rescue',
    'confirm',
    500,
    'Hostile action interrupted (counts never)',
    (s) => {
      s.thud({ f0: 160, dur: 0.12, gain: 0.4 });
      s.chime(0.04, A4, 0.25, 6).chime(0.12, D5, 0.25, 6);
    },
  ),
  R('sfx.hostage.freed', 'rescue', 'confirm', 1300, 'A rescue group is freed', (s) => {
    ropeZip(s, 0, 0.18, 0.3, 1500, 900);
    s.thud({ at: 0.18, f0: 120, dur: 0.12, gain: 0.3 });
    [D4 + 12, F4 + 12, G4 + 12, A4 + 12].forEach((n, i) => s.chime(0.22 + i * 0.11, n, 0.24, 3));
  }),
  R(
    'sfx.hostage.strained',
    'rescue',
    'critical',
    700,
    'A hostile action completed (condition falls)',
    (s) => {
      s.tone({ dur: 0.22, f0: hz(D5), wave: 'tri', gain: 0.3, release: 0.05 });
      s.tone({
        at: 0.24,
        dur: 0.38,
        f0: hz(A4),
        f1: hz(A4 - 1),
        wave: 'tri',
        gain: 0.3,
        release: 0.15,
      });
    },
  ),
  R('sfx.research.documented', 'rescue', 'confirm', 750, 'Research sample documented', (s) => {
    s.noise({ dur: 0.06, c0: 5000, q: 1, gain: 0.25, decay: 60 });
    s.modal({ at: 0.05, f: 2800, modes: [[1, 1, 100]], gain: 0.2, dur: 0.04, click: 0.2 });
    s.chime(0.12, D5, 0.22, 4).chime(0.24, A5, 0.18, 4);
  }),
  R('sfx.research.disturbed', 'rescue', 'critical', 700, 'Research record disturbed', (s) => {
    s.crackle({ dur: 0.3, rate: 900, c: 5200, q: 1.2, gain: 0.35, decay: 8 });
    s.thud({ at: 0.05, f0: 140, dur: 0.2, gain: 0.4 });
    s.tone({ at: 0.18, dur: 0.45, f0: hz(F4), f1: hz(D4), wave: 'tri', gain: 0.25, release: 0.15 });
  }),
  R('sfx.research.recovered', 'rescue', 'confirm', 750, 'Disturbed record recovered', (s) => {
    s.crackle({ dur: 0.2, rate: 700, c: 5200, q: 1.2, gain: 0.25, decay: 10 });
    s.chime(0.1, A4, 0.2, 4).chime(0.22, D5, 0.2, 4);
  }),
  R(
    'sfx.bell.rescue',
    'rescue',
    'confirm',
    2600,
    'Qinglan Rescue Bell (rescue complete, Museum artifact)',
    (s) => {
      const bell = [
        [0.5, 0.6, 1.2],
        [1, 1, 1.6],
        [1.183, 0.5, 2.2],
        [1.506, 0.45, 2.6],
        [2, 0.35, 3.2],
        [2.74, 0.2, 4],
        [3.0, 0.15, 4.5],
      ] as const;
      s.modal({ f: hz(D5), modes: bell, gain: 0.35, dur: 2.6, click: 0.15 });
      s.echo(0.31, 0.3, 0.2, 0.5);
    },
  ),
  R('sfx.signal.static', 'rescue', 'ui', 1000, 'Signal Hut radio static (branch)', (s) => {
    s.noise({ dur: 0.95, c0: 1800, q: 0.5, gain: 0.35, attack: 0.05, release: 0.1 });
    s.crackle({ dur: 0.95, rate: 60, c: 2500, q: 0.8, gain: 0.6, mode: 'high' });
    s.tone({ dur: 0.95, f0: 900, f1: 1300, gain: 0.04, wave: 'sine', vib: 0.2, vibRate: 3 });
  }),
  R(
    'sfx.signal.restored',
    'rescue',
    'confirm',
    1100,
    'Signal restored (Signal Hut branch complete)',
    (s) => {
      s.noise({ dur: 0.35, c0: 1800, q: 0.5, gain: 0.3, decay: 7 });
      s.tone({ at: 0.3, dur: 0.1, f0: 1320, wave: 'sine', gain: 0.25, release: 0.02 });
      s.tone({ at: 0.45, dur: 0.1, f0: 1320, wave: 'sine', gain: 0.25, release: 0.02 });
      s.chime(0.62, D5, 0.2, 4).chime(0.72, A5, 0.2, 4);
    },
  ),
  R(
    'sfx.invoice.found',
    'rescue',
    'confirm',
    1600,
    'The damaged invoice is found (Sponsor Dossier)',
    (s) => {
      s.crackle({ dur: 0.45, rate: 1200, c: 4800, q: 1, gain: 0.3, bell: 0.6 });
      s.noise({ dur: 0.45, c0: 3500, q: 0.5, gain: 0.1, bell: 0.6 });
      // The distant low sponsor pulse of the score.
      s.tone({ at: 0.35, dur: 1.2, f0: 55, gain: 0.45, attack: 0.15, release: 0.5 });
      s.tone({ at: 0.35, dur: 1.2, f0: 82.4, gain: 0.15, attack: 0.2, release: 0.5 });
      s.chime(0.45, F4, 0.12, 2.5).chime(0.6, D4 + 12, 0.1, 2.5);
    },
  ),
  R(
    'sfx.objective.alert',
    'rescue',
    'critical',
    600,
    'Objective alert (new or failing objective)',
    (s) => {
      beepPair(s, 0, D5, A5, 0.32, 0.08);
      s.tone({ at: 0.3, dur: 0.18, f0: hz(A5), wave: 'tri', gain: 0.25, release: 0.08 });
    },
  ),
  R(
    'sfx.objective.done',
    'rescue',
    'confirm',
    850,
    'Objective complete or checkpoint reached',
    (s) => {
      [D5, F5, A5].forEach((n, i) => s.chime(i * 0.1, n, 0.22, 3.5));
      s.chime(0.32, D5 + 12, 0.16, 2.5);
    },
  ),

  // ---- Food (spec §10.2) ---------------------------------------------------------------
  R('sfx.pickup.food', 'food', 'ui', 240, 'A food item is picked up (J)', (s) => {
    s.crackle({ dur: 0.12, rate: 700, c: 4200, q: 1.2, gain: 0.3, decay: 18 });
    s.chime(0.06, A5, 0.12, 10);
  }),
  R('sfx.food.rice', 'food', 'ui', 750, 'Trail rice parcel eaten (Health)', (s) => {
    s.crackle({ dur: 0.3, rate: 1100, c: 3800, q: 1, gain: 0.3, bell: 0.6 });
    for (let k = 0; k < 3; k += 1)
      s.noise({ at: 0.3 + k * 0.11, dur: 0.07, c0: 700, q: 1, gain: 0.25, decay: 30 });
    s.chime(0.4, D5, 0.16, 4).chime(0.5, F5, 0.14, 4);
  }),
  R('sfx.food.broth', 'food', 'ui', 850, 'Warm vegetable broth (Defense Bar)', (s) => {
    s.noise({ dur: 0.35, c0: 1400, c1: 900, q: 1.5, gain: 0.25, bell: 0.5 });
    for (let k = 0; k < 6; k += 1) {
      const f = 380 + 260 * s.r01();
      s.tone({
        at: 0.05 + k * 0.06,
        dur: 0.035,
        f0: f,
        f1: f * 2.2,
        gain: 0.2,
        attack: 0.002,
        decay: 60,
      });
    }
    s.chime(0.45, A4, 0.15, 3.5).chime(0.55, D5, 0.13, 3.5);
  }),
  R('sfx.food.seedcake', 'food', 'ui', 700, 'Spiced seed cake (Attack Bar)', (s) => {
    for (let k = 0; k < 2; k += 1)
      s.crackle({ at: k * 0.16, dur: 0.1, rate: 3000, c: 2200, q: 1.2, gain: 0.45, decay: 25 });
    s.chime(0.36, A5, 0.14, 5).chime(0.43, D5 + 12, 0.12, 5);
  }),
  R('sfx.food.campmeal', 'food', 'ui', 1150, 'Mountain camp meal (rare, all three bars)', (s) => {
    s.modal({
      f: 2350,
      modes: [
        [1, 1, 9],
        [2.03, 0.4, 13],
        [3.4, 0.2, 18],
      ],
      gain: 0.2,
      dur: 0.6,
      click: 0.1,
    });
    [D5, F5, A5].forEach((n) => s.chime(0.25, n, 0.12, 2.6));
    s.chime(0.45, D5 + 12, 0.12, 2.6);
  }),
];
