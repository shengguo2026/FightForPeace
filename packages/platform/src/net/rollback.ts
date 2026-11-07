import type { FrameInput, WorldSnapshot } from '@ffp/sim';
import {
  type BackInfo,
  type Compat,
  type EndReason,
  type HoldKind,
  MAX_DELAY,
  type NetMessage,
  type StartInfo,
  type WireInput,
  checkCompat,
  fromWire,
  toWire,
} from './protocol';

/** Every this many frames both games exchange the hash of a confirmed frame. */
export const HASH_EVERY = 30;
/** How far (frames) the world may run ahead of the last frame both inputs are known for. */
export const ROLLBACK_WINDOW = 8;
/** Inputs older than this many frames behind the confirmed frame are forgotten. */
export const KEEP_FRAMES = 240;
/** The courtesy hold after an unexpected focus loss (spec: about three seconds). */
export const COURTESY_MS = 3000;
/** The synchronized countdown before play resumes. */
export const COUNTDOWN_MS = 3000;
/** Heartbeat interval (also measures the round trip). */
export const PING_MS = 500;
/** The authority treats a partner silent this long as missing (recovery grace, proxy). */
export const ABSENT_MS = 1500;
/** A game without authority takes it over when the authority is silent this long. */
export const MIGRATE_MS = 6000;
/** No step for this long while playing shows "Waiting for your partner". */
export const STALL_MS = 400;
/** Frames between the hand-back snapshot and the returning player's first own input. */
export const RETURN_LEAD = 20;
/** The hand-back waits at most this long for the hero to be actionable. */
export const RETURN_WAIT_MS = 2000;
/** Every this often, waiting on this share of render frames raises the local delay by one. */
export const DELAY_REVIEW_MS = 5000;
export const STALL_SHARE_TO_RAISE = 0.1;

/** Kept for M12 tests and readers: the old recovery grace no longer ends the session. */
export const GRACE_MS = COURTESY_MS;

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

/**
 * run: playing. hold: a synchronized pause or courtesy hold. countdown: about to resume.
 * away: this computer's player is out of the game (missing, then waiting to come back).
 * ended: the session is over.
 */
export type NetPhase = 'run' | 'hold' | 'countdown' | 'away' | 'ended';

/** Session log entries (F&D: recorded for replay, debugging and progression checks). */
export type NetLogEvent =
  | 'absent'
  | 'proxy'
  | 'promoted'
  | 'demoted'
  | 'rejoin'
  | 'back'
  | 'returned'
  | 'snapshot'
  | 'delay'
  | 'credit'
  | 'link-down'
  | 'link-up'
  | 'end';

export interface NetLogEntry {
  frame: number;
  ev: NetLogEvent;
  slot: number;
}

/** The simulation, as the rollback session sees it. `S` is a saved world state. */
export interface SimHooks<S> {
  /** The world's current frame (the next frame to be simulated). */
  frame(): number;
  /** A copy of the world now (the state at the start of `frame()`). */
  save(): S;
  /** Replaces the world with a copy of `state`. */
  load(state: S): void;
  /** Simulates one frame with both players' inputs. */
  step(inputs: FrameInput[]): void;
  /** Hash of the world now, or of a saved state. */
  hash(state?: S): number;
  /** A wire snapshot of the world now, or of a saved state. */
  snapshot(state?: S): WorldSnapshot;
  /** Validates a wire snapshot and returns its state (throws when it cannot be trusted). */
  restore(s: WorldSnapshot): S;
  /** The Restricted Survival Proxy's input for `slot` on the current world. */
  proxy(slot: number, absentFrames: number, handover: boolean): FrameInput;
  /** Whether `slot`'s hero is at a safe actionable moment on the current world. */
  actionable(slot: number): boolean;
}

export interface RollbackOptions<S> {
  /** This computer's player slot in the world (0 = the player who hosted the lobby). */
  slot: 0 | 1;
  /** Whether this computer starts with authority (the host). */
  authority: boolean;
  delay: number;
  send: (msg: NetMessage) => void;
  hooks: SimHooks<S>;
  now: number;
  /** How the session started and this copy's compatibility data (for the hand-back). */
  start: StartInfo;
  compat: Compat;
  /** The courtesy hold (default COURTESY_MS; tests may lengthen it). */
  courtesyMs?: number;
}

export interface NetStats {
  rtt: number;
  /** Times the simulation had to wait for the partner's input. */
  stalls: number;
  /** Hash comparisons that matched / snapshot resynchronisations. */
  matched: number;
  resyncs: number;
  lastCompared: number;
  /** Rollbacks, frames re-simulated in total, and the deepest one. */
  rollbacks: number;
  rolledFrames: number;
  maxRollback: number;
}

