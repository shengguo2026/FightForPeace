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
function play(slot: number, f: number): FrameInput {
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

const OPTS = { stage: 'stage1', difficulty: 'medium' } as const;
const COMPAT: Compat = { game: 't', protocol: NET_PROTOCOL, rules: 1, content: 2, cheats: 3 };
const START: StartInfo = {
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
class Net {
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

class Game {
  world: World = createWorld(5, OPTS);
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
  ) {
    this.s = this.session(authority, delay);
    net.handlers[slot] = (m) => this.s.receive(m, net.now);
  }
  session(authority: boolean, delay: number): RollbackSession<World> {
    return new RollbackSession<World>({
      slot: this.slot,
      authority,
      delay,
      now: this.net.now,
      start: START,
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

function pair(delay = 0) {
  const net = new Net();
  return { net, host: new Game(0, net, true, delay), guest: new Game(1, net, false, delay) };
}

/** Both games render at 60 Hz for `ms` (the guest's clock can be uneven). */
function run(
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
function settle(net: Net, host: Game, guest: Game): void {
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
function replay(g: Game, frames: number): number {
  const w = createWorld(5, OPTS);
  for (let f = 0; f < frames; f += 1) step(w, g.used.get(f)!);
  return hashWorld(w);
}

describe('M15 lobby checks and delay', () => {
  const base: Compat = { game: '0.15.0', protocol: 2, rules: 11, content: 22, cheats: 33 };
  it('names the first difference, protocol first', () => {
    expect(checkCompat(base, base)).toBeNull();
    expect(checkCompat(base, { ...base, game: '0.11.0', protocol: 1 })).toBe('protocol');
    expect(checkCompat(base, { ...base, game: '0.11.0' })).toBe('game');
    expect(checkCompat(base, { ...base, rules: 1 })).toBe('rules');
    expect(checkCompat(base, { ...base, content: 1 })).toBe('content');
    expect(checkCompat(base, { ...base, cheats: 1 })).toBe('cheats');
  });
  it('plays a home network with no input delay, a slow link with at most MAX_DELAY', () => {
    expect(chooseDelay(0)).toBe(0);
    expect(chooseDelay(40)).toBe(0);
    expect(chooseDelay(100)).toBe(0);
    expect(chooseDelay(160)).toBe(2);
    expect(chooseDelay(1000)).toBe(MAX_DELAY);
  });
});

describe('M15 prediction and bounded rollback', () => {
  it('two games with latency and jitter end in the same world as hot-seat play', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 15_000, { uneven: true });
    settle(net, host, guest);
    expect(host.world.frame).toBeGreaterThan(800);
    expect(host.world.frame).toBe(guest.world.frame);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
    // The final inputs of both games are the players' real inputs.
    for (let f = 0; f < host.world.frame - 1; f += 1) {
      expect(host.used.get(f)).toEqual(guest.used.get(f));
      expect(host.used.get(f)![0]).toEqual(play(0, f));
      expect(host.used.get(f)![1]).toEqual(play(1, f));
    }
    expect(hashWorld(host.world)).toBe(replay(host, host.world.frame));
    // Late input was predicted and corrected, never deeper than the window.
    expect(host.s.stats.rollbacks).toBeGreaterThan(10);
    expect(host.s.stats.maxRollback).toBeLessThanOrEqual(ROLLBACK_WINDOW + 2);
    expect(host.s.stats.matched).toBeGreaterThan(20);
    expect(host.s.stats.resyncs).toBe(0);
  });

  it('the local player is never delayed: the own input of a frame is the one sampled for it', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 1000);
    expect(host.s.delay).toBe(0);
    expect(host.s.nextLocal).toBe(host.world.frame);
  });

  it('a slow link stalls at the window instead of running away, and raises the delay', () => {
    const { net, host, guest } = pair(0);
    net.latency = 180;
    net.jitter = 60;
    run(net, [host, guest], 12_000);
    expect(host.world.frame - host.s.confirmed).toBeLessThanOrEqual(ROLLBACK_WINDOW + 1);
    expect(host.s.delay).toBeGreaterThan(0);
    expect(host.s.log.some((e) => e.ev === 'delay')).toBe(true);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
  });

  it('a desynchronised guest is repaired from the authority snapshot', () => {
    const { net, host, guest } = pair(0);
    guest.glitchAt = 200;
    run(net, [host, guest], 6000);
    settle(net, host, guest);
    expect(host.s.stats.resyncs).toBeGreaterThanOrEqual(1);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
    run(net, [host, guest], 2000);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
  });
});

describe('M15 holds', () => {
  it('a focus hold stops both worlds on the same frame; play resumes after readiness and a countdown', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 2000);
    guest.s.requestHold('focus', net.now);
    run(net, [host, guest], 500);
    expect(host.s.phase).toBe('hold');
    expect(host.s.ready).toEqual([true, false]);
    const stopped = host.world.frame;
    expect(guest.world.frame).toBe(stopped);
    run(net, [host, guest], 1000);
    expect(host.world.frame).toBe(stopped);
    guest.s.confirmReady(net.now);
    run(net, [host, guest], 200);
    expect(host.s.phase).toBe('countdown');
    expect(guest.s.phase).toBe('countdown');
    run(net, [host, guest], COUNTDOWN_MS + 200);
    expect(host.s.phase).toBe('run');
    run(net, [host, guest], 1000);
    expect(host.world.frame).toBeGreaterThan(stopped + 30);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
  });

  it('an explicit pause needs both players to resume', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 1000);
    host.s.requestHold('pause', net.now);
    run(net, [host, guest], 200);
    expect(guest.s.hold).toMatchObject({ kind: 'pause', by: 0 });
    host.s.confirmReady(net.now);
    run(net, [host, guest], 200);
    expect(host.s.phase).toBe('hold');
    guest.s.confirmReady(net.now);
    run(net, [host, guest], 200);
    expect(host.s.phase).toBe('countdown');
  });

  it('Leave ends the session for both players', () => {
    const { net, host, guest } = pair(0);
    guest.s.end('left', net.now);
    run(net, [host, guest], 200);
    expect(host.s.ended).toEqual({ reason: 'left', by: 1 });
    expect(guest.s.phase).toBe('ended');
  });
});

