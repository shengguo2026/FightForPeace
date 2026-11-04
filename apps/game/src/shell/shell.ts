import { signal } from '@preact/signals';
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DEFAULT_SETTINGS,
  ProfileStore,
  STORY_STAGE1,
  WriterLock,
  createGuest,
  createProfile,
  openBackend,
  pickLocale,
  recordClear,
  keyboardP2,
  type Bindings,
  type CheckpointRecord,
  type DeviceId,
  type DeviceRecord,
  type Locale,
  type Profile,
  type QualitySetting,
  type SaveBackend,
} from '@ffp/platform';
import { DIFFICULTIES, STAGES, type StageResults } from '@ffp/sim';
import type { GameSession } from '../game';
import type { LabState } from '../ui/labState';
import { setLocale } from '../text/i18n';
import { presentation } from './presentation';

/**
 * M10 game shell: which screen is open, the profiles and their saves, and the play flow
 * `mode → lobby → stage and difficulty → heroes → intro → briefing → readiness → game`
 * (Module 16). The shell never touches the simulation except to start a stage.
 */
export type Screen =
  | 'boot'
  | 'setup'
  | 'village'
  | 'mode'
  | 'lobby'
  | 'stage'
  | 'heroes'
  | 'intro'
  | 'briefing'
  | 'ready'
  | 'game'
  | 'lab'
  | 'settings'
  | 'records'
  | 'store'
  | 'guide';

/** Screens during which the simulation runs. */
const LIVE: ReadonlySet<Screen> = new Set(['game', 'lab']);

export interface LobbyPlayer {
  device: DeviceId;
  /** Profile id, or 'guest'. */
  profile: string;
  ready: boolean;
}

export interface HeroPick {
  /** Index into the roster the panel is looking at. */
  cursor: number;
  confirmed: boolean;
}

export type PauseConfirm = { kind: 'restart' | 'village'; agreed: boolean[] } | null;

export const HERO_ROSTER = ['mountain', 'river'] as const;
export const DIFFICULTY_ORDER = DIFFICULTIES.map((d) => d.id);

export class Shell {
  readonly screen = signal<Screen>('boot');
  /** The screen the settings were opened from (village or the pause menu). */
  readonly settingsFrom = signal<Screen>('village');
  readonly settingsCategory = signal<string>('gameplay');
  readonly device = signal<DeviceRecord | null>(null);
  readonly profiles = signal<Profile[]>([]);
  /** Player 1's profile (the active profile of this device). */
  readonly active = signal<Profile | null>(null);
  /** Player 2's profile in co-op (a local profile or a temporary Guest). */
  readonly partner = signal<Profile | null>(null);
  readonly readOnly = signal(false);
  readonly recovered = signal(false);
  readonly storage = signal<SaveBackend['kind']>('memory');
  readonly mode = signal<'solo' | 'coop'>('solo');
  readonly lobby = signal<LobbyPlayer[]>([]);
  readonly stagePick = signal({ stage: 'stage1', difficulty: 'medium' });
  readonly heroPicks = signal<HeroPick[]>([]);
  readonly ready = signal<boolean[]>([]);
  /** Set when the running stage was started by Continue (results say so). */
  readonly continued = signal<CheckpointRecord | null>(null);
  /** Started from the shell's play flow (results offer the village). */
  readonly fromShell = signal(false);
  readonly pauseConfirm = signal<PauseConfirm>(null);
  readonly toast = signal('');
  /** The device that confirmed first launch, offered as Player 1's controls. */
  readonly setupDevice = signal<'keyboard' | 'gamepad' | null>(null);
  store: ProfileStore | null = null;
  /** Sets the presentation quality (wired to the quality governor by main). */
  onQuality: (setting: QualitySetting) => void = () => {};
  private readonly lock = new WriterLock();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private resultsRecorded = false;
  private lastCheckpointKey = '';

  constructor(
    readonly session: GameSession,
    readonly lab: LabState,
    readonly gameVersion: string,
  ) {}

  /** Is the simulation allowed to step? */
  get live(): boolean {
    return LIVE.has(this.screen.value);
  }

  go(screen: Screen): void {
    this.screen.value = screen;
    this.session.held = !LIVE.has(screen);
    this.session.devices.flush();
  }