/** One stretch of frames in which a player is missing (their hero follows the proxy). */
interface Absence {
  from: number;
  /** First frame the player's own input counts again (Infinity: still missing). */
  to: number;
  /** From this frame on, control is being handed back: guarded neutral only. */
  handover: number;
}

/**
 * M15 Host-Authoritative Deterministic Simulation with Prediction and Bounded Rollback
 * (D9 phase 2, F&D §4), on the M12 wire format.
 *
 * - Each game stamps its local input for `frame + delay` (0 on a home network) and sends
 *   it. The partner's input that has not arrived is predicted (what they held, without
 *   new presses); when it arrives and differs, the world rolls back to that frame and is
 *   re-simulated. The world never runs more than ROLLBACK_WINDOW frames ahead of the last
 *   frame both inputs are known for; past that it waits.
 * - Hashes of confirmed frames are compared every HASH_EVERY frames; on a difference the
 *   authority's snapshot replaces the other world.
 * - The authority owns who is in the game. A partner who stays silent, closes the game or
 *   stays away after a courtesy hold is marked missing from a frame both games agree on
 *   (the frame after the last confirmed one): their hero holds guarded neutral for the
 *   recovery grace, then follows the Restricted Survival Proxy (computed from the world,
 *   so it re-simulates identically).
 * - A game without authority whose authority is gone takes authority over from its last
 *   confirmed frame (frames after it are rolled back) and continues; the former authority
 *   comes back as the returning player.
 * - A returning player asks to rejoin; at the hero's first safe actionable moment the
 *   authority sends a validated snapshot, its own pending inputs and the frame from which
 *   the returning player's input counts again.
 *
 * Holds work as in M12 (both stop stamping; only confirmed frames are simulated, so both
 * worlds stop on the same frame). Time is passed in (`now`), never read.
 */
export class RollbackSession<S> {
  readonly slot: 0 | 1;
  authority: boolean;
  /** Whether this computer owns the room the link runs through (wins a double takeover). */
  owner: boolean;
  delay: number;
  phase: NetPhase = 'run';
  hold: { kind: HoldKind; by: number; since: number } | null = null;
  /** Who confirmed readiness during a hold. */
  ready: [boolean, boolean] = [false, false];
  countdownEnd = 0;
  ended: { reason: EndReason; by: number } | null = null;
  readonly stats: NetStats = {
    rtt: 0,
    stalls: 0,
    matched: 0,
    resyncs: 0,
    lastCompared: -1,
    rollbacks: 0,
    rolledFrames: 0,
    maxRollback: 0,
  };
  readonly log: NetLogEntry[] = [];
  /** Frame of the newest input received from the partner. */
  remoteFrame = -1;
  /** Next frame this game stamps a local input for. */
  nextLocal: number;
  /** Last frame for which both players' inputs are known (or decided). */
  confirmed = -1;
  /** Bumped whenever the world was replaced by a snapshot (the renderer starts over). */
  generation = 0;
  /** Whether the link to the partner is up (a message arrived recently). */
  linkUp = true;
  /** This game asked to come back and waits for the hand-back. */
  rejoining = false;
  private readonly inputs: [Map<number, FrameInput>, Map<number, FrameInput>] = [
    new Map(),
    new Map(),
  ];
  private readonly absences: [Absence[], Absence[]] = [[], []];
  /** Partner inputs that were predicted for frames already simulated. */
  private readonly predicted = new Map<number, FrameInput>();
  private readonly saves = new Map<number, S>();
  private rollbackFrom: number | null = null;
  /** Frames before this can no longer be rolled back to (a snapshot replaced them). */
  private floor = 0;
  private nextHash = HASH_EVERY;
  private readonly ownHash = new Map<number, number>();
  private readonly peerHash = new Map<number, number>();
  private lastSnapFrame = -1;
  private lastHeard: number;
  private lastPing = 0;
  private pingN = 0;
  private lastStep: number;
  private waiting = false;
  /** Render frames (and those that could not step) since the last delay review. */
  private reviewFrames = 0;
  private reviewStalls = 0;
  private lastDelayReview: number;
  private lastAbsentNotice = -Infinity;
  private pendingBack: number | null = null;
  private readonly courtesy: number;

