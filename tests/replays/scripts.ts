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
  CORRIDORS,
  ObstacleKind,
  PursuitPhase,
  escapeOpen,
  fx,
  heroOf,
  step,
} from '@ffp/sim';
import { botInput } from '../../packages/sim/test/arenaBot';
import { stageBotInput } from '../../packages/sim/test/stageBot';

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

/** M7: a full Medium trial with the deterministic arena bot (director, AI, morale). */
function arenaTrial(): FrameInput[][] {
  const options: WorldOptions = { arena: 'trial-recruit', difficulty: 'medium' };
  const w = createWorld(41, options);
  const frames: FrameInput[][] = [];
  for (let i = 0; i < 1500; i += 1) {
    const input = botInput(w);
    frames.push([input]);
    step(w, [input]);
  }
  return frames;
}

export const arenaTrialScript: ReplayScript = {
  name: 'arena-trial',
  seed: 41,
  options: { arena: 'trial-recruit', difficulty: 'medium' },
  frames: arenaTrial(),
};

/**
 * M8: same-device co-op drills on Dummy 1: an airborne handoff (launcher, partner's
 * receiving launcher), a team finisher (Invite and Confirm) and a partner grab assist.
 */
function coopDrills(): FrameInput[][] {
  const r = new Recorder(51, COOP_OPTIONS);
  r.tick(1); // Player 2 joins
  const dz = Math.trunc(r.body(101).z / 256);
  const dx = () => Math.trunc(r.body(101).x / 256);
  // Walk round the dummy (a lane further down-stage), then step into its lane.
  const around = (slot: number, offset: number) => {
    r.walkTo(slot, dx() + offset, dz + 110, offset < 0 ? 1 : -1);
    r.walkTo(slot, dx() + offset, dz, offset < 0 ? 1 : -1);
  };
  around(1, 90);
  around(0, -90);
  // Handoff: Player 1 launches, Player 2's Northbank Arc claims the airborne window.
  r.tick(0, ['up'], ['Attack']);
  r.wait(() => r.contact(0), 30);
  r.tick(1, ['up'], ['Attack']);
  r.wait(() => r.free(0) && r.free(1), 90);
  r.settle(101);
  // Team finisher: Player 1 staggers the dummy and invites, Player 2 confirms.
  around(1, 90);
  around(0, -90);
  r.tick(0, [], ['Attack']);
  r.wait(() => r.contact(0), 20);
  r.tick(0, [], ['TeamAttack']);
  r.idle(1, 4).tick(1, [], ['TeamAttack']);
  r.wait(() => r.free(0) && r.free(1), 120);
  r.settle(101);
  // Grab assist: Player 1 holds the dummy, Player 2 strikes it from behind once.
  around(0, -80);
  around(1, 95);
  r.tick(0, [], ['Interact']);
  r.wait(() => r.body(101).state === MoveState.Grabbed, 20);
  r.tick(1, [], ['Attack']);
  r.idle(1, 12);
  r.tick(0, [], ['Interact']);
  r.wait(() => r.free(0) && r.free(1), 120);
  r.idle(0, 60);
  return r.frames;
}

const COOP_OPTIONS: WorldOptions = { dummies: 1, infiniteMeter: true };

export const coopDrillsScript: ReplayScript = {
  name: 'coop-drills',
  seed: 51,
  options: COOP_OPTIONS,
  frames: coopDrills(),
};

/**
 * M9: the Worker Rescue beat of Stage 1 practised on Easy with the deterministic stage bot:
 * the camera lock, the fight, freeing both workers (hold Interact), the recovery cache and
 * the exit into the Working Mill.
 */
const STAGE_OPTIONS: WorldOptions = { stage: 'stage1', difficulty: 'easy', beat: 2 };
function stageRescue(): FrameInput[][] {
  const w = createWorld(61, STAGE_OPTIONS);
  const frames: FrameInput[][] = [];
  for (let i = 0; i < 6000 && w.run!.beat === 2; i += 1) {
    const input = stageBotInput(w);
    frames.push([input]);
    step(w, [input]);
  }
  for (let i = 0; i < 60; i += 1) {
    frames.push([IDLE_FRAME]);
    step(w, [IDLE_FRAME]);
  }
  return frames;
}
const IDLE_FRAME: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

