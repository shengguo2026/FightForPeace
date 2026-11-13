import { signal } from '@preact/signals';
import {
  ActionBit,
  HEROES,
  METER,
  cheatMask,
  heroOf,
  newPilot,
  newTracker,
  pilotInput,
  stepGuided,
  stepPhase,
  stepsFromIds,
  followShowcase,
  newFollow,
  newShowcase,
  noteLanded,
  showcaseInputs,
  showcasesOf,
  type FollowState,
  type ShowcaseDef,
  type ShowcaseState,
  type ShowcaseStep,
  type FrameInput,
  type LessonDef,
  type LessonGoal,
  type LessonTracker,
  type PilotState,
  type RecipeStep,
  type World,
  type WorldOptions,
} from '@ffp/sim';
import {
  ACADEMY_ROUTES,
  STORE,
  advanceLesson,
  itemDef,
  saveCombo,
  techniqueSlot,
  type LessonState,
  type MyCombo,
} from '@ffp/platform';
import type { Shell } from '../shell/shell';

/**
 * M11 Academy runner: lessons (Demonstration, Guided Practice, Independent Trial and the
 * optional Mastery Goal), Free Practice with technique trials and Cheat Practice, and My
 * Combos recording and playback. Everything here reads the world after each step; the
 * only inputs it makes are the playback pilot's, which go through the ordinary input path.
 */
export type LessonPhase = 'demo' | 'guided' | 'trial' | 'mastery' | 'done';

export interface LessonView {
  lesson: string;
  hero: string;
  phase: LessonPhase;
  goals: readonly LessonGoal[];
  met: LessonGoal[];
  done: number;
  count: number;
  /** Seconds left in a timed attempt, or null. */
  left: number | null;
  timeouts: number;
  /** The demonstration finished a playback (it loops until the player takes over). */
  demoPlays: number;
}

/** A finished combo in Free Practice, ready to save. */
export interface RecordedCombo {
  hero: string;
  steps: string[];
  timing: number[];
  hits: number;
  damage: number;
  cheats: string[];
  needs: string[];
}

/** M21 Move Preview: what the Preview screen shows. */
export interface PreviewView {
  hero: string;
  /** showcase, recipe or technique, and its id (store id for a technique). */
  kind: 'showcase' | 'recipe' | 'technique';
  id: string;
  name: string;
  partner: string | null;
  steps: readonly ShowcaseStep[];
  /** Steps that landed in the current playback or attempt. */
  landed: boolean[];
  /** The next step to land (steps.length when the route is complete). */
  current: number;
  mode: 'watch' | 'try';
  paused: boolean;
  half: boolean;
  /** Playbacks finished (watch) and complete attempts (try). */
  plays: number;
  performed: number;
}

export interface PracticeView {
  hero: string;
  cheats: string[];
  /** Name of the combo being played back, or null. */
  playing: string | null;
  /** The playback finished: the player's turn. */
  yourTurn: boolean;
  /** The played-back combo was performed by the player. */
  performed: number;
}

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

/** Every lesson of every route in order. */
export function allLessons(): LessonDef[] {
  return ACADEMY_ROUTES.flatMap((r) => [...r.lessons]);
}

export function lessonDef(id: string): LessonDef | undefined {
  return allLessons().find((l) => l.id === id);
}

/** Loadout changes for store technique ids (trials and playback may use unowned moves). */
export function trialLoadout(
  ids: readonly string[],
): NonNullable<WorldOptions['loadouts']>[number] {
  return ids
    .map(itemDef)
    .filter((i): i is NonNullable<typeof i> => !!i && i.group === 'technique')
    .map((i) => ({
      kind: i.kind as 'special' | 'ultimate',
      dir: techniqueSlot(i),
      action: i.action,
    }));
}

/** Store ids of the catalogue techniques a list of action ids needs. */
export function techniquesNeeded(hero: string, steps: readonly string[]): string[] {
  return STORE.filter(
    (s) => s.group === 'technique' && s.hero === hero && steps.includes(s.action ?? ''),
  ).map((s) => s.id);
}

export class Academy {
  readonly lesson = signal<LessonView | null>(null);
  readonly practice = signal<PracticeView | null>(null);
  readonly lastCombo = signal<RecordedCombo | null>(null);