  constructor(private readonly o: RollbackOptions<S>) {
    this.slot = o.slot;
    this.courtesy = o.courtesyMs ?? COURTESY_MS;
    this.authority = o.authority;
    this.owner = o.authority;
    this.delay = Math.min(MAX_DELAY, Math.max(0, o.delay));
    for (let f = 0; f < this.delay; f += 1) {
      this.inputs[0].set(f, IDLE);
      this.inputs[1].set(f, IDLE);
    }
    this.nextLocal = this.delay;
    this.lastHeard = o.now;
    this.lastStep = o.now;
    this.lastDelayReview = o.now;
    this.updateConfirmed();
  }

  private get other(): 0 | 1 {
    return this.slot === 0 ? 1 : 0;
  }

  private record(ev: NetLogEvent, slot: number, frame = this.o.hooks.frame()): void {
    this.log.push({ frame, ev, slot });
    if (this.log.length > 500) this.log.shift();
  }

  /** Test hook: applies `fn` to every saved state too (a lasting divergence of this world). */
  tamperSaves(fn: (state: S) => void): void {
    for (const state of this.saves.values()) fn(state);
  }

  /** Records a credit event (results saved on this computer) in the session log. */
  noteCredit(): void {
    this.record('credit', this.slot);
  }

  // --- who is in the game --------------------------------------------------------------

