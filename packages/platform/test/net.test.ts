import {
  type FrameInput,
  type World,
  ActionBit,
  createWorld,
  hashWorld,
  restoreWorld,
  snapshotWorld,
  step,
} from '@ffp/sim';
import {
  COUNTDOWN_MS,
  COURTESY_MS,
  GRACE_MS,
  HASH_EVERY,
  LOST_MS,
  Lockstep,
  checkCompat,
  chooseDelay,
  memoryPair,
  type Compat,
  type Transport,
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

const DELAY = 3;
const OPTS = { stage: 'stage1', difficulty: 'medium' } as const;

class Peer {
  world: World = createWorld(5, OPTS);
  lock: Lockstep;
  now = 0;
  steps = 0;
  constructor(
    slot: 0 | 1,
    readonly t: Transport,
  ) {
    this.lock = new Lockstep({
      slot,
      delay: DELAY,
      now: 0,
      send: (m) => t.send(m),
      hooks: {
        hash: () => hashWorld(this.world),
        snapshot: () => snapshotWorld(this.world),
        restore: (s) => (this.world = restoreWorld(s)),
      },
    });
    t.onMessage = (m) => this.lock.receive(m, this.now);
  }

  /** Up to `n` simulation steps, as one render frame would. */
  frame(n: number, ms = 16) {
    this.now += ms;
    this.lock.tick(this.now);
    for (let i = 0; i < n; i += 1) {
      const f = this.world.frame;
      if (this.lock.wantsInput(f)) this.lock.submit(f, play(this.lock.slot, this.lock.nextLocal));
      if (!this.lock.canStep(f)) {
        this.lock.stalled(this.now);
        break;
      }
      step(this.world, this.lock.inputsFor(f));
      this.lock.stepped(this.world.frame, this.now);
      this.steps += 1;
    }
  }
}

/** The same inputs on one machine (hot-seat co-op): the lockstep result must match. */
function reference(frames: number): number {
  const w = createWorld(5, OPTS);
  for (let f = 0; f < frames; f += 1) step(w, f < DELAY ? [IDLE, IDLE] : [play(0, f), play(1, f)]);
  return hashWorld(w);
}
const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

function pair() {
  const wire = memoryPair();
  return { wire, host: new Peer(0, wire.a), guest: new Peer(1, wire.b) };
}

describe('M12 lobby checks', () => {
  const base: Compat = { game: '0.12.0', protocol: 1, rules: 11, content: 22, cheats: 33 };
  it('names the first difference, protocol first', () => {
    expect(checkCompat(base, base)).toBeNull();
    expect(checkCompat(base, { ...base, game: '0.11.0', protocol: 2 })).toBe('protocol');
    expect(checkCompat(base, { ...base, game: '0.11.0' })).toBe('game');
    expect(checkCompat(base, { ...base, rules: 1 })).toBe('rules');
    expect(checkCompat(base, { ...base, content: 1 })).toBe('content');
    expect(checkCompat(base, { ...base, cheats: 1 })).toBe('cheats');
  });
  it('picks 2–4 frames of input delay from the round trip', () => {
    expect(chooseDelay(0)).toBe(2);
    expect(chooseDelay(10)).toBe(2);
    expect(chooseDelay(30)).toBe(3);
    expect(chooseDelay(60)).toBe(4);
    expect(chooseDelay(500)).toBe(4);
  });
});

describe('M12 lockstep', () => {
  it('two games on uneven timing step through the same inputs as hot-seat play', () => {
    const { wire, host, guest } = pair();
    for (let r = 0; r < 4000 && (host.world.frame < 900 || guest.world.frame < 900); r += 1) {
      host.frame(r % 3 === 0 ? 2 : 1);
      if (r % 5 !== 0) guest.frame(1 + (r % 2));
      // The network delivers in bursts.
      if (r % 4 === 0) wire.pump();
    }
    wire.pump();
    // Let both reach the same frame.
    for (let i = 0; i < 20; i += 1) {
      if (host.world.frame < guest.world.frame) host.frame(1);
      if (guest.world.frame < host.world.frame) guest.frame(1);
      wire.pump();
    }
    expect(host.world.frame).toBe(guest.world.frame);
    expect(hashWorld(host.world)).toBe(hashWorld(guest.world));
    expect(hashWorld(host.world)).toBe(reference(host.world.frame));
    expect(host.lock.stats.matched).toBeGreaterThan(20);
    expect(host.lock.stats.resyncs).toBe(0);
  });

  it('a desynchronised guest is repaired from the host snapshot', () => {
    const { wire, host, guest } = pair();
    const run = (n: number) => {
      for (let i = 0; i < n; i += 1) {
        host.frame(1);
        guest.frame(1);
        wire.pump();
      }
    };
    run(200);
    // Something went wrong on the guest only.
    guest.world.bodies[0]!.health -= 7;
    run(3 * HASH_EVERY);
    expect(host.lock.stats.resyncs).toBe(1);
    expect(guest.lock.stats.resyncs).toBe(1);
    run(3 * HASH_EVERY);
    const f = Math.min(host.world.frame, guest.world.frame);
    run(2);
    expect(Math.abs(host.world.frame - guest.world.frame)).toBeLessThanOrEqual(DELAY + 1);
    const common = host.lock
      .hashes()
      .filter(([hf]) => guest.lock.hashes().some(([gf]) => gf === hf));
    expect(common.length).toBeGreaterThan(0);
    for (const [hf, h] of common) {
      if (hf <= f - 3 * HASH_EVERY) continue;
      expect(guest.lock.hashes().find(([gf]) => gf === hf)![1]).toBe(h);
    }
    expect(host.lock.stats.resyncs).toBe(1); // repaired once, then in step again
  });

  it('a focus hold stops both worlds on the same frame; play resumes after readiness and a countdown', () => {
    const { wire, host, guest } = pair();
    const run = (n: number, ms = 16) => {
      for (let i = 0; i < n; i += 1) {
        host.frame(1, ms);
        guest.frame(1, ms);
        wire.pump();
      }
    };
    run(120);
    guest.lock.requestHold('focus', guest.now);
    run(60);
    expect(host.lock.phase).toBe('hold');
    expect(host.lock.hold).toMatchObject({ kind: 'focus', by: 1 });
    expect(host.lock.ready).toEqual([true, false]); // the player who stayed is ready
    const stopped = host.world.frame;
    expect(guest.world.frame).toBe(stopped);
    run(60);
    expect(host.world.frame).toBe(stopped);
    // Coming back alone never restarts play: the guest must confirm.
    guest.lock.confirmReady(guest.now);
    wire.pump();
    expect(host.lock.phase).toBe('countdown');
    expect(guest.lock.phase).toBe('countdown');
    run(Math.ceil(COUNTDOWN_MS / 16) - 5);
    expect(host.world.frame).toBe(stopped);
    run(20);
    expect(host.lock.phase).toBe('run');
    run(60);
    expect(host.world.frame).toBeGreaterThan(stopped + 30);
    expect(Math.abs(host.world.frame - guest.world.frame)).toBeLessThanOrEqual(DELAY + 1);
  });

  it('an explicit pause needs both players to resume', () => {
    const { wire, host, guest } = pair();
    const run = (n: number) => {
      for (let i = 0; i < n; i += 1) {
        host.frame(1);
        guest.frame(1);
        wire.pump();
      }
    };
    run(60);
    host.lock.requestHold('pause', host.now);
    run(10);
    expect(guest.lock.hold).toMatchObject({ kind: 'pause', by: 0 });
    host.lock.confirmReady(host.now);
    run(5);
    expect(host.lock.phase).toBe('hold');
    guest.lock.confirmReady(guest.now);
    run(2);
    expect(host.lock.phase).toBe('countdown');
  });

  it('a hold that outlasts the courtesy hold and the grace ends the session safely', () => {
    const { wire, host, guest } = pair();
    host.frame(1);
    guest.frame(1);
    wire.pump();
    guest.lock.requestHold('focus', guest.now);
    wire.pump();
    // The guest's tab is hidden: it keeps answering only through the network (heartbeat).
    for (let t = 0; t < COURTESY_MS + GRACE_MS + 2000; t += 500) {
      host.frame(1, 500);
      guest.lock.tick((guest.now += 500));
      wire.pump();
      if (t === COURTESY_MS + 1000) expect(host.lock.graceLeft(host.now)).toBeGreaterThan(50);
    }
    expect(host.lock.phase).toBe('ended');
    expect(host.lock.ended?.reason).toBe('away');
    expect(guest.lock.ended?.reason).toBe('away');
  });

  it('a silent partner or a closed connection ends the session as lost', () => {
    const { wire, host } = pair();
    host.frame(1, LOST_MS + 1);
    expect(host.lock.ended?.reason).toBe('lost');
    void wire;
  });

  it('Leave ends the session for both players', () => {
    const { wire, host, guest } = pair();
    guest.lock.end('left', guest.now);
    wire.pump();
    expect(host.lock.ended).toEqual({ reason: 'left', by: 1 });
    expect(guest.lock.phase).toBe('ended');
  });
});
