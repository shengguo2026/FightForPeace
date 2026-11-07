import { signal } from '@preact/signals';
import {
  type Compat,
  type EndReason,
  type HoldKind,
  type LobbyState,
  NET_PROTOCOL,
  type NetLogEntry,
  type NetMessage,
  type NetPhase,
  type RejectReason,
  RollbackSession,
  type RoomError,
  type StartInfo,
  type Transport,
  type WebSocketTransport,
  checkCompat,
  chooseDelay,
  connectRoom,
  contentHash,
  loadoutChanges,
  roomUrl,
} from '@ffp/platform';
import {
  type FacingMode,
  type LoadoutChange,
  PROXY_GRACE_FRAMES,
  type World,
  cheatRegistryHash,
  heroOf,
  rulesHash,
} from '@ffp/sim';
import type { NetDriver } from '../game';
import type { Shell } from '../shell/shell';

export const ROOM_API = '/__ffp/room';
export const DEFAULT_ROOM_PORT = 7350;
const HEROES = ['mountain', 'river'] as const;
/** A game connected to its partner's room tries again this often after losing it. */
const RECONNECT_MS = 2000;

export type NetStatus = 'idle' | 'opening' | 'hosting' | 'joining' | 'lobby' | 'playing' | 'ended';
/** What went wrong before play (each has its own explanation). */
export type NetError = RoomError | RejectReason | 'noHost' | 'hostLeft' | 'guestLeft';

interface RoomInfo {
  code: string;
  port: number;
  addresses: string[];
}

/** What the in-game overlay shows (refreshed once per render frame). */
export interface NetView {
  phase: NetPhase;
  hold: { kind: HoldKind; by: number } | null;
  ready: [boolean, boolean];
  countdown: number | null;
  /** Seconds until the player who left is replaced by the recovery (focus holds). */
  grace: number | null;
  waiting: boolean;
  rtt: number;
  delay: number;
  stalls: number;
  resyncs: number;
  matched: number;
  rollbacks: number;
  maxRollback: number;
  ended: EndReason | null;
  endedBy: number;
  /** M15: this computer holds authority (it decides who is in the game). */
  authority: boolean;
  /** The partner is missing: 'grace' (guarded neutral) or 'proxy' (survival proxy). */
  partner: 'here' | 'grace' | 'proxy';
  /** Seconds until this computer takes over from a silent authority (null otherwise). */
  takeover: number | null;
  /** The connection to the partner is down (silent or closed). */
  linkDown: boolean;
  /** This computer's player is coming back (asked, waiting for the hand-back). */
  rejoining: boolean;
  /** The room the partner can rejoin through after this computer took over. */
  standby: RoomInfo | null;
}

const now = () => performance.now();

/**
 * Local-Wi-Fi co-op on the game side. M12: hosting a room through the game's own server,
 * joining one, the network lobby (shared stage rules on the host, each player's own hero
 * and readiness). M15: the RollbackSession that drives GameSession (prediction and bounded
 * rollback), and the recovery around it: reconnecting to the partner's room with the
 * guest token, a standby room when this computer takes authority over, answering a
 * returning player's hello with a hand-back, and saving each player's results once on
 * their own computer.
 */
export class NetPlay {
  readonly status = signal<NetStatus>('idle');
  /** Who opened the lobby room (the lobby's labels); authority can move in play. */
  readonly role = signal<'host' | 'guest'>('host');
  /** This computer's player slot in the world. */
  readonly slot = signal<0 | 1>(0);
  readonly room = signal<RoomInfo | null>(null);
  readonly error = signal<NetError | null>(null);
  readonly lobby = signal<LobbyState | null>(null);
  readonly view = signal<NetView | null>(null);
  /** Last measured round trip (lobby pings), ms. */
  readonly rtt = signal(0);
  /** The quickest lobby round trip (the network itself, without a busy moment), ms. */
  private rttBest = Infinity;
  /** Test hook (dev builds): pretend to be another game version. */
  versionOverride: string | null = null;
  lock: RollbackSession<World> | null = null;
  private transport: Transport | null = null;
  /** Where this game reconnects when its link to the partner's room breaks. */
  private rejoinTo: { address: string; port: number; code: string; token: string | null } | null =
    null;
  private reconnecting = false;
  private lastAttempt = 0;
  /** M15: the room this computer opened after taking authority over (and its link). */
  private standby: { info: RoomInfo; transport: Transport } | null = null;
  private standbyOpening = false;
  private start: StartInfo | null = null;
  private guestHello: { loadouts: Record<string, LoadoutChange[]>; facing: FacingMode } | null =
    null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pingN = 0;
  private viewKey = '';
  private generation = 0;
  private readonly onHide = () => {
    if (document.hidden) this.loseFocus();
  };
  private readonly onBlur = () => this.loseFocus();

