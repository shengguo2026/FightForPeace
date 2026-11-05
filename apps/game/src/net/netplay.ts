import { signal } from '@preact/signals';
import {
  type Compat,
  type EndReason,
  type HoldKind,
  type LobbyState,
  Lockstep,
  NET_PROTOCOL,
  type NetMessage,
  type NetPhase,
  type RejectReason,
  type RoomError,
  type StartInfo,
  type Transport,
  checkCompat,
  chooseDelay,
  connectRoom,
  contentHash,
  loadoutChanges,
  roomUrl,
} from '@ffp/platform';
import {
  type FacingMode,
  type FrameInput,
  type LoadoutChange,
  cheatRegistryHash,
  hashWorld,
  restoreWorld,
  rulesHash,
  snapshotWorld,
} from '@ffp/sim';
import type { NetDriver } from '../game';
import type { Shell } from '../shell/shell';

export const ROOM_API = '/__ffp/room';
export const DEFAULT_ROOM_PORT = 7350;
const HEROES = ['mountain', 'river'] as const;

export type NetStatus = 'idle' | 'opening' | 'hosting' | 'joining' | 'lobby' | 'playing' | 'ended';
/** What went wrong before play (each has its own explanation). */
export type NetError = RoomError | RejectReason | 'noHost' | 'hostLeft' | 'guestLeft';

/** What the in-game overlay shows (refreshed once per render frame). */
export interface NetView {
  phase: NetPhase;
  hold: { kind: HoldKind; by: number } | null;
  ready: [boolean, boolean];
  countdown: number | null;
  grace: number | null;
  waiting: boolean;
  rtt: number;
  delay: number;
  stalls: number;
  resyncs: number;
  matched: number;
  ended: EndReason | null;
  endedBy: number;
}

const now = () => performance.now();

/**
 * M12 local-Wi-Fi co-op on the game side: hosting a room through the game's own server,
 * joining one, the network lobby (shared stage rules on the host, each player's own hero
 * and readiness), then the lockstep session that drives GameSession, its holds, pause,
 * countdown and the safe end. Each computer saves only its own player's profile.
 */
export class NetPlay {
  readonly status = signal<NetStatus>('idle');
  readonly role = signal<'host' | 'guest'>('host');
  readonly room = signal<{ code: string; port: number; addresses: string[] } | null>(null);
  readonly error = signal<NetError | null>(null);
  readonly lobby = signal<LobbyState | null>(null);
  readonly view = signal<NetView | null>(null);
  /** Last measured round trip (lobby pings), ms. */
  readonly rtt = signal(0);
  /** Test hook (dev builds): pretend to be another game version. */
  versionOverride: string | null = null;
  lock: Lockstep | null = null;
  private transport: Transport | null = null;
  private guestHello: { loadouts: Record<string, LoadoutChange[]>; facing: FacingMode } | null =
    null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pingN = 0;
  private viewKey = '';
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

  /** This computer's player in the world (host 0, guest 1). */
  get localSlot(): number {
    return this.role.value === 'host' ? 0 : 1;
  }

  /** The in-game network panel takes menu input (hold, pause, countdown, the end). */
  get menuOpen(): boolean {
    const v = this.view.value;
    return this.active && v !== null && v.phase !== 'run';
  }

  // --- hosting and joining -------------------------------------------------------------

  async host(): Promise<void> {
    this.reset();
    this.role.value = 'host';
    this.status.value = 'opening';
    let info: { code: string; port: number; token: string; addresses: string[] };
    try {
      const res = await fetch(ROOM_API, { method: 'POST' });
      if (!res.ok) throw new Error('api');
      info = (await res.json()) as typeof info;
    } catch {
      this.fail('api');
      return;
    }
    try {
      const t = await connectRoom(
        roomUrl('127.0.0.1', info.port, { role: 'host', token: info.token }),
        'hosting',
      );
      this.attach(t);
    } catch (err) {
      this.fail((err as Error).message as RoomError);
      return;
    }
    this.room.value = { code: info.code, port: info.port, addresses: info.addresses ?? [] };
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
    this.status.value = 'joining';
    try {
      const t = await connectRoom(
        roomUrl(address.trim(), port, { role: 'guest', code: code.trim() }),
        'joined',
      );
      this.attach(t);
    } catch (err) {
      this.fail((err as Error).message as RoomError);
      return;
    }
    const loadouts: Record<string, LoadoutChange[]> = {};
    for (const h of HEROES) loadouts[h] = loadoutChanges(this.shell.active.value, h);
    this.send({
      t: 'hello',
      compat: this.compat(),
      name: this.myName(),
      loadouts,
      facing: this.myFacing(),
    });
    // The host answers at once; silence means something other than this game answered.
    setTimeout(() => {
      if (this.status.value === 'joining' && this.role.value === 'guest') this.fail('noHost');
    }, 6000);
  }