export const stageRescueScript: ReplayScript = {
  name: 'stage-rescue',
  seed: 61,
  options: STAGE_OPTIONS,
  frames: stageRescue(),
};

/**
 * M16: one golden replay per hero. Lab dummy, infinite meter, counter-hit on (so every hit
 * is a whiff punish): the three §8.3 recipes, a backward-then-forward chain (Wind
 * Sentinel's punish link), the three starting Specials, the signature Ultimate and a grab
 * with a strike and a throw.
 */
function heroKit(id: string, seed: number): FrameInput[][] {
  const r = new Recorder(seed, heroKitOptions(id));
  const d = r.body(101);
  const near = (gap: number) => r.walkTo(0, d.x / 256 - gap, d.z / 256, 1);
  const done = () => r.wait(() => r.free(0), 200).settle(d.id);
  // Foundation.
  near(80);
  r.pressWhen(0, () => true, ['Attack']);
  r.pressWhen(0, () => r.contact(0), ['Attack']);
  r.pressWhen(0, () => r.contact(0) && r.hero(0).chainUsed !== 1, ['Attack']);
  done();
  // Aerial conversion.
  near(80);
  r.pressWhen(0, () => true, ['Attack'], ['up']);
  r.pressWhen(0, () => r.contact(0), ['Jump']);
  r.pressWhen(0, () => r.hero(0).state === MoveState.Air && r.hero(0).stateFrame > 2, ['Attack']);
  r.pressWhen(0, () => r.contact(0), ['Attack'], ['right']);
  done();
  // Low to ground.
  near(200);
  r.pressWhen(0, () => true, ['Dash']);
  r.pressWhen(0, () => r.hero(0).stateFrame >= 3, ['LowAttack']);
  r.pressWhen(0, () => d.state === MoveState.Down && r.free(0), ['Attack']);
  r.pressWhen(0, () => r.running(0) !== null && r.contact(0), ['Attack'], ['right']);
  done();
  // Backward Attack, then Forward + Attack on contact (a punish link where authored).
  near(80);
  r.pressWhen(0, () => true, ['Attack'], ['left']);
  r.pressWhen(0, () => r.contact(0), ['Attack'], ['right']);
  done();
  // The starting Specials: neutral, forward, backward.
  for (const dirs of [[], ['right'], ['left']] as Dir[][]) {
    near(90);
    r.tick(0, dirs, ['Special']);
    done();
  }
  // The signature Ultimate.
  near(80);
  r.tick(0, [], ['Ultimate']);
  done();
  // Grab, one strike, throw.
  near(60);
  r.tick(0, [], ['Interact']);
  r.pressWhen(0, () => r.hero(0).state === MoveState.Grabbing, ['Attack']);
  r.pressWhen(0, () => r.hero(0).state === MoveState.Grabbing, ['Interact']);
  done();
  r.idle(0, 30);
  return r.frames;
}

function heroKitOptions(id: string): WorldOptions {
  return { dummies: 1, infiniteMeter: true, counterHit: true, heroes: [id] };
}

export const HERO_IDS = HEROES.map((h) => h.id);

export const heroKitScripts: ReplayScript[] = HERO_IDS.map((id, i) => ({
  name: `hero-${id}`,
  seed: 70 + i,
  options: heroKitOptions(id),
  frames: heroKit(id, 70 + i),
}));

/**
 * M16: one golden replay per legal pair (no duplicates): an airborne handoff from Player 1
 * to Player 2, the reverse from Player 2's backward Special to Player 1's jump-in, and the
 * pair's team finisher (Twin Guardians' Accord for the twins, Confluence Strike otherwise).
 */