  // --- boot and profiles ----------------------------------------------------------------

  async boot(backend?: SaveBackend): Promise<void> {
    const b = backend ?? (await openBackend());
    this.storage.value = b.kind;
    this.store = new ProfileStore(b, this.gameVersion);
    const device = await this.store.device();
    if (!device.setupDone) device.locale = pickLocale(navigator.languages ?? []);
    this.device.value = device;
    setLocale(device.locale);
    this.profiles.value = await this.store.loadAll();
    const last =
      this.profiles.value.find((p) => p.id === device.lastProfile) ?? this.profiles.value[0];
    if (!device.setupDone || !last) {
      this.go('setup');
      return;
    }
    await this.useProfile(last.id);
    this.go('village');
  }

  /** First launch: creates the profile with the choices made and opens the village. */
  async finishSetup(choice: {
    name: string;
    locale: Locale;
    settings: Partial<Profile['settings']>;
  }): Promise<void> {
    const p = createProfile(choice.name.trim() || 'Player', choice.locale);
    p.settings = { ...DEFAULT_SETTINGS, ...choice.settings };
    const device: DeviceRecord = {
      ...(this.device.value ?? (await this.store!.device())),
      setupDone: true,
      lastProfile: p.id,
      locale: choice.locale,
    };
    await this.store!.save(p);
    await this.store!.saveDevice(device);
    this.device.value = device;
    this.profiles.value = await this.store!.loadAll();
    await this.useProfile(p.id);
    this.go('village');
  }

  async useProfile(id: string): Promise<void> {
    const r = await this.store!.load(id);
    if (!r.profile) return;
    this.recovered.value = r.recovered;
    this.readOnly.value = !(await this.lock.acquire(id));
    this.active.value = r.profile;
    this.applyProfile(r.profile, 0);
    const d = this.device.value;
    if (d && d.lastProfile !== id) {
      this.device.value = { ...d, lastProfile: id };
      await this.store!.saveDevice(this.device.value);
    }
  }

  async newProfile(name: string): Promise<void> {
    const p = createProfile(name, this.device.value?.locale ?? 'en');
    await this.store!.save(p);
    this.profiles.value = await this.store!.loadAll();
    await this.useProfile(p.id);
  }

  async deleteProfile(id: string): Promise<void> {
    await this.store!.remove(id);
    this.profiles.value = await this.store!.loadAll();
    if (this.active.value?.id === id) {
      const next = this.profiles.value[0];
      if (next) await this.useProfile(next.id);
      else {
        this.active.value = null;
        const d = { ...this.device.value!, setupDone: false, lastProfile: null };
        this.device.value = d;
        await this.store!.saveDevice(d);
        this.go('setup');
      }
    }
  }

  async refreshProfiles(): Promise<void> {
    this.profiles.value = await this.store!.loadAll();
    const a = this.active.value;
    if (a) {
      const fresh = this.profiles.value.find((p) => p.id === a.id);
      if (fresh) {
        this.active.value = fresh;
        this.applyProfile(fresh, 0);
      }
    }
  }

  /** Changes the active profile (or Player 2's) and saves it shortly after. */
  update(mutate: (p: Profile) => void, slot = 0): void {
    const sig = slot === 0 ? this.active : this.partner;
    const p = sig.value;
    if (!p) return;
    const next = structuredClone(p);
    mutate(next);
    sig.value = next;
    this.applyProfile(next, slot);
    this.scheduleSave(next);
  }