describe('M15 recovery: grace, survival proxy, migration and rejoin', () => {
  it('a guest who stays away after the courtesy hold is replaced by the proxy, then rejoins', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 2000);
    guest.s.requestHold('focus', net.now);
    // The guest's tab is hidden: only its timers run.
    run(net, [host, guest], COURTESY_MS + 500, { skip: new Set([guest]) });
    expect(host.s.partnerAbsent).toBe(true);
    expect(host.s.authority).toBe(true);
    expect(guest.s.phase).toBe('away');
    run(net, [host, guest], COUNTDOWN_MS + 3000, { skip: new Set([guest]) });
    expect(host.s.phase).toBe('run');
    const absentAt = host.s.log.find((e) => e.ev === 'absent')!.frame;
    // Recovery grace: guarded neutral; then the restricted proxy.
    for (const [f, inputs] of host.used) {
      if (f < absentAt) continue;
      const i = inputs[1]!;
      expect(i.pressed & ~PROXY_ALLOWED).toBe(0);
      expect(i.held & ~PROXY_ALLOWED).toBe(0);
      if (f < absentAt + PROXY_GRACE_FRAMES)
        expect(i).toMatchObject({ moveX: 0, moveZ: 0, held: ActionBit.Guard });
    }
    // The guest comes back and confirms: the authority hands the hero back.
    guest.s.confirmReady(net.now);
    run(net, [host, guest], 3000);
    expect(guest.s.phase).toBe('run');
    expect(guest.s.log.some((e) => e.ev === 'returned')).toBe(true);
    expect(host.s.partnerAbsent).toBe(false);
    run(net, [host, guest], 3000);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
    // After the hand-back the guest's own input counts again.
    const f = host.world.frame - 5;
    expect(host.used.get(f)![1]).toEqual(play(1, f));
  });

  it('the guest takes over when the host stays away; the host comes back as the returning player', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 2000);
    host.s.requestHold('focus', net.now);
    run(net, [host, guest], COURTESY_MS + 500, { skip: new Set([host]) });
    expect(guest.s.authority).toBe(true);
    expect(host.s.authority).toBe(false);
    expect(host.s.phase).toBe('away');
    expect(guest.s.log.some((e) => e.ev === 'promoted')).toBe(true);
    run(net, [host, guest], COUNTDOWN_MS + 2000, { skip: new Set([host]) });
    const before = guest.world.frame;
    run(net, [host, guest], 1000, { skip: new Set([host]) });
    expect(guest.world.frame).toBeGreaterThan(before + 40); // the guest plays on alone
    host.s.confirmReady(net.now);
    run(net, [host, guest], 3000);
    expect(host.s.phase).toBe('run');
    expect(host.s.authority).toBe(false);
    run(net, [host, guest], 2000);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
  });

  it('a closed host game: the guest takes over at once from its last confirmed frame', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 2000);
    const confirmed = guest.s.confirmed;
    // The room server tells the guest that the host's page closed.
    guest.s.receive({ t: 'sys', ev: 'peer-left' }, net.now);
    expect(guest.s.authority).toBe(true);
    const promoted = guest.s.log.find((e) => e.ev === 'promoted')!;
    expect(promoted.frame).toBe(confirmed + 1);
    net.handlers[0] = () => {}; // the host's page is gone
    run(net, [guest], 3000);
    expect(guest.world.frame).toBeGreaterThan(promoted.frame + 150);
    // Unconfirmed frames were rolled back: the host's slot follows the proxy from there.
    for (const [f, inputs] of guest.used)
      if (f >= promoted.frame) expect(inputs[0]!.pressed & ~PROXY_ALLOWED).toBe(0);
  });

  it('a pulled cable: both continue alone; when it is back the room owner keeps authority', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 2000);
    net.silent = true;
    net.drop();
    run(net, [host, guest], ABSENT_MS + 500);
    expect(host.s.partnerAbsent).toBe(true);
    const hostFrame = host.world.frame;
    run(net, [host, guest], MIGRATE_MS);
    expect(host.world.frame).toBeGreaterThan(hostFrame + 200); // the host never waits
    expect(guest.s.authority).toBe(true); // the guest took over too
    run(net, [host, guest], 2000);
    // The cable is plugged back in; the guest's game reconnects to the host's room.
    net.silent = false;
    host.s.linkRestored(net.now);
    guest.s.linkRestored(net.now);
    host.s.partnerReturning(net.now);
    run(net, [host, guest], 3000);
    expect(host.s.authority).toBe(true);
    expect(guest.s.authority).toBe(false);
    expect(guest.s.phase).toBe('run');
    run(net, [host, guest], 2000);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
    const kinds = guest.s.log.map((e) => e.ev);
    expect(kinds).toContain('promoted');
    expect(kinds).toContain('demoted');
    expect(kinds).toContain('returned');
  });

  it('a short silence on a live link: the guest is out, asks to come back on its own, and plays on', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 2000);
    net.silent = true;
    run(net, [host, guest], ABSENT_MS + 300);
    net.silent = false;
    run(net, [host, guest], 4000);
    expect(host.s.partnerAbsent).toBe(false);
    expect(guest.s.phase).toBe('run');
    expect(guest.s.authority).toBe(false);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
  });

  it('notices that cross a hand-back on a slow link do not start the hand-back again', () => {
    const { net, host, guest } = pair(0);
    net.latency = 150;
    run(net, [host, guest], 2000);
    net.silent = true;
    run(net, [host, guest], ABSENT_MS + 300);
    net.silent = false;
    // The guest also reconnects (a hello) while its old inputs are still in flight.
    host.s.partnerReturning(net.now);
    run(net, [host, guest], 8000);
    const backs = host.s.log.filter((e) => e.ev === 'back').length;
    expect(backs).toBeGreaterThanOrEqual(1);
    expect(backs).toBeLessThanOrEqual(2);
    expect(host.s.partnerAbsent).toBe(false);
    settle(net, host, guest);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
  });

  it('a hand-back with other rules is refused safely', () => {
    const { net, host, guest } = pair(0);
    run(net, [host, guest], 1000);
    host.s.receive(
      {
        t: 'back',
        back: {
          snap: snapshotWorld(guest.world),
          slot: 0,
          absentFrom: 10,
          control: 100,
          inputs: [],
          start: START,
          compat: { ...COMPAT, rules: 99 },
        },
      },
      net.now,
    );
    expect(host.s.ended?.reason).toBe('desync');
  });
});