  private def: LessonDef | null = null;
  private hero = 'mountain';
  private tracker: LessonTracker | null = null;
  private pilotState: PilotState = newPilot();
  private steps: RecipeStep[] = [];
  private demoIdle = 0;
  private toPractice = false;
  // Free Practice recording.
  private recOpen = false;
  private recRoute: number[] = [];
  private recTiming: number[] = [];
  private recLastFrame = 0;
  private recHits = 0;
  private recDamage = 0;
  private playback: MyCombo | null = null;
  private practiceCheats: string[] = [];
  private practiceTrial: string[] = [];
  readonly preview = signal<PreviewView | null>(null);
  /** Where the Preview returns to. */
  previewFrom: 'academy' | 'store' | 'movelist' = 'movelist';
  private sc: ShowcaseDef | null = null;
  private scState: ShowcaseState | null = null;
  private follow: FollowState | null = null;
  private partnerInput: FrameInput = IDLE;
  private previewIdle = 0;
  private stepUntil = -1;
  private wantTry = false;

  constructor(private readonly shell: Shell) {}

  // --- lessons ----------------------------------------------------------------------------

  /** The lesson state of Player 1's profile (Guests keep their states for the session). */
  stateOf(id: string): LessonState {
    return this.shell.active.value?.progress.academy[id] ?? 'available';
  }

  startLesson(id: string): void {
    const def = lessonDef(id);
    if (!def) return;
    this.def = def;
    this.hero = def.hero ?? this.shell.practice.value.hero;
    this.toPractice = false;
    this.lessonWorld();
    const view: LessonView = {
      lesson: id,
      hero: this.hero,
      phase: def.demo || def.drill?.showcase ? 'demo' : 'guided',
      goals: def.guided,
      met: [],
      done: 0,
      count: 1,
      left: null,
      timeouts: 0,
      demoPlays: 0,
    };
    this.lesson.value = view;
    this.install((w) => this.lessonStep(w));
    if (def.demo || def.drill?.showcase) this.startDemo();
    this.shell.go('lesson');
  }

  /** Restart the current lesson phase from a fresh practice yard. */
  restartLesson(): void {
    const v = this.lesson.value;
    if (!v || !this.def) return;
    this.lessonWorld();
    this.lesson.value = { ...v, met: [], done: 0, left: null };
    if (v.phase === 'demo') this.startDemo();
  }

  leaveLesson(): void {
    this.uninstall();
    this.lesson.value = null;
    this.def = null;
    this.shell.session.startArena(null);
    this.shell.go('academy');
  }

  private lessonWorld(): void {
    const def = this.def!;
    const drill = def.drill;
    const s = this.shell.session;
    s.partnerPilot = null;
    if (drill?.room || drill?.corridor) {
      // M21 drill: a Stage 2 test room or corridor on Easy with the lesson's hero.
      s.startArena(drill.room ?? drill.corridor, 'easy', 0, {
        heroes: [this.hero],
        loadouts: this.shell.loadoutsFor([this.hero]),
      });
      this.tracker = newTracker(s.world, 0);
      return;
    }
    if (drill?.showcase) {
      // M21 pair drill: the practice yard with the showcase's demonstration partner, who
      // answers the player's part of the route.
      const sc = showcasesOf(this.hero).find((x) => x.id === drill.showcase) ?? null;
      s.startShowcase(this.hero, sc, this.shell.loadoutsFor([this.hero]));
      const h = heroOf(s.world, 0);
      const p = heroOf(s.world, 1);
      for (const x of [h, p])
        if (x && def.meter) x.meter = Math.trunc((METER.max * def.meter) / 100);
      if (sc) {
        const follow = newFollow(sc.steps);
        s.partnerPilot = (world) => followShowcase(world, sc.steps, follow);
      }
      this.tracker = newTracker(s.world, 0);
      return;
    }
    this.shell.session.startPractice({
      hero: this.hero,
      loadout: this.shell.loadoutsFor([this.hero]),
      trainer: def.trainer
        ? { attackers: 1, pattern: -1, interval: 70, approach: true, arm: -1 }
        : { attackers: 0 },
      meter: def.meter,
    });
    this.tracker = newTracker(this.shell.session.world, 0);
  }

