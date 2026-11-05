import type { FrameInput, WorldSnapshot } from '@ffp/sim';
import { type EndReason, type HoldKind, type NetMessage, fromWire, toWire } from './protocol';

/** Every this many frames both games exchange their world hash. */
export const HASH_EVERY = 30;
/** Inputs older than this many frames behind the world are forgotten. */
export const KEEP_FRAMES = 240;
/** The courtesy hold after an unexpected focus loss (spec: about three seconds). */
export const COURTESY_MS = 3000;
/** After the courtesy hold, the recovery grace before the session ends safely. */
export const GRACE_MS = 60_000;
/** The synchronized countdown before play resumes. */
export const COUNTDOWN_MS = 3000;
/** Heartbeat interval; a partner silent for LOST_MS is gone. */
export const PING_MS = 500;
export const LOST_MS = 10_000;
/** No step for this long while playing shows "Waiting for your partner". */
export const STALL_MS = 400;

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

export type NetPhase = 'run' | 'hold' | 'countdown' | 'ended';

export interface LockstepHooks {
  /** The current world hash. */
  hash(): number;
  /** Host: a snapshot of the current world. */
  snapshot(): WorldSnapshot;
  /** Guest: replaces the world with the host's snapshot. */
  restore(s: WorldSnapshot): void;
}

export interface LockstepOptions {
  /** 0 = host, 1 = guest. */
  slot: 0 | 1;
  delay: number;
  send: (msg: NetMessage) => void;
  hooks: LockstepHooks;
  now: number;
}

export interface NetStats {
  rtt: number;
  /** Times the simulation had to wait for the partner's input. */
  stalls: number;
  /** Hash comparisons that matched / snapshot resynchronisations. */
  matched: number;
  resyncs: number;
  lastCompared: number;
}

/**
 * M12 delay-based deterministic lockstep for two players (D9 phase 1). Each game stamps
 * its local input for frame `f + delay` and sends it; a frame is simulated only when both
 * players' inputs for it are known, so both worlds step through exactly the same inputs.
 * Every HASH_EVERY frames the hashes are compared; on a mismatch the host's world is
 * authoritative and the guest restores the host's snapshot.
 *
 * A hold (focus loss or an explicit pause) stops both players from stamping new inputs,
 * so both worlds stop on the same frame by construction; play resumes only after both
 * players confirmed and a synchronized countdown ran. Time is passed in (`now`), never
 * read, so the session is fully testable.
 */
export class Lockstep {
  readonly slot: 0 | 1;
  readonly delay: number;
  phase: NetPhase = 'run';
  hold: { kind: HoldKind; by: number; since: number } | null = null;
  /** Who confirmed readiness during a hold. */
  ready: [boolean, boolean] = [false, false];
  countdownEnd = 0;
  ended: { reason: EndReason; by: number } | null = null;
  readonly stats: NetStats = { rtt: 0, stalls: 0, matched: 0, resyncs: 0, lastCompared: -1 };
  /** Frame of the newest input received from the partner. */
  remoteFrame = -1;
  /** Next frame this game stamps a local input for. */
  nextLocal: number;
  /** Bumped whenever the world was replaced by a snapshot (the renderer starts over). */
  generation = 0;
  private readonly inputs: [Map<number, FrameInput>, Map<number, FrameInput>] = [
    new Map(),
    new Map(),
  ];
  private readonly ownHash = new Map<number, number>();
  private readonly peerHash = new Map<number, number>();
  private lastSnapFrame = -1;
  private lastHeard: number;
  private lastPing = 0;
  private pingN = 0;
  private lastStep: number;
  private waiting = false;

  constructor(private readonly o: LockstepOptions) {
    this.slot = o.slot;
    this.delay = o.delay;
    for (let f = 0; f < o.delay; f += 1) {
      this.inputs[0].set(f, IDLE);
      this.inputs[1].set(f, IDLE);
    }
    this.nextLocal = o.delay;
    this.lastHeard = o.now;
    this.lastStep = o.now;
  }

  private get other(): 0 | 1 {
    return this.slot === 0 ? 1 : 0;
  }

  /** Whether stamping for `frame` needs a fresh local input sample now. */
  wantsInput(frame: number): boolean {
    return this.phase === 'run' && this.nextLocal <= frame + this.delay;
  }

