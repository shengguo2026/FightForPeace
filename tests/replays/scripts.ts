import {
  ActionBit,
  DirBit,
  type Fighter,
  type FrameInput,
  ENEMIES,
  HEROES,
  MoveState,
  type ReplayLog,
  type World,
  type WorldOptions,
  createWorld,
  escapeOpen,
  fx,
  heroOf,
  step,
} from '@ffp/sim';

type Dir = 'up' | 'down' | 'left' | 'right';
type Act = keyof typeof ActionBit;

/**
 * Builds input logs the way a keyboard would report them: held directions on every
 * frame, a direction press bit on the frame a direction goes down, and action presses.
 */
export class Track {
  readonly frames: FrameInput[] = [];
  private held = new Set<Dir>();

  /** Holds the given directions for n frames, pressing the given actions on the first. */
  hold(dirs: Dir[], n: number, acts: Act[] = []): this {
    for (let i = 0; i < n; i += 1) {
      let dirPressed = 0;
      for (const d of dirs) if (!this.held.has(d)) dirPressed |= DirBit[d];
      this.held = new Set(dirs);
      const pressed = i === 0 ? acts.reduce((m, a) => m | ActionBit[a], 0) : 0;
      const has = (d: Dir) => this.held.has(d);
      this.frames.push({
        moveX: has('left') ? -1 : has('right') ? 1 : 0,
        moveZ: has('up') ? -1 : has('down') ? 1 : 0,
        pressed,
        held: i === 0 ? pressed : 0,
        dirPressed,
      });
    }
    return this;
  }

  idle(n: number): this {
    return this.hold([], n);
  }

  press(act: Act, dirs: Dir[] = []): this {
    return this.hold(dirs, 1, [act]);
  }

  /** Double-tap: press, release for `gap` − 1 frames, press again and hold n frames. */
  doubleTap(dirs: Dir[], gap: number, n: number): this {
    return this.hold(dirs, 1)
      .idle(gap - 1)
      .hold(dirs, n);
  }
}

function combine(...tracks: Track[]): FrameInput[][] {
  const len = Math.max(...tracks.map((t) => t.frames.length));
  return Array.from({ length: len }, (_, f) => tracks.map((t) => t.frames[f]!).filter(Boolean));
}

export interface ReplayScript {
  name: string;
  seed: number;
  options?: WorldOptions;
  frames: FrameInput[][];
}

export const walkSquare: ReplayScript = {
  name: 'walk-square',
  seed: 1,
  frames: combine(
    new Track().hold(['right'], 60).hold(['up'], 60).hold(['left'], 60).hold(['down'], 60),
  ),
};

const EIGHT: Dir[][] = [
  ['right'],
  ['right', 'down'],
  ['down'],
  ['left', 'down'],
  ['left'],
  ['left', 'up'],
  ['up'],
  ['right', 'up'],
];

function dashJumpTrack(): Track {
  const t = new Track();
  for (const dirs of EIGHT) t.doubleTap(dirs, 4, 18).idle(8);
  t.press('Dash', ['right']).idle(20).press('Dash').idle(20);
  t.press('Jump').idle(40);
  t.press('Jump', ['right']).hold(['left'], 40).idle(5);
  t.press('Jump', ['left']).hold(['left'], 40).idle(5);
  t.press('Dash', ['up']).idle(3).press('Jump').idle(40);
  // Attack chain with buffered follow-ups, then a buffered jump that loses to Attack.
  t.press('Attack').idle(12).press('Attack').idle(12).press('Jump').press('Attack').idle(30);
  t.press('Attack', ['left']).idle(30);
  // Low attack: Attack then Guard one frame later during a dash, then Guard first.
  t.press('Dash', ['right']).idle(3).press('Attack').press('Guard').idle(30);
  t.press('Dash', ['left']).idle(3).press('Guard').idle(1).press('Attack').idle(30);
  t.press('LowAttack').idle(30);
  return t;
}

export const dashJump: ReplayScript = {
  name: 'dash-jump',
  seed: 7,
  frames: combine(dashJumpTrack()),
};

function crowdP1(): Track {
  return (
    new Track()
      .hold(['right'], 200)
      .hold(['right', 'up'], 60)
      .press('Attack')
      .idle(20)
      .hold(['left'], 120)
      .hold(['down'], 40)
      .hold(['right'], 120)
      // Retreat to the left edge so the dummies pin Player 1, then push out through them.
      .hold(['left'], 330)
      .idle(60)
      .hold(['right'], 120)
  );
}

function crowdP2(): Track {
  return new Track()
    .hold(['right', 'down'], 180)
    .hold(['left'], 60)
    .doubleTap(['right'], 3, 60)
    .hold(['right'], 600);
}