  private scheduleSave(p: Profile): void {
    if (p.guest || (this.readOnly.value && p.id === this.active.value?.id)) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.store?.save(p).then(() => {
        const list = this.profiles.value.filter((x) => x.id !== p.id);
        this.profiles.value = [p, ...list];
      });
    }, 250);
  }

  /** Writes pending changes now (before a page unload or a test reads the store). */
  async flushSave(): Promise<void> {
    if (!this.saveTimer) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    for (const p of [this.active.value, this.partner.value])
      if (p && !p.guest && !(this.readOnly.value && p.id === this.active.value?.id))
        await this.store?.save(p);
  }

  setLanguage(l: Locale): void {
    setLocale(l);
    const d = this.device.value;
    if (d) {
      this.device.value = { ...d, locale: l };
      void this.store?.saveDevice(this.device.value);
    }
    this.update((p) => (p.locale = l));
  }

  setUiScale(scale: number): void {
    const d = this.device.value;
    if (!d) return;
    this.device.value = { ...d, uiScale: scale };
    void this.store?.saveDevice(this.device.value);
    applyUiScale(scale);
  }

  /** Puts a profile's controls and preferences into effect for a player slot. */
  applyProfile(p: Profile, slot: number): void {
    const hub = this.session.devices;
    if (slot === 0) {
      setLocale(this.device.value?.locale ?? p.locale);
      hub.keyboardP1.setBindings(p.bindings.keyboard ?? DEFAULT_KEYBOARD_P1);
      hub.setGamepadBindings(p.bindings.gamepad ?? DEFAULT_GAMEPAD);
      this.lab.promptStyle.value = p.settings.promptStyle;
      if (p.settings.layout) {
        this.lab.layout.value = p.settings.layout;
        this.session.labels.setPickedLayout(p.settings.layout);
      }
      applyPresentation(p.settings);
    }
    if (slot === 1 || slot === 0) {
      const p2 = slot === 1 ? p : this.partner.value;
      hub.keyboardP2.setBindings(
        p2?.bindings.keyboardP2 ?? p.bindings.keyboardP2 ?? keyboardP2('numpad'),
      );
    }
    this.session.setFacingMode(slot, p.settings.facing);
  }

  // --- play flow --------------------------------------------------------------------------

  startPlay(): void {
    this.mode.value = 'solo';
    this.fromShell.value = true;
    this.go('mode');
  }

  chooseMode(mode: 'solo' | 'coop'): void {
    this.mode.value = mode;
    const p1Device = this.session.devices.slots[0]?.device ?? 'kb:p1';
    this.lobby.value = [
      { device: p1Device, profile: this.active.value?.id ?? 'guest', ready: false },
    ];
    this.partner.value = null;
    this.go('lobby');
  }

  /** Player 2 joins the lobby from an unused device. */
  joinLobby(device: DeviceId): void {
    const l = this.lobby.value;
    if (this.mode.value !== 'coop' || l.length >= 2 || l.some((p) => p.device === device)) return;
    this.partner.value = createGuest(this.device.value?.locale ?? 'en');
    this.lobby.value = [
      ...l.map((p) => ({ ...p, ready: false })),
      { device, profile: 'guest', ready: false },
    ];
  }

  leaveLobby(slot: number): void {
    if (slot === 0) return;
    this.partner.value = null;
    this.lobby.value = this.lobby.value.slice(0, 1).map((p) => ({ ...p, ready: false }));
  }

  /** Player 2 picks a local profile (not the one Player 1 uses) or the Guest. */
  async setPartnerProfile(id: string): Promise<void> {
    if (id === 'guest') this.partner.value = createGuest(this.device.value?.locale ?? 'en');
    else {
      const r = await this.store!.load(id);
      if (!r.profile || id === this.active.value?.id) return;
      this.partner.value = r.profile;
    }
    this.lobby.value = this.lobby.value.map((p, i) =>
      i === 1 ? { ...p, profile: id, ready: false } : p,
    );
    this.applyProfile(this.partner.value!, 1);
  }

  setLobbyReady(slot: number, ready: boolean): void {
    this.lobby.value = this.lobby.value.map((p, i) => (i === slot ? { ...p, ready } : p));
  }

  /** Every lobby player is ready: assign the devices and pick the stage. */
  lobbyDone(): void {
    const l = this.lobby.value;
    this.session.devices.assignPlayers([l[0]!.device, l[1]?.device ?? null]);
    this.go('stage');
  }

  setStagePick(pick: Partial<{ stage: string; difficulty: string }>): void {
    this.stagePick.value = { ...this.stagePick.value, ...pick };
    // A shared rule changed: every player's readiness is cleared (Module 16).
    this.ready.value = this.ready.value.map(() => false);
  }

  stageDone(): void {
    const players = this.lobby.value.length;
    const last = this.active.value?.lastHeroes ?? [];
    const picks: HeroPick[] = [];
    for (let i = 0; i < players; i += 1) {
      const want = (i === 1 ? this.partner.value?.lastHeroes[0] : last[0]) ?? HERO_ROSTER[i];
      let cursor = Math.max(0, HERO_ROSTER.indexOf(want as (typeof HERO_ROSTER)[number]));
      if (i === 1 && cursor === picks[0]?.cursor) cursor = (cursor + 1) % HERO_ROSTER.length;
      picks.push({ cursor, confirmed: false });
    }
    this.heroPicks.value = picks;
    this.go('heroes');
  }

  /** Who has confirmed hero `index` (one person per hero), or -1. */
  heroOwner(index: number): number {
    return this.heroPicks.value.findIndex((p) => p.confirmed && p.cursor === index);
  }

  moveHeroCursor(slot: number, step: number): void {
    const picks = this.heroPicks.value;
    const p = picks[slot];
    if (!p || p.confirmed) return;
    const n = HERO_ROSTER.length;
    const cursor = (p.cursor + step + n) % n;
    this.heroPicks.value = picks.map((x, i) => (i === slot ? { ...x, cursor } : x));
  }

  confirmHero(slot: number): boolean {
    const picks = this.heroPicks.value;
    const p = picks[slot];
    if (!p || p.confirmed) return false;
    const owner = this.heroOwner(p.cursor);
    if (owner >= 0 && owner !== slot) return false;
    this.heroPicks.value = picks.map((x, i) => (i === slot ? { ...x, confirmed: true } : x));
    return true;
  }

  releaseHero(slot: number): void {
    this.heroPicks.value = this.heroPicks.value.map((x, i) =>
      i === slot ? { ...x, confirmed: false } : x,
    );
    this.ready.value = this.ready.value.map((r, i) => (i === slot ? false : r));
  }

  heroesDone(): void {
    const heroes = this.chosenHeroes();
    this.update(
      (p) =>
        (p.lastHeroes = [heroes[0]!, ...p.lastHeroes.filter((h) => h !== heroes[0])].slice(0, 2)),
    );
    if (this.partner.value) this.update((p) => (p.lastHeroes = [heroes[1]!]), 1);
    this.ready.value = heroes.map(() => false);
    this.go('intro');
  }

  chosenHeroes(): string[] {
    return this.heroPicks.value.map((p) => HERO_ROSTER[p.cursor]!);
  }

  /** Starts the picked stage (from beat 0, or the checkpoint for Continue). */
  startStage(from?: CheckpointRecord): void {
    const pick = this.stagePick.value;
    const heroes = from ? from.heroes : this.chosenHeroes();
    this.continued.value = from ?? null;
    this.resultsRecorded = false;
    this.lastCheckpointKey = '';
    this.lab.visible.value = false;
    this.session.startStage(
      from?.stage ?? pick.stage,
      from?.difficulty ?? pick.difficulty,
      from?.beat ?? 0,
      heroes,
    );
    this.go('game');
  }

  /** Continue from the village: the saved checkpoint, solo with Player 1's device. */
  continueRun(): void {
    const cp = this.active.value?.checkpoint;
    if (!cp) return;
    this.fromShell.value = true;
    this.mode.value = cp.players > 1 ? 'coop' : 'solo';
    this.partner.value = null;
    const device = this.session.devices.slots[0]?.device ?? 'kb:p1';
    this.session.devices.assignPlayers([device, null]);
    this.stagePick.value = { stage: cp.stage, difficulty: cp.difficulty };
    this.startStage({ ...cp, heroes: cp.heroes.slice(0, 1) });
  }

  openLab(): void {
    this.fromShell.value = true;
    this.session.startArena(null);
    this.lab.visible.value = true;
    this.go('lab');
  }

  returnToVillage(): void {
    this.pauseConfirm.value = null;
    this.session.devices.userPaused = false;
    this.session.startArena(null);
    this.session.devices.assignPlayers([this.session.devices.slots[0]?.device ?? 'kb:p1', null]);
    this.partner.value = null;
    this.continued.value = null;
    this.go('village');
  }

  /** Restart from Checkpoint (pause menu, after every player agreed). */
  restartFromCheckpoint(): void {
    const run = this.session.world.run;
    if (!run) return;
    const beat = run.checkpoint?.beat ?? run.startBeat;
    const pick = this.stagePick.value;
    const heroes = [0, 1]
      .map((s) => this.session.world.playerHero[s])
      .filter((h): h is number => h !== undefined)
      .map((h) => HERO_ROSTER[h] ?? 'mountain');
    this.pauseConfirm.value = null;
    this.session.devices.userPaused = false;
    this.session.startStage(STAGES[run.stage]!.id, pick.difficulty, beat, heroes);
    this.session.devices.flush();
  }

  resume(): void {
    this.pauseConfirm.value = null;
    this.session.devices.userPaused = false;
    this.session.devices.flush();
  }

  // --- progress -------------------------------------------------------------------------

  /** Called every render frame in a stage: saves new checkpoints and the final result. */
  watchRun(results: StageResults | null): void {
    const world = this.session.world;
    const run = world.run;
    const p = this.active.value;
    if (!run || !p || !this.fromShell.value) return;
    const stage = STAGES[run.stage]!;
    if (run.checkpoint) {
      const key = `${stage.id}:${run.checkpoint.beat}`;
      if (key !== this.lastCheckpointKey) {
        this.lastCheckpointKey = key;
        const heroes = [0, 1]
          .map((s) => world.playerHero[s])
          .filter((h): h is number => h !== undefined)
          .map((h) => HERO_ROSTER[h] ?? 'mountain');
        this.update(
          (x) =>
            (x.checkpoint = {
              stage: stage.id,
              difficulty: DIFFICULTIES[run.difficulty]?.id ?? 'medium',
              beat: run.checkpoint!.beat,
              heroes,
              players: this.session.devices.joinedCount(),
              savedAt: Date.now(),
            }),
        );
      }
    }
    if (results && !this.resultsRecorded) {
      this.resultsRecorded = true;
      const heroes = this.session.world.playerHero.map((h) => HERO_ROSTER[h] ?? 'mountain');
      const record = (x: Profile) => {
        recordClear(
          x,
          stage.id === 'stage1' ? STORY_STAGE1 : `story.${stage.id}`,
          {
            grade: results.overall,
            timeFrames: results.stats.frames,
            difficulty: DIFFICULTIES[results.difficulty]?.id ?? 'medium',
            heroes,
          },
          DIFFICULTY_ORDER,
        );
        x.checkpoint = null;
      };
      this.update(record);
      if (this.partner.value && !this.partner.value.guest) this.update(record, 1);
    }
  }

  showToast(text: string): void {
    this.toast.value = text;
    setTimeout(() => {
      if (this.toast.value === text) this.toast.value = '';
    }, 2500);
  }
}