  /**
   * Stamps the local input for every frame up to `frame + delay` (normally one). Extra
   * frames after a jump repeat what is held without new presses.
   */
  submit(frame: number, sample: FrameInput): void {
    let first = true;
    while (this.wantsInput(frame)) {
      const input = first ? sample : { ...sample, pressed: 0, dirPressed: 0 };
      first = false;
      const f = this.nextLocal;
      this.inputs[this.slot].set(f, input);
      this.o.send({ t: 'in', f, i: toWire(input) });
      this.nextLocal += 1;
    }
  }

  canStep(frame: number): boolean {
    return this.phase !== 'ended' && this.inputs[0].has(frame) && this.inputs[1].has(frame);
  }

  inputsFor(frame: number): FrameInput[] {
    return [this.inputs[0].get(frame) ?? IDLE, this.inputs[1].get(frame) ?? IDLE];
  }

  /** How many extra steps this game may take now to catch up with its partner (0–2). */
  catchUp(frame: number): number {
    const ahead = this.remoteFrame - (frame + this.delay);
    return ahead > 1 ? Math.min(2, ahead - 1) : 0;
  }

  /** Call after stepping the world to `frame` (the world's new frame number). */
  stepped(frame: number, now: number): void {
    this.lastStep = now;
    this.waiting = false;
    const old = frame - KEEP_FRAMES;
    for (const m of this.inputs) for (const f of m.keys()) if (f < old) m.delete(f);
    if (frame % HASH_EVERY === 0) {
      const h = this.o.hooks.hash();
      this.ownHash.set(frame, h);
      this.o.send({ t: 'hash', f: frame, h });
      this.compare(frame);
    }
    for (const m of [this.ownHash, this.peerHash])
      for (const f of m.keys()) if (f < old) m.delete(f);
  }

  /** The simulation could not step this render frame (no partner input yet). */
  stalled(now: number): void {
    if (this.phase === 'run' && !this.waiting && now - this.lastStep > STALL_MS) {
      this.waiting = true;
      this.stats.stalls += 1;
    }
  }

  /** "Waiting for your partner" (playing, but no step for a moment). */
  get waitingForPartner(): boolean {
    return this.phase === 'run' && this.waiting;
  }

  /** Recent own hashes, oldest first (diagnostics and tests). */
  hashes(): [number, number][] {
    return [...this.ownHash.entries()].sort((a, b) => a[0] - b[0]);
  }

  private compare(f: number): void {
    const a = this.ownHash.get(f);
    const b = this.peerHash.get(f);
    if (a === undefined || b === undefined) return;
    this.stats.lastCompared = f;
    if (a === b) {
      this.stats.matched += 1;
      return;
    }
    if (f <= this.lastSnapFrame) return; // already being repaired
    if (this.slot === 0) this.sendSnapshot();
    else {
      this.lastSnapFrame = f;
      this.o.send({ t: 'resync', f });
    }
  }

  private sendSnapshot(): void {
    const s = this.o.hooks.snapshot();
    this.lastSnapFrame = s.frame;
    this.stats.resyncs += 1;
    this.o.send({ t: 'snap', s });
  }

  // --- holds, pause and the end ----------------------------------------------------------

  /** This player left the window (focus) or asked for a pause. */
  requestHold(kind: HoldKind, now: number): void {
    if (this.phase === 'ended') return;
    this.startHold(kind, this.slot, now);
    this.o.send({ t: 'hold', kind });
  }

  private startHold(kind: HoldKind, by: number, now: number): void {
    if (this.phase === 'hold' && this.hold) {
      // A second request while holding: that player has to confirm again.
      this.ready[by] = false;
      if (kind === 'pause' && this.hold.kind === 'focus') this.hold = { kind, by, since: now };
      return;
    }
    this.phase = 'hold';
    this.hold = { kind, by, since: now };
    // After a focus loss the player who stayed is ready; a pause needs both to confirm.
    this.ready = [false, false];
    if (kind === 'focus') this.ready[by === 0 ? 1 : 0] = true;
  }

  /** This player is ready to continue (Resume, or back after leaving the window). */
  confirmReady(now: number): void {
    if (this.phase !== 'hold') return;
    this.ready[this.slot] = true;
    this.o.send({ t: 'ready' });
    this.maybeGo(now);
  }