export const crowd: ReplayScript = {
  name: 'crowd',
  seed: 3,
  options: { dummies: 2, dummiesChase: true, facing: ['manual', 'assisted'] },
  // Player 2 joins on frame 30.
  frames: (() => {
    const p1 = crowdP1().frames;
    const p2 = crowdP2().frames;
    return p1.map((f, i) => (i >= 30 && p2[i - 30] ? [f, p2[i - 30]!] : [f]));
  })(),
};

/** Taps Attack every third frame for n frames (a player mashing the button). */
function mash(t: Track, n: number, dirs: Dir[] = []): Track {
  for (let i = 0; i < n; i += 1) {
    if (i % 3 === 0) t.press('Attack', i === 0 ? dirs : []);
    else t.idle(1);
  }
  return t;
}

function comboP1(): Track {
  const t = new Track().hold(['right'], 207).hold(['up'], 20).idle(10);
  mash(t, 45).idle(70); // Mason's Touch → Brace Elbow → Gatepost Hammer
  t.hold(['right'], 10).idle(10);
  mash(t, 3).idle(2).press('Attack', ['right']).idle(60); // Mason → Stone Shoulder
  t.hold(['right'], 20).idle(10);
  t.press('Attack', ['up']).idle(14).press('Jump').idle(6).press('Attack').idle(8);
  t.press('Attack', ['right']).idle(80); // High Bank Lift → jump chase → Rafter Palm → Stonefall Knee
  t.hold(['left'], 30).hold(['right'], 1).idle(5);
  t.press('Dash', ['right']).idle(3).press('Attack').press('Guard').idle(70); // Faultline Reap
  t.hold(['left'], 30).hold(['right'], 1).idle(5);
  t.press('Dash', ['right']).idle(3).press('Attack').idle(70); // Rampart Charge
  t.hold(['right'], 15).idle(5);
  mash(t, 40);
  t.press('Dash').idle(2).press('Attack').idle(80); // string into the premium dash bridge
  t.press('Attack', ['left']).idle(40); // Anchor Hook
  return t;
}

function comboP2(): Track {
  // River Scout walks to the dummy's right side and joins in.
  const t = new Track().hold(['right'], 300).hold(['up'], 50).hold(['left'], 1).idle(200);
  mash(t, 45).idle(60);
  t.press('Attack', ['down']).idle(5).press('Attack', ['right']).idle(60); // Southbank Slide → Ebb Heel
  t.press('Jump').idle(4).press('Attack', ['up']).idle(60); // Bank-Switch Arc
  return t;
}

export const comboRoutes: ReplayScript = {
  name: 'combo-routes',
  seed: 11,
  options: { dummies: 1, infiniteMeter: true, counterHit: true },
  frames: (() => {
    const p1 = comboP1().frames;
    const p2 = comboP2().frames;
    return p1.map((f, i) => (i >= 20 && p2[i - 20] ? [f, p2[i - 20]!] : [f]));
  })(),
};

/**
 * Records inputs by playing the game: each frame's input is chosen from the world state
 * (walk to a spot, wait for contact, press). The result is a plain input log, so the
 * golden replay checks it like any other; the recorder only makes the script readable.
 */
class Recorder {
  readonly frames: FrameInput[][] = [];
  readonly world: World;
  private held: [Set<Dir>, Set<Dir>] = [new Set(), new Set()];
  private joined = [true, false];

  constructor(
    seed: number,
    readonly options: WorldOptions,
  ) {
    this.world = createWorld(seed, options);
  }

  private input(slot: number, dirs: Dir[], acts: Act[], holds: Act[] = []): FrameInput {
    const held = this.held[slot]!;
    let dirPressed = 0;
    for (const d of dirs) if (!held.has(d)) dirPressed |= DirBit[d];
    this.held[slot] = new Set(dirs);
    const has = (d: Dir) => dirs.includes(d);
    const pressed = acts.reduce((m, a) => m | ActionBit[a], 0);
    return {
      moveX: has('left') ? -1 : has('right') ? 1 : 0,
      moveZ: has('up') ? -1 : has('down') ? 1 : 0,
      pressed,
      held: pressed | holds.reduce((m, a) => m | ActionBit[a], 0),
      dirPressed,
    };
  }

  /**
   * One frame: `slot` holds `dirs`, presses `acts` and keeps `holds` held (Guard); the
   * other player idles.
   */
  tick(slot = 0, dirs: Dir[] = [], acts: Act[] = [], holds: Act[] = []): void {
    if (slot === 1) this.joined[1] = true;
    const row = [0, 1]
      .filter((s) => this.joined[s])
      .map((s) => (s === slot ? this.input(s, dirs, acts, holds) : this.input(s, [], [])));
    step(this.world, row);
    this.frames.push(row);
  }