  private startDemo(): void {
    const drill = this.def?.drill;
    if (drill?.showcase) {
      // A pair drill demonstrates its showcase with both heroes.
      const sc = showcasesOf(this.hero).find((x) => x.id === drill.showcase);
      if (sc) {
        const st = newShowcase(sc.steps);
        this.pilotState = newPilot();
        this.demoIdle = 0;
        let partner = IDLE;
        this.shell.session.partnerPilot = () => partner;
        this.shell.session.pilot = (world, own) => {
          if (own.pressed & ActionBit.Attack) {
            this.toPractice = true;
            return IDLE;
          }
          const inputs = showcaseInputs(world, sc.steps, st);
          partner = inputs[1];
          if (st.done) this.pilotState.done = true;
          return inputs[0];
        };
        const after = (world: World) => noteLanded(world, sc.steps, st);
        this.shell.session.afterStep.push(after);
        return;
      }
    }
    const kit = HEROES.find((h) => h.id === this.hero)!;
    const recipe = kit.recipes.find((r) => r.id === this.def?.demo);
    this.steps = recipe ? [...recipe.steps] : [];
    this.pilotState = newPilot();
    this.demoIdle = 0;
    this.shell.session.pilot = (world, own) => {
      if (own.pressed & ActionBit.Attack) {
        this.toPractice = true;
        return IDLE;
      }
      return pilotInput(world, 0, this.steps, this.pilotState);
    };
  }

  private lessonStep(world: World): void {
    const v = this.lesson.value;
    const def = this.def;
    if (!v || !def || !this.tracker) return;
    const next: LessonView = { ...v };
    if (def.meter > 0)
      for (const slot of [0, 1]) {
        const h = heroOf(world, slot);
        if (h && h.action < 0 && h.meter < METER.max) h.meter = METER.max;
      }
    switch (v.phase) {
      case 'demo': {
        if (this.toPractice) {
          this.toPractice = false;
          this.shell.session.pilot = null;
          this.shell.session.afterStep.length = 1;
          this.lessonWorld();
          this.lesson.value = {
            ...next,
            phase: 'guided',
            goals: def.guided,
            met: [],
            done: 0,
            count: 1,
          };
          return;
        }
        if (this.pilotState.done) {
          this.demoIdle += 1;
          if (this.demoIdle > 90) {
            // Play the demonstration again from a fresh yard.
            this.shell.session.afterStep.length = 1;
            this.lessonWorld();
            this.startDemo();
            next.demoPlays += 1;
          }
        }
        break;
      }
      case 'guided': {
        if (stepGuided(world, 0, this.tracker, def.guided, def.recipe)) {
          this.award('practiced');
          this.tracker = newTracker(world, 0);
          Object.assign(next, {
            phase: 'trial',
            goals: def.trial.goals,
            met: [],
            done: 0,
            count: def.trial.count,
          });
        } else next.met = [...this.tracker.met];
        break;
      }
      case 'trial':
      case 'mastery': {
        const phase = v.phase === 'trial' ? def.trial : def.mastery;
        const r = stepPhase(world, 0, this.tracker, phase, def.recipe);
        if (r === 'complete') {
          if (v.phase === 'trial') {
            this.award('certified');
            this.tracker = newTracker(world, 0);
            Object.assign(next, {
              phase: 'mastery',
              goals: def.mastery.goals,
              met: [],
              done: 0,
              count: def.mastery.count,
              left: null,
            });
          } else {
            this.award('mastered');
            Object.assign(next, {
              phase: 'done',
              met: [...phase.goals],
              done: phase.count,
              left: null,
            });
          }
          break;
        }
        if (r === 'timeout') next.timeouts += 1;
        next.met = [...this.tracker.met];
        next.done = this.tracker.done;
        next.left =
          phase.frames > 0
            ? Math.max(0, Math.ceil((phase.frames - (world.frame - this.tracker.since)) / 60))
            : null;
        break;
      }
      case 'done':
        break;
    }
    if (JSON.stringify(next) !== JSON.stringify(v)) this.lesson.value = next;
  }

  /** Raises the lesson state on Player 1's profile and announces the Credits. */
  private award(state: LessonState): void {
    const id = this.def!.id;
    const p = this.shell.active.value;
    if (!p) return;
    let credits = 0;
    if (p.guest) {
      // A Guest keeps lesson states for the session only and earns nothing.
      this.shell.active.value = {
        ...p,
        progress: { ...p.progress, academy: { ...p.progress.academy, [id]: state } },
      };
    } else this.shell.update((x) => (credits = advanceLesson(x, id, state).credits));
    this.shell.announceLesson(state, credits);
  }