  private maybeGo(now: number): void {
    if (this.slot !== 0 || this.phase !== 'hold' || !this.ready[0] || !this.ready[1]) return;
    this.o.send({ t: 'go', ms: COUNTDOWN_MS });
    this.phase = 'countdown';
    this.countdownEnd = now + COUNTDOWN_MS;
  }

  /** Ends the session for both players (the partner is told why). */
  end(reason: EndReason, now: number): void {
    void now;
    if (this.phase === 'ended') return;
    this.o.send({ t: 'bye', reason });
    this.finish(reason, this.slot);
  }

  private finish(reason: EndReason, by: number): void {
    this.phase = 'ended';
    this.ended = { reason, by };
    this.hold = null;
  }

  /** The connection itself is gone. */
  lost(): void {
    if (this.phase !== 'ended') this.finish('lost', this.other);
  }

  /** Seconds left of the recovery grace after a focus hold (null outside it). */
  graceLeft(now: number): number | null {
    if (this.phase !== 'hold' || this.hold?.kind !== 'focus') return null;
    const t = now - this.hold.since;
    if (t < COURTESY_MS) return null;
    return Math.max(0, Math.ceil((COURTESY_MS + GRACE_MS - t) / 1000));
  }

  /** Seconds left of the countdown (null outside it). */
  countdownLeft(now: number): number | null {
    return this.phase === 'countdown'
      ? Math.max(0, Math.ceil((this.countdownEnd - now) / 1000))
      : null;
  }

  /** Timers: heartbeat, countdown end, grace expiry, silence. Call often (also hidden). */
  tick(now: number): void {
    if (this.phase === 'ended') return;
    if (now - this.lastPing >= PING_MS) {
      this.lastPing = now;
      this.pingN += 1;
      this.o.send({ t: 'ping', n: this.pingN, at: now });
    }
    if (this.phase === 'countdown' && now >= this.countdownEnd) {
      this.phase = 'run';
      this.hold = null;
      this.ready = [false, false];
      this.lastStep = now;
    }
    if (
      this.phase === 'hold' &&
      this.hold?.kind === 'focus' &&
      this.hold.by !== this.slot &&
      now - this.hold.since > COURTESY_MS + GRACE_MS
    )
      this.end('away', now);
    if (now - this.lastHeard > LOST_MS) this.finish('lost', this.other);
  }

  /** A message from the partner. */
  receive(msg: NetMessage, now: number): void {
    this.lastHeard = now;
    if (this.phase === 'ended') return;
    const other = this.other;
    switch (msg.t) {
      case 'in':
        this.inputs[other].set(msg.f, fromWire(msg.i));
        if (msg.f > this.remoteFrame) this.remoteFrame = msg.f;
        break;
      case 'hash':
        this.peerHash.set(msg.f, msg.h);
        this.compare(msg.f);
        break;
      case 'resync':
        if (this.slot === 0 && msg.f > this.lastSnapFrame) this.sendSnapshot();
        break;
      case 'snap':
        if (this.slot === 1) {
          try {
            this.o.hooks.restore(msg.s);
          } catch {
            // A snapshot that cannot be validated: end safely instead of guessing.
            this.end('desync', now);
            break;
          }
          this.ownHash.clear();
          this.lastSnapFrame = msg.s.frame;
          this.stats.resyncs += 1;
          this.generation += 1;
          // Inputs this game stamps from here on continue where they were.
          if (this.nextLocal < msg.s.frame) this.nextLocal = msg.s.frame;
        }
        break;
      case 'hold':
        this.startHold(msg.kind, other, now);
        break;
      case 'ready':
        if (this.phase === 'hold') {
          this.ready[other] = true;
          this.maybeGo(now);
        }
        break;
      case 'go':
        // Only a guest that confirmed counts down (a newer hold of its own cancels the go).
        if (this.slot === 1 && this.phase === 'hold' && this.ready[1]) {
          this.phase = 'countdown';
          this.countdownEnd = now + msg.ms;
        }
        break;
      case 'ping':
        this.o.send({ t: 'pong', n: msg.n, at: msg.at });
        break;
      case 'pong': {
        const rtt = Math.max(0, now - msg.at);
        this.stats.rtt = this.stats.rtt === 0 ? rtt : Math.round(this.stats.rtt * 0.8 + rtt * 0.2);
        break;
      }
      case 'bye':
        this.finish(msg.reason, other);
        break;
      case 'sys':
        if (msg.ev === 'peer-left') this.finish('lost', other);
        break;
      default:
        break;
    }
  }
}