  constructor(private readonly shell: Shell) {}

  compat(): Compat {
    return {
      game: this.versionOverride ?? this.shell.gameVersion,
      protocol: NET_PROTOCOL,
      rules: rulesHash(),
      content: contentHash(),
      cheats: cheatRegistryHash(),
    };
  }

  /** A Wi-Fi game is being played (or just ended) on this computer. */
  get active(): boolean {
    return this.status.value === 'playing' || this.status.value === 'ended';
  }

  /** This computer's player in the world. */
  get localSlot(): number {
    return this.slot.value;
  }

  /** The in-game network panel takes menu input (hold, pause, countdown, away, the end). */
  get menuOpen(): boolean {
    const v = this.view.value;
    return this.active && v !== null && v.phase !== 'run';
  }

  /** The input delay the session started with. */
  get startDelay(): number {
    return this.start?.delay ?? 0;
  }

  /** The session log (disconnects, proxy control, migration, snapshots, rejoins, credit). */
  get log(): readonly NetLogEntry[] {
    return this.lock?.log ?? [];
  }

  // --- hosting and joining -------------------------------------------------------------

  /** Opens a room on this computer's own server; resolves with its info and host link. */
  private async openRoom(): Promise<{ info: RoomInfo; transport: WebSocketTransport }> {
    let info: RoomInfo & { token: string };
    try {
      const res = await fetch(ROOM_API, { method: 'POST' });
      if (!res.ok) throw new Error('api');
      info = (await res.json()) as typeof info;
    } catch {
      throw new Error('api' satisfies RoomError);
    }
    const transport = await connectRoom(
      roomUrl('127.0.0.1', info.port, { role: 'host', token: info.token }),
      'hosting',
    );
    return {
      info: { code: info.code, port: info.port, addresses: info.addresses ?? [] },
      transport,
    };
  }

  async host(): Promise<void> {
    this.reset();
    this.role.value = 'host';
    this.slot.value = 0;
    this.status.value = 'opening';
    try {
      const { info, transport } = await this.openRoom();
      this.attach(transport);
      this.room.value = info;
    } catch (err) {
      this.fail((err as Error).message as RoomError);
      return;
    }
    this.lobby.value = {
      stage: 'stage1',
      difficulty: this.shell.stagePick.value.difficulty,
      players: [{ name: this.myName(), hero: this.preferredHero(), ready: false }],
    };
    this.status.value = 'hosting';
  }

  async join(address: string, port: number, code: string): Promise<void> {
    this.reset();
    this.role.value = 'guest';
    this.slot.value = 1;
    this.status.value = 'joining';
    const target = { address: address.trim(), port, code: code.trim() };
    try {
      const t = await connectRoom(
        roomUrl(target.address, port, { role: 'guest', code: target.code }),
        'joined',
      );
      this.rejoinTo = { ...target, token: t.token };
      this.attach(t);
    } catch (err) {
      this.fail((err as Error).message as RoomError);
      return;
    }
    this.sendHello();
    // The host answers at once; silence means something other than this game answered.
    setTimeout(() => {
      if (this.status.value === 'joining' && this.role.value === 'guest') this.fail('noHost');
    }, 6000);
  }

  private sendHello(session?: string): void {
    const loadouts: Record<string, LoadoutChange[]> = {};
    for (const h of HEROES) loadouts[h] = loadoutChanges(this.shell.active.value, h);
    this.send({
      t: 'hello',
      compat: this.compat(),
      name: this.myName(),
      loadouts,
      facing: this.myFacing(),
      ...(session ? { session } : {}),
    });
  }

  /** Leaves the room or the lobby (the partner is told) and closes this computer's rooms. */
  leave(reason: EndReason = 'left'): void {
    if (this.lock && this.lock.phase !== 'ended') this.lock.end(reason, now());
    else if (this.transport?.open && this.status.value !== 'idle') this.send({ t: 'bye', reason });
    this.teardown();
    this.closeRoom();
    this.closeStandby();
    this.status.value = 'idle';
    this.lobby.value = null;
    this.room.value = null;
    this.view.value = null;
  }