  // --- Free Practice and My Combos --------------------------------------------------------

  /** Free Practice with the set-up's hero, technique trials and Cheat Practice codes. */
  startPractice(): void {
    const set = this.shell.practice.value;
    this.hero = set.hero;
    this.practiceCheats = [...set.cheats];
    this.practiceTrial = [...set.trial];
    this.playback = null;
    this.practiceWorld();
    this.install((w) => this.practiceStep(w));
    this.shell.go('practice');
  }

  /** Plays a saved combo through its hero, then hands over to the player. */
  playCombo(id: string): void {
    const c = this.shell.active.value?.progress.combos.find((x) => x.id === id);
    if (!c) return;
    this.hero = c.hero;
    this.practiceCheats = [...c.cheats];
    this.practiceTrial = [...c.needs];
    this.playback = c;
    this.practiceWorld();
    const kit = HEROES.find((h) => h.id === c.hero)!;
    this.steps = stepsFromIds(kit.actions, c.steps);
    this.pilotState = newPilot();
    this.shell.session.pilot = (world) => {
      const input = pilotInput(world, 0, this.steps, this.pilotState);
      if (this.pilotState.done) {
        this.shell.session.pilot = null;
        const pv = this.practice.value;
        if (pv) this.practice.value = { ...pv, yourTurn: true };
      }
      return input;
    };
    this.install((w) => this.practiceStep(w));
    this.shell.go('practice');
  }

  leavePractice(to: 'academy' | 'combos' = 'academy'): void {
    this.uninstall();
    this.practice.value = null;
    this.playback = null;
    this.shell.session.startArena(null);
    this.shell.go(to);
  }

  /** Saves the last recorded combo to Player 1's My Combos. */
  saveLastCombo(): string | null {
    const c = this.lastCombo.value;
    const p = this.shell.active.value;
    if (!c || !p || p.guest) return null;
    let id: string | null = null;
    const n = p.progress.combos.length + 1;
    this.shell.update((x) => (id = saveCombo(x, { ...c, name: this.shell.comboName(n) })));
    if (id) this.lastCombo.value = null;
    return id;
  }

  private practiceWorld(): void {
    const hero = this.hero;
    const owned = this.shell.loadoutsFor([hero])[0] ?? [];
    const trial = trialLoadout(this.practiceTrial);
    // A trial replaces the owned move in the same slot.
    const loadout = [
      ...owned.filter((o) => !trial.some((t) => t.kind === o.kind && t.dir === o.dir)),
      ...trial,
    ];
    const cheats = this.practiceCheats.length
      ? {
          hero: [cheatMask(this.practiceCheats, 'hero')],
          session: cheatMask(this.practiceCheats, 'session'),
        }
      : undefined;
    this.shell.session.startPractice({
      hero,
      loadout: [loadout],
      cheats,
      trainer: { attackers: 0 },
    });
    this.recOpen = false;
    this.recRoute = [];
    this.practice.value = {
      hero,
      cheats: [...this.practiceCheats],
      playing: this.playback?.name ?? null,
      yourTurn: false,
      performed: this.practice.value?.performed ?? 0,
    };
  }

  private practiceStep(world: World): void {
    const h = heroOf(world, 0);
    if (!h) return;
    const d = world.bodies.find((b) => b.team !== h.team);
    if (!d) return;
    if (d.ctx.open) {
      if (!this.recOpen) {
        this.recOpen = true;
        this.recRoute = [];
        this.recTiming = [];
        this.recLastFrame = world.frame;
      }
      while (this.recRoute.length < d.ctx.route.length) {
        this.recRoute.push(d.ctx.route[this.recRoute.length]!);
        this.recTiming.push(this.recRoute.length === 1 ? 0 : world.frame - this.recLastFrame);
        this.recLastFrame = world.frame;
      }
      this.recHits = d.ctx.hits;
      this.recDamage = d.ctx.damage;
      return;
    }
    if (!this.recOpen) return;
    this.recOpen = false;
    const kit = HEROES[h.hero];
    if (!kit) return;
    const steps: string[] = [];
    const timing: number[] = [];
    let prevAir = false;
    this.recRoute.forEach((code, i) => {
      if (Math.trunc(code / 64) !== h.hero) return;
      const a = kit.actions[code % 64];
      if (!a) return;
      const air = a.context === 'air';
      if (air && !prevAir) {
        steps.push('jump');
        timing.push(0);
      }
      prevAir = air;
      steps.push(a.id);
      timing.push(this.recTiming[i] ?? 0);
    });
    const attacks = steps.filter((s) => s !== 'jump');
    if (attacks.length < 2) return;
    const combo: RecordedCombo = {
      hero: kit.id,
      steps,
      timing,
      hits: this.recHits,
      damage: this.recDamage,
      cheats: [...this.practiceCheats],
      needs: techniquesNeeded(kit.id, steps),
    };
    this.lastCombo.value = combo;
    // Practising a played-back combo: did the player perform it?
    const pb = this.playback;
    const pv = this.practice.value;
    if (pb && pv?.yourTurn) {
      const want = pb.steps.filter((s) => s !== 'jump').join(' ');
      if (attacks.join(' ') === want) this.practice.value = { ...pv, performed: pv.performed + 1 };
    }
  }