  private absenceAt(slot: number, f: number): Absence | undefined {
    const list = this.absences[slot]!;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const a = list[i]!;
      if (f >= a.from && f < a.to) return a;
    }
    return undefined;
  }

  /** Whether `slot` is missing on frame `f` (their hero follows the proxy). */
  isAbsent(slot: number, f = this.o.hooks.frame()): boolean {
    return this.absenceAt(slot, f) !== undefined;
  }

  /** The partner is missing now and has not been handed back yet. */
  get partnerAbsent(): boolean {
    const list = this.absences[this.other];
    const last = list[list.length - 1];
    return last !== undefined && last.to === Infinity;
  }

  /** Frames since `slot` went missing (null when present). */
  absentFrames(slot: number): number | null {
    const f = this.o.hooks.frame();
    const a = this.absenceAt(slot, f);
    return a ? f - a.from : null;
  }

  private known(slot: number, f: number): boolean {
    return this.inputs[slot]!.has(f) || this.absenceAt(slot, f) !== undefined;
  }

  private updateConfirmed(): void {
    const cap = this.o.hooks.frame() + MAX_DELAY + ROLLBACK_WINDOW + 1;
    let c = this.confirmed;
    while (c + 1 < cap && this.known(0, c + 1) && this.known(1, c + 1)) c += 1;
    this.confirmed = c;
  }

  // --- stepping ------------------------------------------------------------------------

  /** Whether stamping for `frame` needs a fresh local input sample now. */
  wantsInput(frame: number): boolean {
    return this.phase === 'run' && this.nextLocal <= frame + this.delay;
  }

  /**
   * Stamps the local input for every frame up to `frame + delay` (normally one). Extra
   * frames after a delay change repeat what is held without new presses.
   */
  submit(frame: number, sample: FrameInput): void {
    let first = true;
    while (this.wantsInput(frame)) {
      const input = first ? sample : { ...sample, pressed: 0, dirPressed: 0 };
      first = false;
      const f = this.nextLocal;
      this.nextLocal += 1;
      if (this.absenceAt(this.slot, f)) continue;
      this.inputs[this.slot].set(f, input);
      this.o.send({ t: 'in', f, i: toWire(input) });
    }
    this.updateConfirmed();
  }

  /** Whether frame `f` (the world's current frame) may be simulated now. */
  canStep(f: number): boolean {
    if (this.phase === 'ended' || this.phase === 'away' || this.rejoining) return false;
    if (!this.known(this.slot, f)) return false;
    if (this.phase !== 'run') return f <= this.confirmed;
    return f <= this.confirmed + ROLLBACK_WINDOW;
  }

  /** The newest known input of `slot` before `f`, without new presses (the prediction). */
  private predict(slot: number, f: number): FrameInput {
    const m = this.inputs[slot]!;
    for (let g = f - 1; g >= f - KEEP_FRAMES && g >= 0; g -= 1) {
      const i = m.get(g);
      if (i) return { ...i, pressed: 0, dirPressed: 0 };
    }
    return IDLE;
  }

  private resolve(slot: number, f: number): FrameInput {
    const a = this.absenceAt(slot, f);
    if (a) return this.o.hooks.proxy(slot, f - a.from, f >= a.handover);
    const i = this.inputs[slot]!.get(f);
    if (i) return i;
    const p = this.predict(slot, f);
    if (slot === this.other) this.predicted.set(f, p);
    return p;
  }

  /** Simulates the world's current frame (saving it first for rollbacks). */
  private stepOnce(): FrameInput[] {
    const f = this.o.hooks.frame();
    this.saves.set(f, this.o.hooks.save());
    const inputs = [this.resolve(0, f), this.resolve(1, f)];
    this.o.hooks.step(inputs);
    return inputs;
  }

  /** Inputs the next step would use (tests and diagnostics). */
  inputsFor(frame: number): FrameInput[] {
    return [this.resolve(0, frame), this.resolve(1, frame)];
  }

  /** How many extra steps this game may take now to catch up with its partner (0–2). */
  catchUp(frame: number): number {
    if (this.phase !== 'run') return 0;
    const ahead = this.remoteFrame - (frame + this.delay);
    return ahead > 1 ? Math.min(2, ahead - 1) : 0;
  }

  /**
   * One render frame: applies a pending rollback, then up to `steps` new frames, stamping
   * the local input from `sample` first. `before` runs before every new frame (test
   * hooks). Returns the inputs of every new frame.
   */
  advance(
    steps: number,
    sample: () => FrameInput,
    now: number,
    before?: () => void,
  ): FrameInput[][] {
    const out: FrameInput[][] = [];
    if (this.phase === 'ended') return out;
    this.applyRollback();
    // Holds and countdowns show the last frame both games agree on.
    if (this.phase === 'hold' || this.phase === 'countdown') this.rewindToConfirmed();
    this.maybeHandBack(now);
    const want = steps > 0 ? steps + this.catchUp(this.o.hooks.frame()) : 0;
    if (want > 0 && this.phase === 'run') this.reviewFrames += 1;
    for (let i = 0; i < want; i += 1) {
      const f = this.o.hooks.frame();
      if (this.wantsInput(f)) this.submit(f, sample());
      if (!this.canStep(f)) {
        this.stalledAt(now);
        break;
      }
      before?.();
      out.push(this.stepOnce());
      this.lastStep = now;
      this.waiting = false;
    }
    this.updateConfirmed();
    this.afterSteps();
    return out;
  }

  private applyRollback(): void {
    const from = this.rollbackFrom;
    this.rollbackFrom = null;
    if (from === null) return;
    const target = this.o.hooks.frame();
    if (from >= target) return;
    const state = this.saves.get(from);
    if (state === undefined) {
      // Further back than the window keeps: only a snapshot can repair this world.
      if (!this.authority) this.o.send({ t: 'resync', f: from });
      return;
    }
    this.o.hooks.load(state);
    for (const f of [...this.predicted.keys()]) if (f >= from) this.predicted.delete(f);
    while (this.o.hooks.frame() < target) this.stepOnce();
    const depth = target - from;
    this.stats.rollbacks += 1;
    this.stats.rolledFrames += depth;
    if (depth > this.stats.maxRollback) this.stats.maxRollback = depth;
  }

  private rollbackTo(f: number): void {
    if (f < this.floor || f >= this.o.hooks.frame()) return;
    this.rollbackFrom = this.rollbackFrom === null ? f : Math.min(this.rollbackFrom, f);
  }

  /** In a hold the world shows the last confirmed frame (predicted frames are undone). */
  private rewindToConfirmed(): void {
    const f = this.confirmed + 1;
    if (this.o.hooks.frame() <= f) return;
    const state = this.saves.get(f);
    if (state === undefined) return;
    this.o.hooks.load(state);
    for (const g of [...this.predicted.keys()]) if (g >= f) this.predicted.delete(g);
  }

  private stalledAt(now: number): void {
    if (this.phase !== 'run') return;
    this.reviewStalls += 1;
    if (this.waiting || now - this.lastStep <= STALL_MS) return;
    this.waiting = true;
    this.stats.stalls += 1;
  }

  /** "Waiting for your partner" (playing, but no step for a moment). */
  get waitingForPartner(): boolean {
    return this.phase === 'run' && this.waiting;
  }

  /** Hashes, pruning. */
  private afterSteps(): void {
    const frame = this.o.hooks.frame();
    while (this.nextHash <= this.confirmed + 1 && this.nextHash <= frame) {
      const h = this.nextHash;
      this.nextHash += HASH_EVERY;
      const state = h === frame ? undefined : this.saves.get(h);
      if (h !== frame && state === undefined) continue;
      const hash = this.o.hooks.hash(state);
      this.ownHash.set(h, hash);
      if (this.linkUp && !this.partnerAbsent) this.o.send({ t: 'hash', f: h, h: hash });
      this.compare(h);
    }
    const keepSaves = Math.min(this.confirmed, this.nextHash);
    for (const f of this.saves.keys()) if (f < keepSaves) this.saves.delete(f);
    for (const f of this.predicted.keys()) if (f <= this.confirmed) this.predicted.delete(f);
    const old = this.confirmed - KEEP_FRAMES;
    for (const m of this.inputs) for (const f of m.keys()) if (f < old) m.delete(f);
    for (const m of [this.ownHash, this.peerHash])
      for (const f of m.keys()) if (f < old) m.delete(f);
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
    if (this.authority) this.sendSnapshot();
    else {
      this.lastSnapFrame = f;
      this.o.send({ t: 'resync', f });
    }
  }

  /** The authority's world at its first unconfirmed frame (all earlier inputs are final). */
  private confirmedState(): { frame: number; state: S | undefined } {
    const frame = this.o.hooks.frame();
    const f = Math.min(this.confirmed + 1, frame);
    return { frame: f, state: f === frame ? undefined : this.saves.get(f) };
  }

  private sendSnapshot(): void {
    const { frame, state } = this.confirmedState();
    if (frame !== this.o.hooks.frame() && state === undefined) return;
    this.lastSnapFrame = frame;
    this.stats.resyncs += 1;
    this.record('snapshot', this.slot, frame);
    this.o.send({ t: 'snap', s: this.o.hooks.snapshot(state) });
  }

  /** A validated authoritative snapshot replaces this world from its frame on. */
  private takeSnapshot(s: WorldSnapshot): void {
    if (s.frame < this.floor) return; // older than a snapshot already taken
    const state = this.o.hooks.restore(s);
    const frame = this.o.hooks.frame();
    if (s.frame < frame) {
      // Re-simulate from the snapshot frame up to where this world is.
      this.saves.set(s.frame, state);
      this.rollbackFrom = s.frame;
    } else {
      this.o.hooks.load(state);
      this.saves.clear();
      this.rollbackFrom = null;
    }
    for (const f of [...this.predicted.keys()]) if (f < s.frame) this.predicted.delete(f);
    this.floor = s.frame;
    if (this.confirmed < s.frame - 1) this.confirmed = s.frame - 1;
    if (this.nextHash <= s.frame)
      this.nextHash = Math.ceil((s.frame + 1) / HASH_EVERY) * HASH_EVERY;
    this.ownHash.clear();
    this.lastSnapFrame = s.frame;
    this.stats.resyncs += 1;
    this.generation += 1;
    this.record('snapshot', this.other, s.frame);
    if (this.nextLocal < s.frame) this.nextLocal = s.frame;
  }

  // --- missing players, authority and the way back -------------------------------------

  /** The authority marks its partner missing from the frame after the last confirmed one. */
  private declareAbsent(kind: 'absent' | 'promoted', now: number): void {
    const p = this.other;
    if (this.partnerAbsent) return;
    const from = Math.max(this.floor, this.confirmed + 1);
    this.absences[p].push({ from, to: Infinity, handover: Infinity });
    for (const f of [...this.inputs[p].keys()]) if (f >= from) this.inputs[p].delete(f);
    for (const f of [...this.predicted.keys()]) if (f >= from) this.predicted.delete(f);
    this.rollbackTo(from);
    this.ready[p] = true;
    this.pendingBack = null;
    this.record(kind === 'promoted' ? 'promoted' : 'absent', p, from);
    this.o.send({ t: kind, from });
    this.updateConfirmed();
    // A hold waits only for players who are here.
    if (this.phase === 'hold') this.maybeGo(now);
  }

  /** This game takes authority over (its authority is gone). */
  promote(now: number): void {
    if (this.authority || this.phase === 'ended') return;
    this.authority = true;
    this.rejoining = false;
    // A game that was out itself comes back in on the frame it takes over from.
    const mine = this.absences[this.slot];
    const last = mine[mine.length - 1];
    if (last && last.to === Infinity) {
      const from = Math.max(
        last.from,
        this.floor,
        Math.min(this.confirmed + 1, this.o.hooks.frame()),
      );
      last.to = from;
      for (const f of [...this.inputs[this.slot].keys()])
        if (f >= from) this.inputs[this.slot].delete(f);
      this.nextLocal = from;
      this.confirmed = Math.min(this.confirmed, from - 1);
      this.phase = 'countdown';
      this.countdownEnd = now + COUNTDOWN_MS;
      this.hold = null;
    }
    this.declareAbsent('promoted', now);
  }

  /** This game was put out of the game by the authority (from frame `from`). */
  private demote(from: number, now: number): void {
    const wasAuthority = this.authority;
    this.authority = false;
    this.pendingBack = null;
    // A former authority forgets its own view of who was missing.
    if (wasAuthority) {
      const theirs = this.absences[this.other];
      const last = theirs[theirs.length - 1];
      if (last && last.to === Infinity) theirs.pop();
    }
    const mine = this.absences[this.slot];
    const last = mine[mine.length - 1];
    if (!last || last.to !== Infinity)
      mine.push({ from: Math.max(0, from), to: Infinity, handover: Infinity });
    this.record('demoted', this.slot, from);
    const awayHere =
      this.hold?.kind === 'focus' && this.hold.by === this.slot && !this.ready[this.slot];
    this.phase = 'away';
    this.hold = awayHere ? this.hold : null;
    // A player who is here asks to come back at once; one who left confirms first.
    if (!awayHere) this.askToRejoin(now);
  }

  private askToRejoin(now: number): void {
    void now;
    this.rejoining = true;
    this.record('rejoin', this.slot);
    const mine = this.absences[this.slot];
    const last = mine[mine.length - 1];
    this.o.send(last ? { t: 'rejoin', from: last.from } : { t: 'rejoin' });
  }

  /**
   * The partner asks to come back (a `rejoin` message, or their game reconnected to this
   * computer's room). The authority hands back at the next safe moment; a game without
   * authority asks the partner instead.
   */
  partnerReturning(now: number, from?: number): void {
    if (this.phase === 'ended') return;
    if (!this.authority) {
      if (this.phase === 'away' || this.rejoining) this.askToRejoin(now);
      return;
    }
    if (!this.partnerAbsent) {
      // A request about an absence that was already handed back is stale (it crossed
      // the hand-back on the wire): the partner is in the game.
      const theirs = this.absences[this.other];
      const last = theirs[theirs.length - 1];
      if (from !== undefined && last && last.from >= from) return;
      this.declareAbsent('absent', now);
    }
    if (this.pendingBack === null) this.pendingBack = now;
  }

  private maybeHandBack(now: number): void {
    if (this.pendingBack === null || !this.authority || !this.partnerAbsent) return;
    if (this.phase !== 'run' && this.phase !== 'countdown') return;
    const p = this.other;
    if (!this.o.hooks.actionable(p) && now - this.pendingBack < RETURN_WAIT_MS) return;
    this.pendingBack = null;
    const s = this.o.hooks.frame();
    const a = this.absences[p][this.absences[p].length - 1]!;
    const control = s + RETURN_LEAD + this.delay;
    a.to = control;
    a.handover = s;
    this.confirmed = Math.min(this.confirmed, control - 1);
    const own: [number, WireInput][] = [];
    for (const [f, i] of this.inputs[this.slot]) if (f >= s) own.push([f, toWire(i)]);
    const back: BackInfo = {
      snap: this.o.hooks.snapshot(),
      slot: p,
      absentFrom: a.from,
      control,
      inputs: own,
      start: this.o.start,
      compat: this.o.compat,
    };
    this.record('back', p, s);
    this.o.send({ t: 'back', back });
    this.updateConfirmed();
  }

  /** The authority's hand-back: this game rejoins from the snapshot. */
  private takeBack(b: BackInfo, now: number): void {
    const why = checkCompat(b.compat, this.o.compat);
    if (why) {
      this.end('desync', now);
      return;
    }
    let state: S;
    try {
      state = this.o.hooks.restore(b.snap);
    } catch {
      this.end('desync', now);
      return;
    }
    this.o.hooks.load(state);
    if (this.authority) this.record('demoted', this.slot, b.snap.frame);
    this.authority = false;
    this.rejoining = false;
    this.saves.clear();
    this.predicted.clear();
    this.rollbackFrom = null;
    this.ownHash.clear();
    this.peerHash.clear();
    const s = b.snap.frame;
    for (const m of this.inputs) m.clear();
    this.absences[0] = [];
    this.absences[1] = [];
    this.absences[b.slot as 0 | 1].push({ from: b.absentFrom, to: b.control, handover: s });
    for (const [f, w] of b.inputs) this.inputs[this.other].set(f, fromWire(w));
    this.nextLocal = b.control;
    this.confirmed = s - 1;
    this.floor = s;
    this.remoteFrame = Math.max(s - 1, ...b.inputs.map((x) => x[0]));
    this.nextHash = Math.ceil((s + 1) / HASH_EVERY) * HASH_EVERY;
    this.lastSnapFrame = s;
    this.generation += 1;
    this.stats.resyncs += 1;
    this.phase = 'run';
    this.hold = null;
    this.ready = [false, false];
    this.lastStep = now;
    this.record('returned', this.slot, s);
    this.updateConfirmed();
  }

  // --- the link ------------------------------------------------------------------------

  /** The connection to the partner closed (the game may reconnect). */
  linkLost(now: number): void {
    if (this.phase === 'ended') return;
    if (this.linkUp) this.record('link-down', this.other);
    this.linkUp = false;
    if (this.authority) this.declareAbsent('absent', now);
    else this.lastHeard = Math.min(this.lastHeard, now);
  }

  /** The partner closed their game (the room server said so). */
  partnerLeft(now: number): void {
    if (this.phase === 'ended') return;
    if (this.linkUp) this.record('link-down', this.other);
    this.linkUp = false;
    if (this.authority) this.declareAbsent('absent', now);
    else this.promote(now);
  }

  /** A new connection to the partner is up (messages flow again). */
  linkRestored(now: number): void {
    this.lastHeard = now;
    if (!this.linkUp) this.record('link-up', this.other);
    this.linkUp = true;
  }

  // --- holds, pause and the end --------------------------------------------------------

  /** This player left the window (focus) or asked for a pause. */
  requestHold(kind: HoldKind, now: number): void {
    if (this.phase === 'ended' || this.phase === 'away') return;
    this.startHold(kind, this.slot, now);
    this.o.send({ t: 'hold', kind });
  }

  private startHold(kind: HoldKind, by: number, now: number): void {
    if (this.phase === 'hold' && this.hold) {
      // A second request while holding: that player has to confirm again.
      this.ready[by] = false;
      if (kind === 'pause' && this.hold.kind === 'focus') this.hold = { kind, by, since: now };
      else if (kind === 'focus') this.hold = { kind, by, since: now };
      return;
    }
    this.phase = 'hold';
    this.hold = { kind, by, since: now };
    // After a focus loss the player who stayed is ready; a pause needs both to confirm.
    this.ready = [false, false];
    if (kind === 'focus') this.ready[by === 0 ? 1 : 0] = true;
    if (this.partnerAbsent) this.ready[this.other] = true;
  }

  /** This player is ready to continue (Resume, back after leaving, or Rejoin). */
  confirmReady(now: number): void {
    if (this.phase === 'away') {
      this.ready[this.slot] = true;
      if (this.hold?.by === this.slot) this.hold = null;
      if (!this.rejoining) this.askToRejoin(now);
      return;
    }
    if (this.phase !== 'hold') return;
    this.ready[this.slot] = true;
    if (!this.partnerAbsent) this.o.send({ t: 'ready' });
    this.maybeGo(now);
  }

  private maybeGo(now: number): void {
    if (!this.authority || this.phase !== 'hold' || !this.ready[0] || !this.ready[1]) return;
    if (!this.partnerAbsent) this.o.send({ t: 'go', ms: COUNTDOWN_MS });
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
    this.record('end', by);
  }

  /** Seconds until the missing player's hero is taken over (null outside a focus hold). */
  graceLeft(now: number): number | null {
    if (this.phase !== 'hold' || this.hold?.kind !== 'focus') return null;
    return Math.max(0, Math.ceil((this.courtesy - (now - this.hold.since)) / 1000));
  }

  /** Seconds left of the countdown (null outside it). */
  countdownLeft(now: number): number | null {
    return this.phase === 'countdown'
      ? Math.max(0, Math.ceil((this.countdownEnd - now) / 1000))
      : null;
  }

  /** Seconds until this game takes authority over (null unless the authority is silent). */
  takeoverLeft(now: number): number | null {
    if (this.authority || this.phase === 'ended') return null;
    const silent = now - this.lastHeard;
    if (silent < ABSENT_MS && this.linkUp) return null;
    return Math.max(0, Math.ceil((MIGRATE_MS - silent) / 1000));
  }

  /** Timers: heartbeat, countdown, courtesy expiry, silence, delay. Call often (also hidden). */
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
    // The courtesy hold expired and the player who left is not back: recovery begins.
    if (
      this.phase === 'hold' &&
      this.hold?.kind === 'focus' &&
      this.hold.by === this.other &&
      !this.ready[this.other] &&
      now - this.hold.since >= this.courtesy
    ) {
      if (this.authority) this.declareAbsent('absent', now);
      else this.promote(now);
    }
    const silent = now - this.lastHeard;
    if (this.linkUp && silent > ABSENT_MS) {
      this.linkUp = false;
      this.record('link-down', this.other);
    }
    if (this.authority && silent > ABSENT_MS && !this.partnerAbsent)
      this.declareAbsent('absent', now);
    if (!this.authority && silent > MIGRATE_MS) this.promote(now);
    // Quality monitoring: frequent waits for the partner raise the local input delay by
    // one frame (within MAX_DELAY), so rollbacks stay inside the window.
    if (now - this.lastDelayReview >= DELAY_REVIEW_MS) {
      this.lastDelayReview = now;
      const waited = this.reviewFrames > 0 ? this.reviewStalls / this.reviewFrames : 0;
      if (
        waited >= STALL_SHARE_TO_RAISE &&
        this.delay < MAX_DELAY &&
        this.linkUp &&
        !this.partnerAbsent
      ) {
        this.delay += 1;
        this.record('delay', this.slot);
      }
      this.reviewFrames = 0;
      this.reviewStalls = 0;
    }
  }

  /** A message from the partner. */
  receive(msg: NetMessage, now: number): void {
    if (msg.t !== 'sys') {
      this.lastHeard = now;
      if (!this.linkUp) {
        this.linkUp = true;
        this.record('link-up', this.other);
      }
    }
    if (this.phase === 'ended') return;
    const other = this.other;
    switch (msg.t) {
      case 'in': {
        const f = msg.f;
        if (this.absenceAt(other, f)) {
          // A partner the authority put out keeps playing: tell them again (they rejoin).
          if (this.authority && this.partnerAbsent && now - this.lastAbsentNotice > 500) {
            this.lastAbsentNotice = now;
            const theirs = this.absences[other];
            this.o.send({ t: 'absent', from: theirs[theirs.length - 1]!.from });
          }
          break;
        }
        if (f < this.floor || this.inputs[other].has(f)) break;
        const input = fromWire(msg.i);
        this.inputs[other].set(f, input);
        if (f > this.remoteFrame) this.remoteFrame = f;
        const p = this.predicted.get(f);
        if (p) {
          this.predicted.delete(f);
          if (!sameInput(p, input)) this.rollbackTo(f);
        }
        this.updateConfirmed();
        break;
      }
      case 'hash':
        this.peerHash.set(msg.f, msg.h);
        this.compare(msg.f);
        break;
      case 'resync':
        if (this.authority && msg.f > this.lastSnapFrame) this.sendSnapshot();
        break;
      case 'snap':
        if (this.authority || this.phase === 'away') break;
        try {
          this.takeSnapshot(msg.s);
        } catch {
          // A snapshot that cannot be validated: end safely instead of guessing.
          this.end('desync', now);
        }
        break;
      case 'hold':
        if (this.phase === 'away') break;
        this.startHold(msg.kind, other, now);
        break;
      case 'ready':
        if (this.phase === 'hold') {
          this.ready[other] = true;
          this.maybeGo(now);
        }
        break;
      case 'go':
        // Only a game that confirmed counts down (a newer hold of its own cancels the go).
        if (!this.authority && this.phase === 'hold' && this.ready[this.slot]) {
          this.phase = 'countdown';
          this.countdownEnd = now + msg.ms;
        }
        break;
      case 'absent':
      case 'promoted': {
        // Both games took over (each lost the other): the room's owner keeps authority
        // and repeats its claim; otherwise this game is out and comes back.
        const theirs = this.absences[other];
        const claim = theirs[theirs.length - 1];
        if (this.authority && this.owner && this.partnerAbsent && claim) {
          this.o.send({ t: 'absent', from: claim.from });
          break;
        }
        // A repeated notice about an absence this game already came back from is stale.
        if (!this.authority && this.absences[this.slot].some((a) => a.from >= msg.from)) break;
        this.demote(msg.from, now);
        break;
      }
      case 'rejoin':
        this.partnerReturning(now, msg.from);
        break;
      case 'back':
        this.takeBack(msg.back, now);
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
        if (msg.ev === 'peer-left') this.partnerLeft(now);
        break;
      default:
        break;
    }
  }
}

function sameInput(a: FrameInput, b: FrameInput): boolean {
  return (
    a.moveX === b.moveX &&
    a.moveZ === b.moveZ &&
    a.pressed === b.pressed &&
    a.held === b.held &&
    a.dirPressed === b.dirPressed
  );
}