  private closeRoom(): void {
    const code = this.room.value?.code;
    if (this.role.value === 'host' && code)
      void fetch(`${ROOM_API}?code=${code}`, { method: 'DELETE' }).catch(() => {});
  }

  private closeStandby(): void {
    const s = this.standby;
    this.standby = null;
    if (!s) return;
    if (s.transport !== this.transport) {
      s.transport.onMessage = null;
      s.transport.onClose = null;
      s.transport.close();
    }
    void fetch(`${ROOM_API}?code=${s.info.code}`, { method: 'DELETE' }).catch(() => {});
  }

  private reset(): void {
    if (this.status.value !== 'idle') this.leave();
    this.error.value = null;
    this.rttBest = Infinity;
  }

  private fail(e: NetError): void {
    this.teardown();
    this.error.value = e;
    this.status.value = 'idle';
    this.lobby.value = null;
    if (this.role.value === 'host') {
      this.closeRoom();
      this.room.value = null;
    }
  }

  private teardown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.dropTransport();
    this.lock = null;
    this.start = null;
    this.guestHello = null;
    this.rejoinTo = null;
    this.reconnecting = false;
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('blur', this.onBlur);
    const s = this.shell.session;
    s.net = null;
    s.devices.joinLocked = false;
  }

  private dropTransport(): void {
    const t = this.transport;
    this.transport = null;
    if (t) {
      t.onMessage = null;
      t.onClose = null;
      t.close();
    }
  }

  private attach(t: Transport): void {
    if (this.transport && this.transport !== t) this.dropTransport();
    this.transport = t;
    t.onMessage = (m) => this.onMessage(m);
    t.onClose = () => this.onClosed(t);
    // Heartbeat and timers (also while the tab is hidden): measures the round trip in the
    // lobby, drives the session's timers and the reconnects in play.
    this.timer ??= setInterval(() => this.tick(), 250);
  }

  private tick(): void {
    const lock = this.lock;
    if (lock) {
      lock.tick(now());
      this.recover();
      this.refreshView();
    } else if (this.status.value === 'lobby') this.send({ t: 'ping', n: ++this.pingN, at: now() });
  }

  private send(m: NetMessage): void {
    this.transport?.send(m);
  }

  private myName(): string {
    return this.shell.active.value?.name ?? 'Player';
  }

  private myFacing(): FacingMode {
    return this.shell.active.value?.settings.facing ?? 'manual';
  }

  private preferredHero(): string {
    const last = this.shell.active.value?.lastHeroes[0];
    return HEROES.includes(last as (typeof HEROES)[number]) ? last! : 'mountain';
  }

  // --- the lobby -----------------------------------------------------------------------

  /** Own hero (null: none picked). A hero the partner holds cannot be taken. */
  pickHero(hero: string): void {
    const l = this.lobby.value;
    if (!l) return;
    const me = this.localSlot;
    const other = l.players[1 - me];
    if (other?.hero === hero) return;
    if (this.role.value === 'host') {
      this.setLobby(l, (n) => (n.players[0] = { ...n.players[0]!, hero, ready: false }));
    } else {
      this.send({ t: 'pick', hero, ready: false });
      this.lobby.value = {
        ...l,
        players: l.players.map((p, i) => (i === me ? { ...p, hero, ready: false } : p)),
      };
    }
  }

  setReady(ready: boolean): void {
    const l = this.lobby.value;
    if (!l) return;
    const me = this.localSlot;
    const p = l.players[me];
    if (!p?.hero) return;
    if (this.role.value === 'host')
      this.setLobby(l, (n) => (n.players[0] = { ...n.players[0]!, ready }));
    else {
      this.send({ t: 'pick', hero: p.hero, ready });
      this.lobby.value = {
        ...l,
        players: l.players.map((x, i) => (i === me ? { ...x, ready } : x)),
      };
    }
  }

  /** Host only: a shared rule; every player's readiness is cleared (Module 16). */
  setDifficulty(difficulty: string): void {
    const l = this.lobby.value;
    if (!l || this.role.value !== 'host') return;
    this.shell.stagePick.value = { ...this.shell.stagePick.value, difficulty };
    this.setLobby(l, (n) => {
      n.difficulty = difficulty;
      n.players = n.players.map((p) => ({ ...p, ready: false }));
    });
  }

  private setLobby(l: LobbyState, change: (n: LobbyState) => void): void {
    const next = structuredClone(l);
    change(next);
    this.lobby.value = next;
    if (next.players.length > 1) this.send({ t: 'lobby', lobby: next });
    if (next.players.length === 2 && next.players.every((p) => p.ready && p.hero)) this.begin(next);
  }

  private onMessage(m: NetMessage): void {
    if (m.t === 'hello' && this.lock) {
      this.helloInPlay(m);
      return;
    }
    if (m.t === 'back' && !this.lock) {
      this.rejoinFresh(m.back.start, m.back.slot as 0 | 1, m);
      return;
    }
    if (this.lock) {
      this.lock.receive(m, now());
      return;
    }
    const host = this.role.value === 'host';
    switch (m.t) {
      case 'hello': {
        if (!host) return;
        const l = this.lobby.value;
        if (!l || l.players.length > 1) {
          this.send({ t: 'reject', reason: 'busy' });
          return;
        }
        const why = checkCompat(this.compat(), m.compat);
        if (why) {
          this.send({ t: 'reject', reason: why });
          return;
        }
        this.guestHello = { loadouts: m.loadouts, facing: m.facing };
        const free = HEROES.find((h) => h !== l.players[0]?.hero) ?? 'river';
        const next: LobbyState = {
          ...l,
          players: [
            { ...l.players[0]!, ready: false },
            { name: m.name.slice(0, 24), hero: free, ready: false },
          ],
        };
        this.lobby.value = next;
        this.send({ t: 'welcome', lobby: next });
        this.status.value = 'lobby';
        return;
      }
      case 'pick': {
        const l = this.lobby.value;
        if (!host || !l || l.players.length < 2) return;
        const hero = m.hero && m.hero !== l.players[0]?.hero ? m.hero : l.players[1]!.hero;
        this.setLobby(
          l,
          (n) => (n.players[1] = { ...n.players[1]!, hero, ready: m.ready && !!hero }),
        );
        return;
      }
      case 'welcome':
      case 'lobby':
        if (host) return;
        this.lobby.value = m.lobby;
        this.shell.stagePick.value = { stage: m.lobby.stage, difficulty: m.lobby.difficulty };
        this.status.value = 'lobby';
        return;
      case 'reject':
        if (!host) this.fail(m.reason);
        return;
      case 'start':
        if (!host) this.startGame(m.start);
        return;
      case 'ping':
        this.send({ t: 'pong', n: m.n, at: m.at });
        return;
      case 'pong': {
        const rtt = Math.max(0, now() - m.at);
        this.rttBest = Math.min(this.rttBest, rtt);
        this.rtt.value =
          this.rtt.value === 0 ? Math.round(rtt) : Math.round(this.rtt.value * 0.7 + rtt * 0.3);
        return;
      }
      case 'bye':
        this.partnerLeft();
        return;
      case 'sys':
        if (m.ev === 'peer-left') this.partnerLeft();
        return;
      default:
        return;
    }
  }

  private partnerLeft(): void {
    if (this.role.value === 'guest') {
      this.fail('hostLeft');
      return;
    }
    // The host keeps the room open for another guest.
    const l = this.lobby.value;
    if (l) this.lobby.value = { ...l, players: [{ ...l.players[0]!, ready: false }] };
    this.guestHello = null;
    this.error.value = 'guestLeft';
    this.status.value = 'hosting';
  }

  private onClosed(t: Transport): void {
    if (t !== this.transport) return;
    if (this.lock) {
      this.lock.linkLost(now());
      this.transport = null;
      return;
    }
    if (this.status.value !== 'idle') this.fail(this.role.value === 'host' ? 'closed' : 'hostLeft');
  }

  /** Host: both players are ready; send the start and begin. */
  private begin(l: LobbyState): void {
    const heroes = l.players.map((p) => p.hero!);
    const start: StartInfo = {
      seed: 1,
      stage: l.stage,
      difficulty: l.difficulty,
      heroes,
      loadouts: [
        loadoutChanges(this.shell.active.value, heroes[0]!),
        this.guestHello?.loadouts[heroes[1]!] ?? [],
      ],
      facing: [this.myFacing(), this.guestHello?.facing ?? 'manual'],
      delay: chooseDelay(Number.isFinite(this.rttBest) ? this.rttBest : this.rtt.value),
      session: Math.random().toString(36).slice(2, 10),
    };
    this.send({ t: 'start', start });
    this.startGame(start);
  }

  // --- the game ------------------------------------------------------------------------

  private startGame(start: StartInfo, authority = this.localSlot === 0): void {
    const slot = this.localSlot as 0 | 1;
    const session = this.shell.session;
    this.start = start;
    this.viewKey = '';
    this.shell.startNetStage(start);
    const hooks = session.netHooks();
    const lock = new RollbackSession<World>({
      slot,
      authority,
      delay: start.delay,
      now: now(),
      start,
      compat: this.compat(),
      send: (m) => this.send(m),
      ...(this.courtesyMs !== null ? { courtesyMs: this.courtesyMs } : {}),
      hooks: { ...hooks, hash: (w) => (hooks.hash(w) + this.hashTamper) >>> 0 },
    });
    // The room this link runs through belongs to the computer that opened it.
    lock.owner = this.role.value === 'host';
    this.lock = lock;
    this.generation = lock.generation;
    session.net = this.driver(lock);
    this.status.value = 'playing';
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('blur', this.onBlur);
  }

  /**
   * M15: a hello while playing is a player coming back (their game reconnected to this
   * computer's room, or a fresh copy joined with the code). It must match this game
   * exactly; then the authority hands the hero back at the next safe moment.
   */
  private helloInPlay(m: Extract<NetMessage, { t: 'hello' }>): void {
    const lock = this.lock!;
    const why = checkCompat(this.compat(), m.compat);
    if (why) {
      this.send({ t: 'reject', reason: why });
      return;
    }
    const known = m.session !== undefined && m.session === this.start?.session;
    if (!known && !lock.partnerAbsent && lock.linkUp) {
      this.send({ t: 'reject', reason: 'busy' });
      return;
    }
    lock.linkRestored(now());
    lock.partnerReturning(now());
  }

  /** A fresh copy of the game (a reopened page) rejoins a running session. */
  private rejoinFresh(start: StartInfo, slot: 0 | 1, back: NetMessage): void {
    this.slot.value = slot;
    this.startGame(start, false);
    this.lock!.owner = false;
    this.lock!.receive(back, now());
  }

  /** Test hook: a different hash makes this game look desynchronised. */
  hashTamper = 0;
  /** Test hook: the courtesy hold of the next session (ms; null: the default). */
  courtesyMs: number | null = null;

  /** Test hook: this computer's world goes wrong for good (saves included). */
  corrupt(): void {
    const hurt = (w: World) => {
      const h = heroOf(w, 0);
      if (h) h.health = Math.max(1, h.health - 13);
    };
    hurt(this.shell.session.world);
    this.lock?.tamperSaves(hurt);
  }

  /** Test hook: no message gets through either way for `ms` (a pulled cable). */
  cutFor(ms: number): void {
    const t = this.transport;
    if (!t) return;
    const send = t.send.bind(t);
    const receive = t.onMessage;
    t.send = () => {};
    t.onMessage = () => {};
    setTimeout(() => {
      t.send = send;
      if (this.transport === t) t.onMessage = receive;
    }, ms);
  }

  // --- recovery ------------------------------------------------------------------------

  /** Timers (also while hidden): reconnect to the partner's room, open the standby room. */
  private recover(): void {
    const lock = this.lock;
    if (!lock || lock.phase === 'ended') return;
    const t = now();
    // A game connected to the partner's room reconnects when the link is down.
    if (
      this.rejoinTo &&
      !lock.linkUp &&
      !this.reconnecting &&
      t - this.lastAttempt >= RECONNECT_MS
    ) {
      this.lastAttempt = t;
      void this.reconnect();
    }
    // A game that took authority over opens a room the other player can rejoin through.
    if (lock.authority && !lock.owner && !this.standby && !this.standbyOpening)
      void this.openStandby();
    // Back under the partner's authority: the standby room is no longer needed.
    if (!lock.authority && this.standby && this.transport !== this.standby.transport)
      this.closeStandby();
  }

  private async reconnect(): Promise<void> {
    const to = this.rejoinTo;
    if (!to) return;
    this.reconnecting = true;
    try {
      const query: Record<string, string> = { role: 'guest', code: to.code };
      if (to.token) query.token = to.token;
      const t = await connectRoom(roomUrl(to.address, to.port, query), 'joined', 3000);
      const lock = this.lock;
      if (!lock || lock.phase === 'ended' || lock.linkUp) {
        t.close();
        return;
      }
      to.token = t.token ?? to.token;
      this.attach(t);
      lock.owner = false;
      lock.linkRestored(now());
      this.sendHello(this.start?.session);
    } catch {
      // Still unreachable; the next tick tries again.
    } finally {
      this.reconnecting = false;
    }
  }

  private async openStandby(): Promise<void> {
    this.standbyOpening = true;
    try {
      const { info, transport } = await this.openRoom();
      if (!this.lock || this.lock.phase === 'ended') {
        transport.close();
        return;
      }
      this.standby = { info, transport };
      transport.onMessage = (m) => {
        // Only a returning player's hello switches the session to this room.
        if (m.t !== 'hello' || !this.lock) return;
        const lock = this.lock;
        if (lock.linkUp && !lock.partnerAbsent) {
          transport.send({ t: 'reject', reason: 'busy' });
          return;
        }
        this.attach(transport);
        lock.owner = true;
        this.rejoinTo = null;
        this.helloInPlay(m);
      };
      transport.onClose = () => {
        if (this.standby?.transport === transport && this.transport !== transport)
          this.standby = null;
      };
    } catch {
      // No room: the other player can still come back through the old room.
    } finally {
      this.standbyOpening = false;
    }
  }

  private loseFocus(): void {
    const lock = this.lock;
    if (!lock || !this.shell.session.devices.pauseOnFocusLoss) return;
    this.shell.session.devices.loseFocus();
    this.shell.session.devices.focusPaused = false;
    if (lock.phase === 'run' || lock.phase === 'countdown') lock.requestHold('focus', now());
    else if (lock.phase === 'hold') lock.requestHold(lock.hold?.kind ?? 'focus', now());
  }

  /** Pause (or the Resume / Rejoin button) during play. */
  pauseOrReady(): void {
    const lock = this.lock;
    if (!lock) return;
    if (lock.phase === 'run') lock.requestHold('pause', now());
    else if (lock.phase === 'hold' || lock.phase === 'away') lock.confirmReady(now());
    this.refreshView();
  }

  requestHold(kind: HoldKind): void {
    this.lock?.requestHold(kind, now());
  }

  /** End session (pause menu, or the partner is gone): back to the village. */
  endSession(): void {
    this.shell.returnToVillage();
  }

  /** The stage results were saved on this computer (once per session). */
  noteCredit(): void {
    this.lock?.noteCredit();
  }

  private driver(lock: RollbackSession<World>): NetDriver {
    const devices = this.shell.session.devices;
    return {
      get localSlot() {
        return lock.slot;
      },
      poll: () => {
        lock.tick(now());
        // The device hub's pause and focus flags become network holds.
        if (devices.userPaused) {
          devices.userPaused = false;
          this.pauseOrReady();
        }
        if (devices.focusPaused) {
          devices.focusPaused = false;
          if (lock.phase === 'run') lock.requestHold('focus', now());
        }
      },
      advance: (steps, sample, before) => {
        const out = lock.advance(steps, sample, now(), before);
        if (lock.generation !== this.generation) {
          this.generation = lock.generation;
          this.shell.session.worldReplaced();
        }
        this.refreshView();
        return out;
      },
    };
  }

  refreshView(): void {
    const lock = this.lock;
    if (!lock) return;
    const t = now();
    const absent = lock.absentFrames(1 - lock.slot);
    const v: NetView = {
      phase: lock.phase,
      hold: lock.hold ? { kind: lock.hold.kind, by: lock.hold.by } : null,
      ready: [...lock.ready],
      countdown: lock.countdownLeft(t),
      grace: lock.graceLeft(t),
      waiting: lock.waitingForPartner,
      rtt: Math.round(lock.stats.rtt),
      delay: lock.delay,
      stalls: lock.stats.stalls,
      resyncs: lock.stats.resyncs,
      matched: lock.stats.matched,
      rollbacks: lock.stats.rollbacks,
      maxRollback: lock.stats.maxRollback,
      ended: lock.ended?.reason ?? null,
      endedBy: lock.ended?.by ?? -1,
      authority: lock.authority,
      partner:
        !lock.partnerAbsent || absent === null
          ? 'here'
          : absent < PROXY_GRACE_FRAMES
            ? 'grace'
            : 'proxy',
      takeover: lock.takeoverLeft(t),
      linkDown: !lock.linkUp,
      rejoining: lock.rejoining,
      standby: lock.authority && this.standby ? this.standby.info : null,
    };
    const key = JSON.stringify(v);
    if (key === this.viewKey) return;
    this.viewKey = key;
    this.view.value = v;
    if (v.phase === 'ended' && this.status.value === 'playing') {
      this.status.value = 'ended';
      // The world stays where it stopped; nothing continuable is saved.
      this.shell.session.held = true;
      this.closeStandby();
    }
  }
}