  // --- hooks --------------------------------------------------------------------------------

  private install(fn: (w: World) => void): void {
    const s = this.shell.session;
    s.afterStep.length = 0;
    s.afterStep.push(fn);
  }

  private uninstall(): void {
    const s = this.shell.session;
    s.afterStep.length = 0;
    s.pilot = null;
    s.partnerPilot = null;
    s.speed = 1;
    s.held = false;
  }

  // --- M21 Move Preview -----------------------------------------------------------------

  /** The route a Preview plays: a showcase, a recipe or one catalogue technique. */
  private routeOf(
    hero: string,
    kind: PreviewView['kind'],
    id: string,
  ): { sc: ShowcaseDef; name: string; trial: string[]; counterHit: boolean } | null {
    const kit = HEROES.find((h) => h.id === hero);
    if (!kit) return null;
    if (kind === 'showcase') {
      const sc = showcasesOf(hero).find((x) => x.id === id);
      return sc ? { sc, name: sc.name, trial: [], counterHit: false } : null;
    }
    if (kind === 'recipe') {
      const r = kit.recipes.find((x) => x.id === id);
      if (!r) return null;
      const steps = r.steps.map((s) => ({ slot: 0, jump: s.jump, team: false, any: [...s.any] }));
      return {
        sc: { id: r.id, name: r.name, meter: 0, partner: null, steps },
        name: r.name,
        trial: [],
        counterHit: r.counterHit,
      };
    }
    const item = itemDef(id);
    const ai = kit.actions.findIndex((a) => a.id === item?.action);
    if (!item || ai < 0) return null;
    const a = kit.actions[ai]!;
    return {
      sc: {
        id,
        name: a.name,
        meter: item.kind === 'ultimate' ? 100 : 50,
        partner: null,
        steps: [{ slot: 0, jump: false, team: false, any: [ai] }],
      },
      name: a.name,
      trial: [id],
      counterHit: false,
    };
  }

  /** Opens the Preview: the route loops on a training dummy until the player tries it. */
  startPreview(
    hero: string,
    kind: PreviewView['kind'],
    id: string,
    from: Academy['previewFrom'],
  ): void {
    const r = this.routeOf(hero, kind, id);
    if (!r) return;
    this.previewFrom = from;
    this.hero = hero;
    this.sc = r.sc;
    this.practiceTrial = r.trial;
    this.preview.value = {
      hero,
      kind,
      id,
      name: r.name,
      partner: r.sc.partner,
      steps: r.sc.steps,
      landed: r.sc.steps.map(() => false),
      current: 0,
      mode: 'watch',
      paused: false,
      half: false,
      plays: 0,
      performed: 0,
    };
    this.watchWorld(r.counterHit);
    this.shell.go('preview');
  }

  private previewWorld(counterHit: boolean): void {
    const s = this.shell.session;
    const owned = this.shell.loadoutsFor([this.hero])[0] ?? [];
    const trial = trialLoadout(this.practiceTrial);
    const loadout = [
      ...owned.filter((o) => !trial.some((t) => t.kind === o.kind && t.dir === o.dir)),
      ...trial,
    ];
    s.startShowcase(this.hero, this.sc, [loadout]);
    if (counterHit) s.world.dummy.counterHit = true;
    s.afterStep.length = 0;
    s.pilot = null;
    s.partnerPilot = null;
    this.previewIdle = 0;
  }

