import {
  type FrameInput,
  type World,
  ActionBit,
  PROXY_ALLOWED,
  PROXY_GRACE_FRAMES,
  actionable,
  createWorld,
  hashWorld,
  proxyInput,
  restoreWorld,
  snapshotWorld,
  step,
} from '@ffp/sim';
import { describe, expect, it } from 'vitest';
import {
  ABSENT_MS,
  COUNTDOWN_MS,
  COURTESY_MS,
  HASH_EVERY,
  MAX_DELAY,
  MIGRATE_MS,
  NET_PROTOCOL,
  ROLLBACK_WINDOW,
  RollbackSession,
  type Compat,
  type NetMessage,
  type StartInfo,
  checkCompat,
  chooseDelay,
  memoryPair,
} from '../src/index';

/** Deterministic made-up play: walks, jumps and attacks, different per slot. */
export function play(slot: number, f: number): FrameInput {
  const r = Math.imul(f * 2654435761 + slot * 40503, 2246822519) >>> 0;
  const presses = [0, 0, 0, ActionBit.Attack, ActionBit.Jump, 0, ActionBit.Attack, 0];
  return {
    moveX: (((r >>> 3) % 3) - 1) as -1 | 0 | 1,
    moveZ: (((r >>> 7) % 3) - 1) as -1 | 0 | 1,
    pressed: presses[(r >>> 11) % presses.length]!,
    held: 0,
    dirPressed: 0,
  };
}

export const OPTS = { stage: 'stage1', difficulty: 'medium' } as const;
export const COMPAT: Compat = { game: 't', protocol: NET_PROTOCOL, rules: 1, content: 2, cheats: 3 };
export const START: StartInfo = {
  seed: 5,
  stage: 'stage1',
  difficulty: 'medium',
  heroes: ['mountain', 'river'],
  loadouts: [[], []],
  facing: ['manual', 'manual'],
  delay: 0,
  session: 'test',
};

/**
 * A simulated network between two games: each direction keeps order (like TCP), adds a
 * latency with deterministic jitter, and can go silent (a pulled cable) or close.
 */
export class Net {
  now = 0;
  latency = 30;
  jitter = 20;
  silent = false;
  private seed = 1;
  private readonly queue: [{ at: number; m: NetMessage }[], { at: number; m: NetMessage }[]] = [
    [],
    [],
  ];
  readonly handlers: [(m: NetMessage) => void, (m: NetMessage) => void] = [() => {}, () => {}];
  private rand(): number {
    this.seed = (Math.imul(this.seed, 1103515245) + 12345) >>> 0;
    return (this.seed >>> 8) / 16777216;
  }
  send(from: 0 | 1, m: NetMessage): void {
    if (this.silent) return;
    const q = this.queue[from === 0 ? 1 : 0];
    const last = q[q.length - 1]?.at ?? 0;
    q.push({ at: Math.max(last, this.now + this.latency + this.rand() * this.jitter), m });
  }
  deliver(): void {
    for (const to of [0, 1] as const) {
      const q = this.queue[to];
      while (q.length && q[0]!.at <= this.now) {
        const { m } = q.shift()!;
        this.handlers[to](JSON.parse(JSON.stringify(m)) as NetMessage);
      }
    }
  }
  /** Messages in flight are lost (the cable is pulled). */
  drop(): void {
    this.queue[0].length = 0;
    this.queue[1].length = 0;
  }
}

export class Game {
  world: World;
  s: RollbackSession<World>;
  /** Inputs actually simulated per frame (the final ones, after rollbacks). */
  readonly used = new Map<number, FrameInput[]>();
  /** A frame this game simulates differently (as a browser bug would). */
  glitchAt = -1;
  constructor(
    readonly slot: 0 | 1,
    readonly net: Net,
    authority = slot === 0,
    delay = 0,
    readonly input: (slot: number, f: number) => FrameInput = play,
    readonly start: StartInfo = START,
  ) {
    this.world = createWorld(start.seed, worldOptions(start));
    this.s = this.session(authority, delay);
    net.handlers[slot] = (m) => this.s.receive(m, net.now);
  }
  session(authority: boolean, delay: number): RollbackSession<World> {
    return new RollbackSession<World>({
      slot: this.slot,
      authority,
      delay,
      now: this.net.now,
      start: this.start,
      compat: COMPAT,
      send: (m) => this.net.send(this.slot, m),
      hooks: {
        frame: () => this.world.frame,
        save: () => structuredClone(this.world),
        load: (w) => (this.world = structuredClone(w)),
        step: (inputs) => {
          this.used.set(this.world.frame, inputs);
          const f = this.world.frame;
          step(this.world, inputs);
          if (f === this.glitchAt) this.world.bodies[0]!.health -= 7;
        },
        hash: (w) => hashWorld(w ?? this.world),
        snapshot: (w) => snapshotWorld(w ?? this.world),
        restore: (snap) => restoreWorld(snap),
        proxy: (slot, n, handover) => proxyInput(this.world, slot, n, handover),
        actionable: (slot) => actionable(this.world, slot),
      },
    });
  }
  /** One render frame of `steps` simulation steps. */
  frame(steps = 1): void {
    this.s.tick(this.net.now);
    this.s.advance(steps, () => this.input(this.slot, this.s.nextLocal), this.net.now);
  }
}

export function pair(delay = 0, start: StartInfo = START, input = play) {
  const net = new Net();
  return {
    net,
    host: new Game(0, net, true, delay, input, start),
    guest: new Game(1, net, false, delay, input, start),
  };
}

/** Both games render at 60 Hz for `ms` (the guest's clock can be uneven). */
export function run(
  net: Net,
  games: Game[],
  ms: number,
  opts: { uneven?: boolean; skip?: Set<Game> } = {},
): void {
  for (let t = 0; t < ms; t += 16) {
    net.now += 16;
    net.deliver();
    for (const g of games) {
      if (opts.skip?.has(g)) {
        g.s.tick(net.now); // a hidden tab: timers only
        continue;
      }
      const steps = opts.uneven && g.slot === 1 ? [1, 2, 0, 1][(t / 16) % 4]! : 1;
      g.frame(steps);
    }
  }
}

/** Both games settle on the same frame with the same world. */
export function settle(net: Net, host: Game, guest: Game): void {
  const games = [host, guest];
  for (let i = 0; i < 200 && host.world.frame !== guest.world.frame; i += 1) {
    net.now += 16;
    net.deliver();
    const target = Math.max(host.world.frame, guest.world.frame);
    for (const g of games) if (g.world.frame < target) g.frame(1);
  }
  // No new frames: deliver what is in flight and apply the rollbacks it causes.
  for (let i = 0; i < 60; i += 1) {
    net.now += 16;
    net.deliver();
    for (const g of games) {
      g.s.tick(net.now);
      g.s.advance(0, () => g.input(g.slot, g.s.nextLocal), net.now);
    }
  }
}

/** The final simulated inputs replayed on one machine (hot-seat): must give the same world. */
export function replay(g: Game, frames: number): number {
  const w = createWorld(g.start.seed, worldOptions(g.start));
  for (let f = 0; f < frames; f += 1) step(w, g.used.get(f)!);
  return hashWorld(w);
}
/** The world options of a session start (as the game builds them). */
export function worldOptions(start: StartInfo) {
  return { stage: start.stage, difficulty: start.difficulty, heroes: [...start.heroes] };
}