  hero(slot: number): Fighter {
    return heroOf(this.world, slot)!;
  }

  body(id: number): Fighter {
    return this.world.bodies.find((b) => b.id === id)!;
  }

  wait(until: () => boolean, max = 200): this {
    for (let i = 0; i < max && !until(); i += 1) this.tick();
    return this;
  }

  /** Walks `slot` to (x, z) in pixels, then faces `facing` with a one-frame tap. */
  walkTo(slot: number, x: number, z: number, facing: 1 | -1): this {
    for (let i = 0; i < 600; i += 1) {
      const h = this.hero(slot);
      const dx = fx(x) - h.x;
      const dz = fx(z) - h.z;
      const dirs: Dir[] = [];
      if (dx > fx(2)) dirs.push('right');
      if (dx < -fx(2)) dirs.push('left');
      if (dz > fx(2)) dirs.push('down');
      if (dz < -fx(2)) dirs.push('up');
      if (dirs.length === 0) break;
      this.tick(slot, dirs);
    }
    this.tick(slot);
    if (this.hero(slot).facing !== facing) this.tick(slot, [facing === 1 ? 'right' : 'left']);
    return this.idle(slot, 4);
  }

  idle(slot: number, n: number): this {
    for (let i = 0; i < n; i += 1) this.tick(slot);
    return this;
  }

  /** Waits until `until` holds (up to max frames), then presses. */
  pressWhen(slot: number, until: () => boolean, acts: Act[], dirs: Dir[] = []): this {
    for (let i = 0; i < 200 && !until(); i += 1) this.tick(slot);
    this.tick(slot, dirs, acts);
    return this;
  }

  running(slot: number): string | null {
    const h = this.hero(slot);
    return h.action >= 0 ? HEROES[h.hero]!.actions[h.action]!.id : null;
  }

  contact(slot: number): boolean {
    return this.hero(slot).contactAt >= 0;
  }

  free(slot: number): boolean {
    const h = this.hero(slot);
    return h.action < 0 && (h.state === MoveState.Idle || h.state === MoveState.Walk);
  }

  /** Waits for the dummy to recover and its combo to close. */
  settle(id: number): this {
    return this.wait(() => this.body(id).state === MoveState.Idle && !this.body(id).ctx.open, 300);
  }
}

/** Every §8.3 recipe for both founders, plus a co-op juggle sharing one budget. */
function academyRecipes(): FrameInput[][] {
  const r = new Recorder(5, { dummies: 2, counterHit: true });
  const d1 = r.body(101);
  const d2 = r.body(102);
  const near = (s: number, d: Fighter, gap: number) => r.walkTo(s, d.x / 256 - gap, d.z / 256, 1);
  const recipes = (s: number, d: Fighter) => {
    // Foundation: neutral Attack three times, each after the previous hit.
    near(s, d, 80);
    r.pressWhen(s, () => true, ['Attack']);
    r.pressWhen(s, () => r.contact(s), ['Attack']);
    r.pressWhen(s, () => r.contact(s) && r.hero(s).chainUsed !== 1, ['Attack']);
    r.settle(d.id);
    // Aerial conversion: launcher, jump chase, air Attack, Forward + air Attack.
    near(s, d, 80);
    r.pressWhen(s, () => true, ['Attack'], ['up']);
    r.pressWhen(s, () => r.contact(s), ['Jump']);
    r.pressWhen(s, () => r.hero(s).state === MoveState.Air && r.hero(s).stateFrame > 2, ['Attack']);
    r.pressWhen(s, () => r.contact(s), ['Attack'], ['right']);
    r.settle(d.id);
    // Low to ground: dash, low attack (counter-trip), ground extension, Forward finisher.
    near(s, d, 200);
    r.pressWhen(s, () => true, ['Dash']);
    r.pressWhen(s, () => r.hero(s).stateFrame >= 3, ['LowAttack']);
    r.pressWhen(s, () => d.state === MoveState.Down && r.free(s), ['Attack']);
    r.pressWhen(s, () => r.running(s) !== null && r.contact(s), ['Attack'], ['right']);
    r.settle(d.id);
  };
  recipes(0, d1);
  r.tick(1); // Player 2 (River Scout) joins
  recipes(1, d2);
  // Co-op: Mountain launches dummy 1 and River, on its other side, chases it.
  r.walkTo(1, d1.x / 256 + 80, d1.z / 256, -1);
  near(0, d1, 80);
  r.pressWhen(0, () => true, ['Attack'], ['up']);
  r.pressWhen(1, () => d1.y > fx(40), ['Jump']);
  r.pressWhen(1, () => r.hero(1).state === MoveState.Air && r.hero(1).stateFrame > 3, ['Attack']);
  r.settle(101).idle(0, 30);
  return r.frames;
}