  /** Leaves the room or the lobby (the partner is told) and closes the host's room. */
  leave(reason: EndReason = 'left'): void {
    if (this.lock && this.lock.phase !== 'ended') this.lock.end(reason, now());
    else if (this.transport?.open && this.status.value !== 'idle') this.send({ t: 'bye', reason });
    this.teardown();
    this.closeRoom();
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

  private reset(): void {
    if (this.status.value !== 'idle') this.leave();
    this.error.value = null;
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
    const t = this.transport;
    this.transport = null;
    if (t) {
      t.onMessage = null;
      t.onClose = null;
      t.close();
    }
    this.lock = null;
    this.guestHello = null;
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('blur', this.onBlur);
    const s = this.shell.session;
    s.net = null;
    s.devices.joinLocked = false;
  }

  private attach(t: Transport): void {
    this.transport = t;
    t.onMessage = (m) => this.onMessage(m);
    t.onClose = () => this.onClosed();
    // Lobby heartbeat: measures the round trip for the input delay.
    this.timer = setInterval(() => {
      if (this.lock) this.lock.tick(now());
      else if (this.status.value === 'lobby') this.send({ t: 'ping', n: ++this.pingN, at: now() });
    }, 250);
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

  private onClosed(): void {
    if (this.lock) {
      this.lock.lost();
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
      delay: chooseDelay(this.rtt.value),
    };
    this.send({ t: 'start', start });
    this.startGame(start);
  }

  // --- the game ------------------------------------------------------------------------

  private startGame(start: StartInfo): void {
    const slot = this.localSlot as 0 | 1;
    const session = this.shell.session;
    const lock = new Lockstep({
      slot,
      delay: start.delay,
      now: now(),
      send: (m) => this.send(m),
      hooks: {
        hash: () => this.hash(),
        snapshot: () => snapshotWorld(session.world),
        restore: (s) => session.replaceWorld(restoreWorld(s)),
      },
    });
    this.lock = lock;
    this.viewKey = '';
    this.shell.startNetStage(start);
    session.net = this.driver(lock);
    this.status.value = 'playing';
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('blur', this.onBlur);
  }

  /** Test hook: a different hash makes this game look desynchronised. */
  hashTamper = 0;
  private hash(): number {
    return (hashWorld(this.shell.session.world) + this.hashTamper) >>> 0;
  }

  private loseFocus(): void {
    const lock = this.lock;
    if (!lock || !this.shell.session.devices.pauseOnFocusLoss) return;
    this.shell.session.devices.loseFocus();
    this.shell.session.devices.focusPaused = false;
    if (lock.phase === 'run' || lock.phase === 'countdown') lock.requestHold('focus', now());
    else if (lock.phase === 'hold') lock.requestHold(lock.hold?.kind ?? 'focus', now());
  }

  /** Pause (or the Resume button) during play: pause, or confirm readiness in a hold. */
  pauseOrReady(): void {
    const lock = this.lock;
    if (!lock) return;
    if (lock.phase === 'run') lock.requestHold('pause', now());
    else if (lock.phase === 'hold') lock.confirmReady(now());
    this.refreshView();
  }

  requestHold(kind: HoldKind): void {
    this.lock?.requestHold(kind, now());
  }

  /** End session (pause menu, or the partner is gone): back to the village. */
  endSession(): void {
    this.shell.returnToVillage();
  }

  private driver(lock: Lockstep): NetDriver {
    const devices = this.shell.session.devices;
    return {
      localSlot: lock.slot,
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
        this.refreshView();
      },
      wantsInput: (f) => lock.wantsInput(f),
      submit: (f, input: FrameInput) => lock.submit(f, input),
      canStep: (f) => lock.canStep(f),
      inputsFor: (f) => lock.inputsFor(f),
      stepped: (f) => lock.stepped(f, now()),
      stalled: () => lock.stalled(now()),
      catchUp: (f) => lock.catchUp(f),
    };
  }

  refreshView(): void {
    const lock = this.lock;
    if (!lock) return;
    const t = now();
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
      ended: lock.ended?.reason ?? null,
      endedBy: lock.ended?.by ?? -1,
    };
    const key = JSON.stringify(v);
    if (key === this.viewKey) return;
    this.viewKey = key;
    this.view.value = v;
    if (v.phase === 'ended' && this.status.value === 'playing') {
      this.status.value = 'ended';
      // The world stays where it stopped; nothing continuable is saved.
      this.shell.session.held = true;
    }
  }
}