function pairDrills(a: string, b: string, seed: number): FrameInput[][] {
  const r = new Recorder(seed, pairOptions(a, b));
  r.tick(1); // Player 2 joins
  const dz = Math.trunc(r.body(101).z / 256);
  const dx = () => Math.trunc(r.body(101).x / 256);
  const d = r.body(101);
  const around = (slot: number, offset: number) => {
    r.walkTo(slot, dx() + offset, dz + 110, offset < 0 ? 1 : -1);
    r.walkTo(slot, dx() + offset, dz, offset < 0 ? 1 : -1);
  };
  const rest = (n = 90) => r.wait(() => r.free(0) && r.free(1), n).settle(101);
  // Player 1 launches (Up + Attack); Player 2's Up + Attack claims the airborne window.
  around(1, 90);
  around(0, -90);
  r.tick(0, ['up'], ['Attack']);
  r.wait(() => r.contact(0), 30);
  r.idle(0, 2);
  r.tick(1, ['up'], ['Attack']);
  rest();
  // Player 2's backward Special lifts; Player 1 jumps in with Forward + air Attack.
  around(1, 80);
  around(0, -110);
  r.tick(1, ['right'], ['Special']);
  r.wait(() => r.contact(1), 30);
  r.pressWhen(0, () => d.y > fx(30), ['Jump'], ['right']);
  r.pressWhen(
    0,
    () => r.hero(0).state === MoveState.Air && r.hero(0).stateFrame > 3,
    ['Attack'],
    ['right'],
  );
  rest(120);
  // Team finisher: Player 1 staggers the dummy and invites, Player 2 confirms.
  around(1, 90);
  around(0, -90);
  r.tick(0, [], ['Attack']);
  r.wait(() => r.contact(0), 20);
  r.tick(0, [], ['TeamAttack']);
  r.idle(1, 4).tick(1, [], ['TeamAttack']);
  rest(120);
  r.idle(0, 60);
  return r.frames;
}

function pairOptions(a: string, b: string): WorldOptions {
  return { dummies: 1, infiniteMeter: true, heroes: [a, b] };
}

/** The six legal pairs in roster order (each hero at most once). */
export const PAIRS: [string, string][] = HERO_IDS.flatMap((a, i) =>
  HERO_IDS.slice(i + 1).map((b) => [a, b] as [string, string]),
);

export const pairScripts: ReplayScript[] = PAIRS.map(([a, b], i) => ({
  name: `pair-${a}-${b}`,
  seed: 80 + i,
  options: pairOptions(a, b),
  frames: pairDrills(a, b, 80 + i),
}));

/**
 * M17: the Guided Pursuit Corridor ridden end to end by a simple rider bot: holds forward,
 * steers around barriers and gates, strikes Road Riders alongside, uses the Special and
 * the Ultimate now and then.
 */
function pursuitRide(heroes: string[], seed: number): FrameInput[][] {
  const options = pursuitOptions(heroes);
  const world = createWorld(seed, options);
  const c = CORRIDORS[0]!;
  const frames: FrameInput[][] = [];
  for (let i = 0; i < 9000 && world.pursuit!.phase !== PursuitPhase.Complete; i += 1) {
    const row = heroes.map((_, slot) => {
      const r = world.pursuit!.riders.find((x) => x.slot === slot);
      let moveZ: -1 | 0 | 1 = 0;
      let near = false;
      if (r) {
        for (const o of c.obstacles) {
          if (o.kind === ObstacleKind.Ramp) continue;
          const dx = o.at - r.x;
          if (dx > 0 && dx < fx(420) && Math.abs(o.z - r.z) < o.hd + fx(60))
            moveZ = r.z >= o.z ? 1 : -1;
        }
        near = world.pursuit!.enemies.some(
          (e) => Math.abs(e.x - r.x) < fx(140) && Math.abs(e.z - r.z) < fx(110),
        );
      }
      const pressed =
        near && i % 12 === slot * 6
          ? ActionBit.Attack
          : i % 300 === 150
            ? ActionBit.Special
            : i % 400 === 0
              ? ActionBit.Ultimate
              : 0;
      return { moveX: 1 as const, moveZ, pressed, held: pressed, dirPressed: 0 };
    });
    frames.push(row);
    step(world, row);
  }
  for (let i = 0; i < 30; i += 1) frames.push(heroes.map(() => ({ ...IDLE })));
  return frames;
}

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

function pursuitOptions(heroes: string[]): WorldOptions {
  return { pursuit: 'perimeter-pursuit', heroes };
}

export const pursuitScripts: ReplayScript[] = [
  ['fire'],
  ['mountain', 'wind'],
].map((heroes, i) => ({
  name: `pursuit-${heroes.join('-')}`,
  seed: 90 + i,
  options: pursuitOptions(heroes),
  frames: pursuitRide(heroes, 90 + i),
}));

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
  arenaTrialScript,
  coopDrillsScript,
  stageRescueScript,
  ...heroKitScripts,
  ...pairScripts,
  ...pursuitScripts,
];

export type { ReplayLog };