export const academyRecipesScript: ReplayScript = {
  name: 'academy-recipes',
  seed: 5,
  options: { dummies: 2, counterHit: true },
  frames: academyRecipes(),
};

/**
 * M4 defense drills against the training enemy's attack cycle (jab, club, thrust,
 * two-step, barrage, bell hammer): exact block, held guard, exact block of a guard-piercing
 * thrust, a counter, a combo breaker and a dash away from the unblockable.
 */
function defenseDrills(): FrameInput[][] {
  const options: WorldOptions = {
    dummies: 1,
    trainer: { attackers: 1, pattern: -1, interval: 70, approach: true },
  };
  const r = new Recorder(13, options);
  const d = r.body(101);
  const kit = ENEMIES[0]!;
  const id = () => (d.action >= 0 ? kit.actions[d.action]!.id : null);
  /** Frames until the dummy's next contact would land, for its running attack. */
  const toContact = () => kit.actions[d.action]!.startup - 1 - d.stateFrame;
  const attacking = (name: string, lead: number) => () =>
    d.state === MoveState.Attack && id() === name && toContact() === lead;
  const hold = (n: number, dirs: Dir[] = []) => {
    for (let i = 0; i < n; i += 1) r.tick(0, dirs, [], ['Guard']);
  };
  /** Waits (holding Guard if asked) until `cond`, then presses. */
  const at = (cond: () => boolean, acts: Act[], dirs: Dir[] = [], holds: Act[] = []) => {
    for (let i = 0; i < 900 && !cond(); i += 1) r.tick(0, [], [], holds);
    r.tick(0, dirs, acts, holds.length > 0 || acts.includes('Guard') ? ['Guard'] : []);
  };
  // The training enemy walks into range by itself.
  // 1. Jab: Exact Block pressed 2 frames before contact.
  at(attacking('jab', 2), ['Guard']);
  hold(12);
  r.idle(0, 2);
  // 2. Club: Guard raised early and held (normal guard).
  at(attacking('club', 12), ['Guard']);
  hold(40);
  r.idle(0, 2);
  // 3. Piercing Thrust beats held guard but not an exact block.
  at(attacking('thrust', 1), ['Guard']);
  hold(10);
  r.idle(0, 2);
  // 4. Two-Step: Directional Predictive Counter (toward the attacker, then Guard).
  at(attacking('two-step', 2), [], ['right']);
  r.tick(0, ['right'], ['Guard'], ['Guard']);
  r.wait(() => r.free(0), 80);
  // 5. Pummel Barrage: take two hits, then the Combo Breaker.
  at(() => r.hero(0).ctx.open && r.hero(0).ctx.hits >= 2, ['Guard', 'Ultimate']);
  r.wait(() => r.free(0), 80);
  // 6. Bell Hammer: true unblockable, dash away during its telegraph.
  at(attacking('bell-hammer', 20), ['Dash'], ['left']);
  r.idle(0, 120);
  return r.frames;
}

export const defenseDrillsScript: ReplayScript = {
  name: 'defense-drills',
  seed: 13,
  options: { dummies: 1, trainer: { attackers: 1, pattern: -1, interval: 70, approach: true } },
  frames: defenseDrills(),
};

/**
 * M5 offense: Mountain's neutral and forward Specials, a grab with a forward throw, a grab
 * with extension and release strike, and the signature Ultimate (Lab infinite meter); then
 * River's Current Crescent projectile and a backward throw.
 */
