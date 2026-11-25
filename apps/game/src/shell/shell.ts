import { signal } from '@preact/signals';
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DEFAULT_SETTINGS,
  ProfileStore,
  WriterLock,
  completeStage,
  runCompletesStage,
  archiveRun,
  missionHeroes,
  missionPackage,
  recordMissionRun,
  replayTarget,
  type RunArchiveEntry,
  type RunLabel,
  noteStageStart,
  whatsNewDue,
  markWhatsNewSeen,
  createGuest,
  createProfile,
  MemoryBackend,
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
import {
  DIFFICULTIES,
  GREENHOUSE,
  HEROES,
  STAGES,
  cheatMask,
  codesOf,
  setCheats,
  type StageResults,
  type WorldOptions,
  Result,
  objectiveGrade,
} from '@ffp/sim';
import {
  DOSSIER,
  MUSEUM,
  contentIdOf,
  equippedTechniques,
  loadoutChanges,
  outfitTint,
  settleRun,
  type Settlement,
} from '@ffp/platform';
import type { GameSession } from '../game';
import type { LabState } from '../ui/labState';
import { setLocale, stageName, t } from '../text/i18n';
import { presentation } from './presentation';
import { audio } from '../media/audio';
import { can } from '../system/probe';
import { Academy } from '../academy/runner';
import { NetPlay } from '../net/netplay';
import { setFacingMode } from '@ffp/sim';
import type { StartInfo, StoryState } from '@ffp/platform';
import { applyHubLab, type HubLabPreset } from './hubLab';

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
  | 'profile'
  | 'store'
  | 'guide'
  | 'secrets'
  | 'academy'
  | 'lesson'
  | 'practiceSetup'
  | 'practice'
  | 'combos'
  | 'wifi'
  | 'netLobby'
  | 'museum'
  | 'whatsNew'
  | 'movelist'
  | 'preview'
  // M26 Mission Hub, a mission's card, the operations board, the Run Archive, results.
  | 'missions'
  | 'mission'
  | 'operations'
  | 'archive'
  | 'missionResults';

/** Screens during which the simulation runs. */
const LIVE: ReadonlySet<Screen> = new Set(['game', 'lab', 'lesson', 'practice', 'preview']);

/** Cheats chosen for the next run (canonical codes): hero codes per player, session codes. */
export interface CheatDraft {
  hero: string[][];
  session: string[];
}

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

/** Every playable hero in roster order (M16: the founders, then the twins). */
export const HERO_ROSTER: readonly string[] = HEROES.map((h) => h.id);
export const DIFFICULTY_ORDER = DIFFICULTIES.map((d) => d.id);

/** M26: the Mission Mode package picked for the next run, and its difficulty. */
export interface MissionPick {
  id: string;
  difficulty: string;
}

/** M26: what the mission results screen shows. */
export interface MissionResultView {
  id: string;
  outcome: 'cleared' | 'failed';
  grade: string | null;
  points: number | null;
  capped: string | null;
  cheatAssisted: boolean;
  timeFrames: number;
  difficulty: string;
  heroes: string[];
  authenticated: boolean;
  opened: string[];
}