/** Accessibility presentation settings as CSS on the page (never the simulation). */
export function applyPresentation(s: Profile['settings']): void {
  presentation.effects = (s.volumeMaster / 100) * (s.volumeEffects / 100);
  presentation.reducedFlashing = s.reducedFlashing;
  presentation.reducedShake = s.reducedShake;
  const root = document.documentElement;
  root.style.setProperty('--ffp-hud-scale', String(s.hudScale / 100));
  root.classList.toggle('ffp-contrast', s.highContrast);
  root.classList.toggle('ffp-readable', s.readableFont);
  root.classList.toggle('ffp-reduced-flash', s.reducedFlashing);
  root.classList.toggle('ffp-reduced-shake', s.reducedShake);
  root.dataset.subtitleSize = s.subtitleSize;
  root.classList.toggle('ffp-subtitle-bg', s.subtitleBackground);
}

export function applyUiScale(scale: number): void {
  document.documentElement.style.setProperty('--ffp-ui-scale', String(scale / 100));
}

/** The bindings a remap screen edits: per player and device type. */
export function bindingsOf(
  p: Profile | null,
  kind: 'keyboard' | 'keyboardP2' | 'gamepad',
): Bindings {
  const own = p?.bindings[kind];
  if (own) return own;
  return kind === 'keyboard'
    ? DEFAULT_KEYBOARD_P1
    : kind === 'gamepad'
      ? DEFAULT_GAMEPAD
      : keyboardP2('numpad');
}