function specialsGrabs(): FrameInput[][] {
  const r = new Recorder(21, { dummies: 2, infiniteMeter: true });
  const d1 = r.body(101);
  const d2 = r.body(102);
  const near = (s: number, d: Fighter, gap: number) => r.walkTo(s, d.x / 256 - gap, d.z / 256, 1);
  const holding = (s: number) => r.hero(s).state === MoveState.Grabbing;
  const done = (s: number, d: Fighter) => r.wait(() => r.free(s), 200).settle(d.id);
  near(0, d1, 80);
  r.tick(0, [], ['Special']);
  done(0, d1);
  near(0, d1, 90);
  r.tick(0, ['right'], ['Special']);
  done(0, d1);
  near(0, d1, 60);
  r.tick(0, [], ['Interact']);
  r.pressWhen(0, () => holding(0), ['Interact']);
  done(0, d1);
  near(0, d1, 60);
  r.tick(0, [], ['Interact']);
  r.pressWhen(0, () => holding(0), ['Attack']);
  r.pressWhen(0, () => holding(0), ['Attack']);
  done(0, d1);
  near(0, d1, 80);
  r.tick(0, [], ['Ultimate']);
  done(0, d1);
  r.tick(1); // Player 2 (River Scout) joins
  near(1, d2, 220);
  r.tick(1, [], ['Special']);
  done(1, d2);
  near(1, d2, 60);
  r.tick(1, [], ['Interact']);
  r.pressWhen(1, () => holding(1), ['Interact'], ['left']);
  done(1, d2);
  r.idle(0, 30);
  return r.frames;
}

export const specialsGrabsScript: ReplayScript = {
  name: 'specials-grabs',
  seed: 21,
  options: { dummies: 2, infiniteMeter: true },
  frames: specialsGrabs(),
};

const GRAB_TRAINER = { attackers: 1, pattern: 6, interval: 70, approach: true };

/**
 * M5 defense against the training enemy's Collar Grab: a Grab escape on the third frame of
 * the window, then an early press (the one attempt fails and the throw lands).
 */
function grabEscape(): FrameInput[][] {
  const r = new Recorder(23, { dummies: 1, trainer: GRAB_TRAINER });
  const grabbed = () => r.hero(0).state === MoveState.Grabbed;
  const d = r.body(101);
  // Walk toward the training enemy until it is close (it walks into range by itself).
  for (let i = 0; i < 300 && Math.abs(d.x - r.hero(0).x) > fx(160); i += 1) r.tick(0, ['right']);
  r.wait(() => escapeOpen(r.world, r.hero(0)), 600);
  r.idle(0, 2);
  r.tick(0, [], ['Guard'], ['Guard']);
  r.wait(() => r.free(0) && !grabbed(), 120);
  r.wait(grabbed, 600);
  r.tick(0, [], ['Guard'], ['Guard']);
  r.wait(() => r.free(0) && !grabbed(), 200);
  r.idle(0, 60);
  return r.frames;
}

export const grabEscapeScript: ReplayScript = {
  name: 'grab-escape',
  seed: 23,
  options: { dummies: 1, trainer: GRAB_TRAINER },
  frames: grabEscape(),
};

const ARMORY_OPTIONS: WorldOptions = {
  dummies: 1,
  armory: true,
  environment: true,
  trainer: { attackers: 1, pattern: 8, interval: 100, approach: true },
};

/**
 * M6 weapons and the mill corner: pick up the Workstaff, break the sluice boards, a staff
 * string on the dummy (which answers with its Disarming Swipe), drop the staff, then take
 * the Handwheel and throw it. The cog keeps cycling throughout.
 */
function weaponsEnvironment(): FrameInput[][] {
  const r = new Recorder(31, ARMORY_OPTIONS);
  r.walkTo(0, 570, 860, 1);
  r.pressWhen(0, () => r.free(0), ['Interact']);
  r.wait(() => r.free(0), 40);
  r.walkTo(0, 560, 715, 1);
  for (let i = 0; i < 6; i += 1) r.pressWhen(0, () => r.free(0), ['Attack']);
  r.wait(() => r.free(0), 60);
  const d = r.body(101);
  r.walkTo(0, Math.trunc(d.x / 256) - 150, Math.trunc(d.z / 256), 1);
  r.pressWhen(0, () => r.free(0), ['Attack']);
  r.idle(0, 12).tick(0, [], ['Attack']);
  r.idle(0, 14).tick(0, [], ['Attack']);
  r.wait(() => r.free(0), 120);
  r.tick(0, ['down'], ['Interact']);
  r.wait(() => r.free(0), 60);
  r.walkTo(0, 730, 950, 1);
  r.pressWhen(0, () => r.free(0), ['Interact']);
  r.wait(() => r.free(0), 40);
  r.pressWhen(0, () => r.free(0), ['Interact']);
  r.idle(0, 150);
  return r.frames;
}

export const weaponsEnvironmentScript: ReplayScript = {
  name: 'weapons-environment',
  seed: 31,
  options: ARMORY_OPTIONS,
  frames: weaponsEnvironment(),
};

export const SCRIPTS = [
  walkSquare,
  dashJump,
  crowd,
  comboRoutes,
  academyRecipesScript,
  defenseDrillsScript,
  specialsGrabsScript,
  grabEscapeScript,
  weaponsEnvironmentScript,
];

export type { ReplayLog };