describe('M15 Restricted Survival Proxy', () => {
  it('only guards, walks and uses basic attacks, and never spends meter', () => {
    const w = createWorld(3, OPTS);
    const meter: number[] = [];
    for (let f = 0; f < 6000; f += 1) {
      const p = proxyInput(w, 1, f);
      expect(p.pressed & ~PROXY_ALLOWED).toBe(0);
      expect(p.held & ~PROXY_ALLOWED).toBe(0);
      step(w, [play(0, f), p]);
      meter.push(w.bodies.find((b) => b.team === 'hero' && b.slot === 1)?.meter ?? 0);
    }
    // Meter may grow from hits, but the proxy never spends it.
    for (let i = 1; i < meter.length; i += 1)
      if (meter[i]! < meter[i - 1]!) throw new Error(`meter spent at frame ${i}`);
  });

  it('holds guarded neutral through the recovery grace and while handing back', () => {
    const w = createWorld(3, OPTS);
    step(w, [play(0, 0), play(1, 0)]);
    expect(proxyInput(w, 1, 0)).toMatchObject({ held: ActionBit.Guard, pressed: 0, moveX: 0 });
    expect(proxyInput(w, 1, PROXY_GRACE_FRAMES - 1).held).toBe(ActionBit.Guard);
    expect(proxyInput(w, 1, 5000, true)).toMatchObject({ held: ActionBit.Guard, pressed: 0 });
  });

  it('the in-memory pair still delivers messages in order (the M12 transport for tests)', () => {
    const wire = memoryPair();
    const got: NetMessage[] = [];
    wire.b.onMessage = (m) => got.push(m);
    wire.a.send({ t: 'ready' });
    wire.a.send({ t: 'rejoin' });
    wire.pump();
    expect(got.map((m) => m.t)).toEqual(['ready', 'rejoin']);
  });
});

void HASH_EVERY;