  private watchWorld(counterHit = false): void {
    const sc = this.sc!;
    this.previewWorld(counterHit);
    const st = newShowcase(sc.steps);
    this.scState = st;
    this.follow = null;
    const s = this.shell.session;
    s.pilot = (world, own) => {
      // As in a lesson's demonstration, Attack takes over: Try it.
      if (own.pressed & ActionBit.Attack) this.wantTry = true;
      const inputs = showcaseInputs(world, sc.steps, st);
      this.partnerInput = inputs[1];
      return inputs[0];
    };
    if (sc.partner) s.partnerPilot = () => this.partnerInput;
    s.afterStep.push((world) => this.previewStep(world));
  }

  private previewStep(world: World): void {
    const v = this.preview.value;
    const sc = this.sc;
    if (!v || !sc) return;
    if (v.mode === 'watch') {
      if (this.wantTry) {
        this.wantTry = false;
        this.tryIt();
        return;
      }
      const st = this.scState!;
      noteLanded(world, sc.steps, st);
      if (st.done) {
        this.previewIdle += 1;
        if (this.previewIdle > 70) {
          // Loop: the same route again from a fresh yard.
          this.watchWorld();
          this.preview.value = {
            ...v,
            plays: v.plays + 1,
            landed: sc.steps.map(() => false),
            current: 0,
          };
          return;
        }
      }
      // Step: pause again once the next step has landed.
      const landed = st.landed.map((f) => f >= 0);
      const count = landed.filter(Boolean).length;
      if (this.stepUntil >= 0 && (count >= this.stepUntil || st.done)) {
        this.stepUntil = -1;
        this.shell.session.held = true;
        this.update({ landed, current: st.step, paused: true });
        return;
      }
      this.update({ landed, current: Math.min(st.step, sc.steps.length) });
    } else {
      const f = this.follow!;
      noteLanded(world, sc.steps, f.route);
      const landed = f.route.landed.map((x) => x >= 0);
      this.update({ landed, current: f.route.step, performed: f.performed });
    }
  }

  private update(part: Partial<PreviewView>): void {
    const v = this.preview.value;
    if (!v) return;
    const next = { ...v, ...part };
    if (JSON.stringify(next) !== JSON.stringify(v)) this.preview.value = next;
  }

  togglePause(): void {
    const v = this.preview.value;
    if (!v) return;
    this.stepUntil = -1;
    this.shell.session.held = !v.paused;
    this.update({ paused: !v.paused });
  }

  /** Plays on until the next step lands, then pauses. */
  stepOnce(): void {
    const v = this.preview.value;
    if (!v || v.mode !== 'watch') return;
    this.stepUntil = v.landed.filter(Boolean).length + 1;
    this.shell.session.held = false;
    this.update({ paused: false });
  }

  toggleHalf(): void {
    const v = this.preview.value;
    if (!v) return;
    this.shell.session.speed = v.half ? 1 : 0.5;
    this.update({ half: !v.half });
  }

  /** Try it: the player performs the route; steps tick off as they land. */
  tryIt(): void {
    const v = this.preview.value;
    const sc = this.sc;
    if (!v || !sc) return;
    this.previewWorld(false);
    this.stepUntil = -1;
    this.shell.session.held = false;
    const f = newFollow(sc.steps);
    this.follow = f;
    if (sc.partner) this.shell.session.partnerPilot = (world) => followShowcase(world, sc.steps, f);
    else this.shell.session.afterStep.push((world) => void followShowcase(world, sc.steps, f));
    this.shell.session.afterStep.push((world) => this.previewStep(world));
    this.update({ mode: 'try', paused: false, landed: sc.steps.map(() => false), current: 0 });
  }

  /** Back to watching the route. */
  watchAgain(): void {
    if (!this.preview.value) return;
    this.stepUntil = -1;
    this.shell.session.held = false;
    this.watchWorld();
    this.update({
      mode: 'watch',
      paused: false,
      landed: this.sc!.steps.map(() => false),
      current: 0,
    });
  }

  leavePreview(): void {
    this.uninstall();
    this.preview.value = null;
    this.sc = null;
    this.scState = null;
    this.follow = null;
    this.practiceTrial = [];
    this.shell.session.startArena(null);
    this.shell.go(this.previewFrom);
  }
}
