import { ActionBit, DirBit, type FrameInput, type ReplayLog, type WorldOptions } from '@ffp/sim';

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

export const SCRIPTS = [walkSquare, dashJump, crowd];

export type { ReplayLog };