/** Frames between a mission's end and its results screen. */
export const MISSION_RESULTS_DELAY = 90;

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
  /**
   * The running stage was resumed from a confirmed checkpoint (Continue or Restart from
   * Checkpoint), not started at a later beat for practice: finishing it still completes
   * the stage (Guo, 14 Nov).
   */
  private fromCheckpoint = false;
  /** Started from the shell's play flow (results offer the village). */
  readonly fromShell = signal(false);
  readonly pauseConfirm = signal<PauseConfirm>(null);
  readonly toast = signal('');
  /** The device that confirmed first launch, offered as Player 1's controls. */
  readonly setupDevice = signal<'keyboard' | 'gamepad' | null>(null);
  // --- M11 ---
  /** Each player's settlement of the last results (null: a Guest or no shell run). */
  readonly settlement = signal<(Settlement | null)[]>([]);
  /** Cheats for the next run, and which players accepted the Cheat-Assisted consequence. */
  readonly cheatDraft = signal<CheatDraft>({ hero: [[], []], session: [] });
  readonly cheatConsent = signal<boolean[]>([]);
  /** M13: the ending cinematic's state while it plays over the finished stage (null: none). */
  readonly ending = signal<StoryState | null>(null);
  /**
   * M22: the Stage 2 ending chapters' state, waiting for the in-engine epilogue cards to
   * finish (null: none; Wi-Fi games skip them as they skip the Stage 1 ending).
   */
  readonly chapters = signal<StoryState | null>(null);
  /** M21: what the last finished run completed (stages it opened, Museum entries). */
  readonly completion = signal<{ opened: string[]; unlocked: string[]; first: boolean } | null>(
    null,
  );
  /** M21: the What's New briefing shown (its stage) and where it continues to. */
  readonly whatsNew = signal<{ stage: string; then: Screen }>({ stage: 'stage2', then: 'academy' });
  /** Where Elder's Secrets and the Guide return to. */
  readonly secretsFrom = signal<Screen>('guide');
  readonly guideFrom = signal<Screen>('village');
  readonly guideChapter = signal<string>('start');
  /** Academy lessons, Free Practice and My Combos. */
  readonly academy = new Academy(this);
  /** M12 local-Wi-Fi co-op (room, lobby, lockstep session). */
  readonly net = new NetPlay(this);
  /** Free Practice set-up: hero, trial techniques (store ids), Cheat Practice codes. */
  readonly practice = signal<{ hero: string; trial: string[]; cheats: string[] }>({
    hero: 'mountain',
    trial: [],
    cheats: [],
  });
  // --- M26 ---
  /** The Hub runs on a temporary M26 Lab profile (`?hublab=`): Lab packages show. */
  readonly hubLab = signal(false);
  /** The Hub destination in focus (chronicle, remix, curated, operation). */
  readonly hubFamily = signal<string>('chronicle');
  /** The package whose card is open. */
  readonly missionFocus = signal<string>('');
  /** The package the play flow is starting (null: Story Mode). */
  readonly missionPick = signal<MissionPick | null>(null);
  /** Heroes an Archive replay preselects (null: the last heroes). */
  readonly replayHeroes = signal<string[] | null>(null);
  /** The last finished mission run's results. */
  readonly missionResult = signal<MissionResultView | null>(null);
  /** The mission run in progress, and the frame it ended (-1: running). */
  private missionRun: { id: string; endedAt: number } | null = null;
  /** Where the Run Archive returns to. */
  readonly archiveFrom = signal<Screen>('records');
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
    // The Lab's panels (F1) belong to the Lab: lessons, previews and stages start clean.
    if (screen !== 'lab') this.lab.visible.value = false;
    this.session.held = !LIVE.has(screen);
    this.session.devices.flush();
  }

  // --- boot and profiles ----------------------------------------------------------------

  async boot(backend?: SaveBackend): Promise<void> {
    // M14: a browser without storage (or `?caps=-storage`) plays as a temporary profile.
    const b = backend ?? (can('saves') ? await openBackend() : new MemoryBackend());
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

  /**
   * M26 Lab profiles (`?hublab=<preset>`): boots on memory storage with one temporary
   * profile whose progress shows every Hub state, and opens the Mission Hub.
   */
  async bootHubLab(preset: HubLabPreset): Promise<void> {
    this.hubLab.value = true;
    const b = new MemoryBackend();
    this.storage.value = b.kind;
    this.store = new ProfileStore(b, this.gameVersion);
    const base = await this.store.device();
    const locale = pickLocale(navigator.languages ?? []);
    const p = createProfile('M26 Hub Lab', locale);
    applyHubLab(p, preset, this.gameVersion);
    const device: DeviceRecord = { ...base, setupDone: true, lastProfile: p.id, locale };
    await this.store.save(p);
    await this.store.saveDevice(device);
    this.device.value = device;
    setLocale(locale);
    this.profiles.value = await this.store.loadAll();
    await this.useProfile(p.id);
    this.openHub();
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
    this.missionPick.value = null;
    this.replayHeroes.value = null;
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
    const rule = this.missionHeroRule();
    const replay = this.replayHeroes.value;
    for (let i = 0; i < players; i += 1) {
      const want =
        rule?.fixed?.[i] ??
        replay?.[i] ??
        (i === 1 ? this.partner.value?.lastHeroes[0] : last[0]) ??
        HERO_ROSTER[i];
      let cursor = Math.max(0, HERO_ROSTER.indexOf(want ?? 'mountain'));
      if (rule && !rule.eligible.includes(HERO_ROSTER[cursor]!))
        cursor = Math.max(0, HERO_ROSTER.indexOf(rule.eligible[0] ?? 'mountain'));
      if (i === 1 && cursor === picks[0]?.cursor) cursor = this.nextHero(cursor, 1);
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
    // M26: a mission with fixed participants offers no choice.
    if (this.missionHeroRule()?.fixed) return;
    const cursor = this.nextHero(p.cursor, step);
    this.heroPicks.value = picks.map((x, i) => (i === slot ? { ...x, cursor } : x));
  }

  /** The next roster index in `step`'s direction a mission allows (every hero in Story). */
  private nextHero(from: number, step: number): number {
    const n = HERO_ROSTER.length;
    const rule = this.missionHeroRule();
    let cursor = from;
    for (let k = 0; k < n; k += 1) {
      cursor = (cursor + step + n) % n;
      if (!rule || rule.eligible.includes(HERO_ROSTER[cursor]!)) return cursor;
    }
    return from;
  }

  /** M26: the picked mission's hero rule for the lobby's player count (null: Story Mode). */
  missionHeroRule(): { fixed: string[] | null; eligible: string[] } | null {
    const m = this.missionPick.value ? missionPackage(this.missionPick.value.id) : undefined;
    return m ? missionHeroes(m, Math.max(1, this.lobby.value.length)) : null;
  }

  confirmHero(slot: number): boolean {
    const picks = this.heroPicks.value;
    const p = picks[slot];
    if (!p || p.confirmed) return false;
    const rule = this.missionHeroRule();
    if (rule) {
      const hero = HERO_ROSTER[p.cursor]!;
      if (!rule.eligible.includes(hero)) return false;
      if (rule.fixed && rule.fixed[slot] !== hero) return false;
    }
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
    // M26: a mission goes straight to readiness (its card was its briefing).
    if (this.missionPick.value) {
      this.go('ready');
      return;
    }
    const stage = this.stagePick.value.stage;
    // M21: the Stage 1 intro stays Stage 1's; a later stage shows What's New once per
    // profile before its first run, then its own briefing.
    // M22: Stage 2 opens with its four story chapters, then the briefing; M28: Stage 3
    // with Silvermist.
    if (stage === 'stage1') this.go('intro');
    else this.openWhatsNew(stage, stage === 'stage2' || stage === 'stage3' ? 'intro' : 'briefing');
  }

  /** M21: the What's New briefing of `stage` when it is still due, else straight to `then`. */
  openWhatsNew(stage: string, then: Screen, always = false): void {
    const p = this.active.value;
    if (!always && (!p || whatsNewDue(p, stage).length === 0)) {
      this.go(then);
      return;
    }
    this.whatsNew.value = { stage, then };
    this.go('whatsNew');
  }

  /** The What's New briefing was read: it is not shown again before a run. */
  whatsNewDone(): void {
    const w = this.whatsNew.value;
    this.update((p) => markWhatsNewSeen(p, w.stage));
    this.go(w.then);
  }

  chosenHeroes(): string[] {
    return this.heroPicks.value.map((p) => HERO_ROSTER[p.cursor]!);
  }

  /** The profile playing slot `slot` (Player 1: the active profile). */
  profileOf(slot: number): Profile | null {
    const own = this.profileSlot(slot);
    return own === 0 ? this.active.value : own === 1 ? this.partner.value : null;
  }

  /**
   * Which local profile plays world slot `slot`: 0 the active profile, 1 Player 2's, -1
   * none (M12 Wi-Fi: the partner's profile lives on their own computer).
   */
  profileSlot(slot: number): number {
    if (this.net.active) return slot === this.net.localSlot ? 0 : -1;
    return slot;
  }

  /** M15: this computer recorded the current Wi-Fi session's results (tests). */
  get creditedThisSession(): boolean {
    return this.net.active && this.resultsRecorded;
  }

  /** Players in the running game (Wi-Fi: both computers' players). */
  playerCount(): number {
    return this.net.active ? 2 : this.session.devices.joinedCount();
  }

  /** M12: starts the Wi-Fi stage the host sent (the same first frame on both computers). */
  startNetStage(start: StartInfo): void {
    this.fromShell.value = true;
    this.mode.value = 'coop';
    this.partner.value = null;
    this.continued.value = null;
    this.resultsRecorded = false;
    this.ending.value = null;
    this.chapters.value = null;
    this.settlement.value = [];
    this.lastCheckpointKey = '';
    this.cheatDraft.value = { hero: [[], []], session: [] };
    this.lab.visible.value = false;
    this.stagePick.value = { stage: start.stage, difficulty: start.difficulty };
    const hub = this.session.devices;
    hub.assignPlayers([hub.slots[0]?.device ?? 'kb:p1', null]);
    hub.joinLocked = true;
    hub.userPaused = false;
    hub.focusPaused = false;
    const local = this.net.localSlot;
    this.heroPicks.value = start.heroes.map((h) => ({
      cursor: Math.max(0, HERO_ROSTER.indexOf(h)),
      confirmed: true,
    }));
    presentation.outfitTint = start.heroes.map((h, slot) => {
      const c = slot === local ? outfitTint(this.active.value, h) : null;
      return c ? Number.parseInt(c.slice(1), 16) : null;
    });
    this.session.startStage(
      start.stage,
      start.difficulty,
      0,
      start.heroes,
      {
        loadouts: start.loadouts,
      },
      start.seed,
    );
    start.facing.forEach((f, slot) => setFacingMode(this.session.world, slot, f));
    this.completion.value = null;
    this.update((p) => void noteStageStart(p, start.stage));
    this.go('game');
  }

  /** Each player's owned loadout changes for their hero (Standard when none). */
  loadoutsFor(heroes: readonly string[]): NonNullable<WorldOptions['loadouts']> {
    return heroes.map((h, slot) => loadoutChanges(this.profileOf(slot), h));
  }

  /** The draft as simulation masks, or undefined when nothing is selected. */
  draftCheats(): WorldOptions['cheats'] {
    const d = this.cheatDraft.value;
    const hero = [0, 1].map((s) => cheatMask(d.hero[s] ?? [], 'hero'));
    const session = cheatMask(d.session, 'session');
    if (session === 0 && hero.every((m) => m === 0)) return undefined;
    return { hero, session };
  }

  /** Outfit colours of the heroes for the renderer (presentation only). */
  applyOutfits(heroes: readonly string[]): void {
    presentation.outfitTint = heroes.map((h, slot) => {
      const c = outfitTint(this.profileOf(slot), h);
      return c ? Number.parseInt(c.slice(1), 16) : null;
    });
  }

  /** Starts the picked stage (from beat 0, or the checkpoint for Continue). */
  startStage(from?: CheckpointRecord): void {
    if (!from && this.missionPick.value) {
      this.startMission();
      return;
    }
    this.missionRun = null;
    const pick = this.stagePick.value;
    const heroes = from ? from.heroes : this.chosenHeroes();
    this.continued.value = from ?? null;
    this.fromCheckpoint = (from?.beat ?? 0) > 0;
    this.resultsRecorded = false;
    this.ending.value = null;
    this.chapters.value = null;
    this.settlement.value = [];
    this.lastCheckpointKey = '';
    this.lab.visible.value = false;
    let cheats = this.draftCheats();
    if (from?.cheats) {
      const c = from.cheats;
      cheats = {
        hero: [0, 1].map((s) => cheatMask(c.hero[s] ?? [], 'hero')),
        session: cheatMask(c.session, 'session'),
        marked: c.marked,
        firstBeat: c.firstBeat,
      };
    }
    this.applyOutfits(heroes);
    this.completion.value = null;
    // M21: a run of the stage began (Museum entries of the stage's start).
    if (!from || from.beat === 0) {
      const stage = from?.stage ?? pick.stage;
      this.update((p) => void noteStageStart(p, stage));
      if (this.partner.value && !this.partner.value.guest)
        this.update((p) => void noteStageStart(p, stage), 1);
    }
    this.session.startStage(
      from?.stage ?? pick.stage,
      from?.difficulty ?? pick.difficulty,
      from?.beat ?? 0,
      heroes,
      { loadouts: this.loadoutsFor(heroes), cheats },
    );
    this.go('game');
  }

  /**
   * Applies the cheat draft to the running stage (solo pause, or co-op after both players
   * confirmed). The first accepted cheat marks the run for good.
   */
  applyCheatsNow(): void {
    const c = this.draftCheats();
    setCheats(this.session.world, c?.hero ?? [0, 0], c?.session ?? 0);
    this.saveHeroPrefs();
  }

  /** Remembers each player's hero-scoped codes as reusable preferences for that hero. */
  saveHeroPrefs(): void {
    const d = this.cheatDraft.value;
    const heroes = this.chosenHeroes();
    [0, 1].forEach((slot) => {
      const hero = heroes[slot];
      if (!hero || !this.profileOf(slot)) return;
      this.update((p) => (p.cheats.heroPrefs[hero] = [...(d.hero[slot] ?? [])]), slot);
    });
  }

  /** The running world's cheats as canonical codes (checkpoint records, Continue). */
  worldCheats(): CheckpointRecord['cheats'] {
    const c = this.session.world.cheats;
    if (!c.marked) return null;
    return {
      hero: c.hero.map((m) => codesOf(m)),
      session: codesOf(c.session),
      marked: true,
      firstBeat: c.firstBeat,
    };
  }

  // --- M26 Mission Hub ---------------------------------------------------------------------

  openHub(): void {
    this.missionPick.value = null;
    this.replayHeroes.value = null;
    this.fromShell.value = true;
    this.go('missions');
  }

  openMission(id: string): void {
    this.missionFocus.value = id;
    this.go('mission');
  }

  /** A mission's card: play it solo or in same-device co-op (lobby, difficulty, heroes). */
  playMission(id: string, mode: 'solo' | 'coop', difficulty?: string, heroes?: string[]): void {
    const m = missionPackage(id);
    if (!m) return;
    const d =
      difficulty && m.difficulties.includes(difficulty)
        ? difficulty
        : m.difficulties.includes('medium')
          ? 'medium'
          : m.difficulties[0]!;
    this.missionPick.value = { id, difficulty: d };
    this.replayHeroes.value = heroes ?? null;
    this.fromShell.value = true;
    this.chooseMode(mode);
  }

  /** Replay from the Run Archive: the same content, difficulty, players and heroes. */
  replayRun(e: RunArchiveEntry): boolean {
    const p = this.active.value;
    if (!p) return false;
    const target = replayTarget(p, e, this.hubLab.value);
    if (target.kind === 'blocked') return false;
    const mode = target.players > 1 ? 'coop' : 'solo';
    if (target.kind === 'mission') {
      this.playMission(target.id, mode, target.difficulty, target.heroes);
      return true;
    }
    this.missionPick.value = null;
    this.replayHeroes.value = target.heroes;
    this.stagePick.value = { stage: target.stage, difficulty: target.difficulty };
    this.fromShell.value = true;
    this.chooseMode(mode);
    return true;
  }

  /** Starts the picked mission's arena with the chosen heroes, loadouts and cheats. */
  startMission(): void {
    const pick = this.missionPick.value;
    const m = pick ? missionPackage(pick.id) : undefined;
    if (!pick || !m || !m.arena) return;
    const heroes = this.chosenHeroes();
    this.continued.value = null;
    this.fromCheckpoint = false;
    this.resultsRecorded = false;
    this.ending.value = null;
    this.chapters.value = null;
    this.settlement.value = [];
    this.completion.value = null;
    this.missionResult.value = null;
    this.lab.visible.value = false;
    this.applyOutfits(heroes);
    this.session.startStage(m.arena, pick.difficulty, 0, heroes, {
      loadouts: this.loadoutsFor(heroes),
      cheats: this.draftCheats(),
    });
    this.missionRun = { id: m.id, endedAt: -1 };
    this.go('game');
  }

  /** Is a mission run on (the game screen shows an arena of a Mission Mode package)? */
  get missionActive(): boolean {
    return this.missionRun !== null;
  }

  /**
   * Called every render frame of a mission run: when its encounter ends (cleared, or every
   * hero down) the run is archived and recorded at once, and the results open shortly
   * after.
   */
  watchMission(): void {
    const run = this.missionRun;
    const w = this.session.world;
    const enc = w.encounter;
    const p = this.active.value;
    if (!run || !enc || !p) return;
    if (run.endedAt < 0) {
      if (enc.result !== Result.Cleared && enc.result !== Result.Defeated) return;
      run.endedAt = w.frame;
      this.recordMission(enc.result === Result.Cleared ? 'cleared' : 'failed');
      return;
    }
    if (w.frame - run.endedAt >= MISSION_RESULTS_DELAY && this.screen.value === 'game')
      this.go('missionResults');
  }

  private recordMission(outcome: 'cleared' | 'failed'): void {
    const run = this.missionRun;
    const m = run ? missionPackage(run.id) : undefined;
    if (!run || !m) return;
    const w = this.session.world;
    const g = objectiveGrade(w);
    const cheat = w.cheats.marked;
    const heroes = w.playerHero
      .slice(0, this.playerCount() || 1)
      .map((h) => HERO_ROSTER[h] ?? 'mountain');
    const difficulty = this.missionPick.value?.difficulty ?? 'medium';
    const report = {
      outcome,
      grade: outcome === 'cleared' ? (g?.overall ?? null) : null,
      points: outcome === 'cleared' ? (g?.points ?? null) : null,
      difficulty,
      heroes,
      players: heroes.length,
      timeFrames: w.frame,
      labels: this.runLabels(cheat, false, false, heroes),
      gameVersion: this.gameVersion,
    };
    let authenticated = false;
    let opened: string[] = [];
    this.update((x) => {
      const o = recordMissionRun(x, m, report, DIFFICULTY_ORDER);
      authenticated = o.authenticated;
      opened = o.opened;
    });
    if (this.partner.value && !this.partner.value.guest)
      this.update((x) => void recordMissionRun(x, m, report, DIFFICULTY_ORDER), 1);
    this.missionResult.value = {
      id: m.id,
      outcome,
      grade: report.grade,
      points: report.points,
      capped: g?.capped ?? null,
      cheatAssisted: cheat,
      timeFrames: w.frame,
      difficulty,
      heroes,
      authenticated,
      opened,
    };
  }

  /** Result labels of a finished run (spec §3.4: result labels, never canon labels). */
  private runLabels(
    cheat: boolean,
    continued: boolean,
    practice: boolean,
    heroes: readonly string[],
  ): RunLabel[] {
    const out: RunLabel[] = [];
    if (cheat) out.push('cheat-assisted');
    if (continued) out.push('continued');
    if (practice) out.push('practice');
    const open = heroes.some((h, slot) => equippedTechniques(this.profileOf(slot), h).length > 0);
    if (open) out.push('open-loadout');
    return out;
  }

  /** Mission results: play the same mission again (same players, heroes and difficulty). */
  missionAgain(): void {
    this.missionRun = null;
    this.startMission();
  }

  /** Mission results: back to the Hub. */
  leaveMission(): void {
    this.returnToVillage();
    this.missionPick.value = null;
    this.go('missions');
  }

  /** Continue from the village: the saved checkpoint, solo with Player 1's device. */
  continueRun(): void {
    const cp = this.active.value?.checkpoint;
    if (!cp) return;
    this.missionPick.value = null;
    this.missionRun = null;
    this.fromShell.value = true;
    this.mode.value = cp.players > 1 ? 'coop' : 'solo';
    this.partner.value = null;
    const device = this.session.devices.slots[0]?.device ?? 'kb:p1';
    this.session.devices.assignPlayers([device, null]);
    this.stagePick.value = { stage: cp.stage, difficulty: cp.difficulty };
    this.heroPicks.value = [
      { cursor: Math.max(0, HERO_ROSTER.indexOf(cp.heroes[0] ?? 'mountain')), confirmed: true },
    ];
    this.startStage({ ...cp, heroes: cp.heroes.slice(0, 1) });
  }

  openLab(): void {
    this.fromShell.value = true;
    this.fromCheckpoint = false;
    this.session.startArena(null);
    this.lab.visible.value = true;
    this.go('lab');
  }

  returnToVillage(): void {
    // M12: leaving a Wi-Fi game ends it for both players (results: it was finished).
    if (this.net.status.value !== 'idle')
      this.net.leave(this.lab.results.value ? 'finished' : 'left');
    this.pauseConfirm.value = null;
    this.ending.value = null;
    this.chapters.value = null;
    this.session.devices.userPaused = false;
    this.session.startArena(null);
    this.session.devices.assignPlayers([this.session.devices.slots[0]?.device ?? 'kb:p1', null]);
    this.partner.value = null;
    this.continued.value = null;
    this.fromCheckpoint = false;
    this.missionRun = null;
    this.session.pilot = null;
    this.session.afterStep.length = 0;
    // Session-scoped cheats are chosen again for every run.
    this.cheatDraft.value = { hero: [[], []], session: [] };
    this.cheatConsent.value = [];
    presentation.outfitTint = [];
    this.go('village');
  }

  /** Restart from Checkpoint (pause menu, after every player agreed). */
  restartFromCheckpoint(): void {
    const run = this.session.world.run;
    if (!run) return;
    const beat = run.checkpoint?.beat ?? run.startBeat;
    // A run from the start or from a checkpoint stays one; Lab practice stays practice.
    this.fromCheckpoint = run.startBeat === 0 || this.fromCheckpoint;
    const pick = this.stagePick.value;
    const heroes = [0, 1]
      .map((s) => this.session.world.playerHero[s])
      .filter((h): h is number => h !== undefined)
      .map((h) => HERO_ROSTER[h] ?? 'mountain');
    this.pauseConfirm.value = null;
    this.session.devices.userPaused = false;
    const c = this.session.world.cheats;
    const loadouts = this.loadoutsFor(heroes);
    this.session.startStage(STAGES[run.stage]!.id, pick.difficulty, beat, heroes, {
      loadouts,
      cheats: c.marked
        ? { hero: c.hero, session: c.session, marked: true, firstBeat: c.firstBeat }
        : undefined,
    });
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
    // Local-Wi-Fi co-op keeps no continuable checkpoint (decision log, 2026-10-31).
    if (run.checkpoint && !this.net.active) {
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
              cheats: this.worldCheats(),
              loadout: heroes.map((h, slot) => equippedTechniques(this.profileOf(slot), h)),
            }),
        );
      }
    }
    if (results && !this.resultsRecorded) {
      this.resultsRecorded = true;
      // M15: once per Wi-Fi session on this computer, whatever rejoins or takeovers
      // replaced the world in between (no duplicated or lost results).
      if (this.net.active) this.net.noteCredit();
      // M13: the ending plays first (not in Wi-Fi games, where each player skips alone).
      if (!this.net.active && stage.id === 'stage1')
        this.ending.value = {
          stage: 'stage1',
          workersFreed: run.stats.workersFreed,
          workersTotal: run.workersTotal,
          clues: run.stats.clues,
          cluesTotal: run.cluesTotal,
        };
      // M22: the Stage 2 chapters follow the epilogue cards (story state: the grade).
      if (!this.net.active && stage.id === 'stage2')
        this.chapters.value = {
          stage: 'stage2',
          preservation: Math.max(
            0,
            (GREENHOUSE?.grades ?? []).findIndex((g) => g.id === results.preservation?.grade),
          ),
        };
      // M28: Stage 3's Paths through the Mist follows its epilogue cards (story state: how
      // many rescue groups ended Critical, for the E03 insert).
      if (!this.net.active && stage.id === 'stage3')
        this.chapters.value = {
          stage: 'stage3',
          rescueCritical: (results.journey?.rescues ?? []).filter(
            (r) => !r.branch && r.stateId === 'critical',
          ).length,
        };
      const heroes = this.session.world.playerHero
        .slice(0, this.playerCount() || 1)
        .map((h) => HERO_ROSTER[h] ?? 'mountain');
      // M26: every finished story run enters the Run Archive, labelled (a practice run from
      // a later beat, a Cheat-Assisted, Continued or Open Loadout run never masquerades as
      // a competitive score).
      const practice = !runCompletesStage(results.startBeat, this.fromCheckpoint);
      const archived = {
        contentId: contentIdOf(stage.id),
        packageVersion: 1,
        mode: 'story' as const,
        canon: 'canonical' as const,
        outcome: 'cleared' as const,
        grade: results.overall,
        points: results.points,
        difficulty: DIFFICULTIES[results.difficulty]?.id ?? 'medium',
        heroes,
        players: heroes.length,
        timeFrames: results.stats.frames,
        labels: this.runLabels(
          results.cheatAssisted,
          !!this.continued.value || (results.startBeat > 0 && !practice),
          practice,
          heroes,
        ),
        gameVersion: this.gameVersion,
      };
      const record = (x: Profile) => {
        archiveRun(x, archived);
        // A practice run from a later beat or a Cheat-Assisted run is not a clear record.
        if (results.startBeat > 0 || results.cheatAssisted) {
          x.checkpoint = null;
          return;
        }
        recordClear(
          x,
          contentIdOf(stage.id),
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
      // M21: a full run completes the stage, Cheat-Assisted included (story progress is
      // narrative): it opens the next stage and its Museum, Dossier and research entries.
      const complete = (x: Profile) => {
        if (!runCompletesStage(results.startBeat, this.fromCheckpoint)) return;
        const c = completeStage(x, stage.id, results);
        if (x.id === p.id) this.completion.value = c;
      };
      this.update((x) => {
        complete(x);
        record(x);
      });
      if (this.partner.value && !this.partner.value.guest)
        this.update((x) => {
          complete(x);
          record(x);
        }, 1);
      this.settle(results, heroes);
    }
  }

  /** M11: payout, records, Hero Mastery and achievements for every player of the run. */
  private settle(results: StageResults, heroes: string[]): void {
    const stage = STAGES.find((s) => s.id === results.stage);
    const mode = heroes.length > 1 ? 'coop' : 'solo';
    const loadout = heroes.flatMap((h, slot) => equippedTechniques(this.profileOf(slot), h));
    const out: (Settlement | null)[] = [];
    heroes.forEach((hero, slot) => {
      const p = this.profileOf(slot);
      const own = this.profileSlot(slot);
      if (!p) {
        out.push(null);
        return;
      }
      const report = {
        contentId: contentIdOf(stage?.id ?? results.stage),
        results,
        mode,
        heroes,
        hero,
        loadout,
        gameVersion: this.gameVersion,
      } as const;
      // A Guest sees what the run is worth but keeps nothing.
      if (p.guest) {
        out.push(settleRun(structuredClone(p), report));
        return;
      }
      let s: Settlement | null = null;
      this.update((x) => (s = settleRun(x, report)), own);
      out.push(s);
    });
    this.settlement.value = out;
  }

  /** M21: the results lines of what the run completed. */
  completionLines(): string[] {
    const c = this.completion.value;
    if (!c) return [];
    const out = c.opened.map((s) => t('m21.stageOpened', { stage: stageName(s) }));
    const museum = c.unlocked.filter((id) => MUSEUM.some((m) => m.id === id)).length;
    if (museum > 0) out.push(t('m21.museumNew', { n: museum }));
    const dossier = c.unlocked.filter((id) => DOSSIER.some((d) => d.id === id)).length;
    if (dossier > 0) out.push(t('m21.dossierNew'));
    return out;
  }

  /** A lesson state was reached: say so, with the Credits it paid. */
  announceLesson(state: string, credits: number): void {
    const key =
      state === 'mastered'
        ? 'lesson.mastered'
        : state === 'certified'
          ? 'lesson.certified'
          : 'lesson.practiced';
    this.showToast(t(key, { n: credits }));
  }

  /** The default name of the n-th saved combo. */
  comboName(n: number): string {
    return t('combos.defaultName', { n });
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
  presentation.particles = s.particles;
  audio.setVolumes({
    master: s.volumeMaster / 100,
    music: s.volumeMusic / 100,
    effects: s.volumeEffects / 100,
    voice: s.volumeVoice / 100,
    ambience: s.volumeAmbience / 100,
    interface: s.volumeInterface / 100,
  });
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
