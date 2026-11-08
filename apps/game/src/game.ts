import {
  type FacingMode,
  MoveState,
  type TrainerSettings,
  type RecipeDef,
  fx,
  heroOf,
  type Fighter,
  type FrameInput,
  SIM_HZ,
  type World,
  createAccumulator,
  createWorld,
  escapeOpen,
  hashWorld,
  type Projectile,
  type Item,
  type Environment,
  type Encounter,
  HEROES,
  armDummy,
  resetArmory,
  resetEnvironment,
  setFacingMode,
  setHero,
  applyHeroChoices,
  step,
  type CoopState,
  type StageRun,
  STAGES,
  METER,
  type WorldOptions,
  type Pursuit,
  type Greenhouse,
  ROOMS,
  greenhouseHint,
  CORRIDORS,
  actionable,
  proxyInput,
  restoreWorld,
  snapshotWorld,
} from '@ffp/sim';

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DeviceHub,
  KeyLabelSource,
  type KeyboardP2Preset,
  keyboardP2,
  type SimHooks,
} from '@ffp/platform';

/** Max simulation steps per render frame; any further debt is dropped (tab was hidden). */
export const MAX_STEPS_PER_FRAME = 5;
/** Training dummies in the M1 Lab stage. */
export const LAB_DUMMIES = 2;

/** What the renderer draws: the last two simulation states and how far between them we are. */
export interface RenderSnapshot {
  previous: readonly Fighter[];
  current: readonly Fighter[];
  alpha: number;
  /** Projectiles in flight (current state; they are not interpolated). */
  projectiles: readonly Projectile[];
  /** Held heroes whose Grab escape window is open this frame (the telegraph). */
  escapeOpen: ReadonlySet<number>;
  /** Simulation frame of `current`. */
  frame: number;
  /** Weapons and fragments (current state). */
  items: readonly Item[];
  /** Scenery: the pillar, the sluice boards and the cog (current state). */
  environment: Environment;
  /** M7 arena mode: the encounter (waves, view, boss, devices), or null in the Lab. */
  encounter: Encounter | null;
  /** Stage width in pixels (the arena width; 1920 in the Lab). */
  stageWidth: number;
  /** Changes whenever the session replaces its world (arena start, restart, Lab). */
  generation: number;
  /** M8 co-op: the invitation, the last co-op event and telemetry (current state). */
  coop: CoopState;
  /** M9 stage journey: beat, locks, workers, food, checkpoint and counters (or null). */
  run: StageRun | null;
  /** M17 mounted pursuit (or null). */
  pursuit: Pursuit | null;
  /** M18 greenhouse room (or null) and each standing hero's Interact prompt there. */
  greenhouse: Greenhouse | null;
  greenhouseHints: readonly { x: number; z: number; hint: number }[];
  /** M17: the run is Cheat-Assisted; the Lab's infinite Attack Bar is on. */
  cheatAssisted: boolean;
  infiniteMeter: boolean;
}

/**
 * LAN co-op: while set, the session steps with the partner's game (M12 lockstep, M15
 * prediction and rollback; see apps/game/src/net/netplay.ts). This game's player is always
 * the local Player 1 device; in the world it plays slot `localSlot`.
 */
export interface NetDriver {
  readonly localSlot: number;
  /** Once per render frame before stepping: timers, and pause or focus requests. */
  poll(): void;
  /**
   * Re-simulates what late inputs corrected, then up to `steps` new frames: `sample`
   * reads this computer's input, `before` runs before every new frame. Returns the inputs
   * of every new frame.
   */
  advance(steps: number, sample: () => FrameInput, before: () => void): FrameInput[][];
}

export interface FrameReport {
  frame: number;
  hash: number;
  paused: boolean;
  /** Inputs fed to the simulation during this render frame: steps × players. */
  inputs: FrameInput[][];
}

/**
 * Owns the simulation, the input devices and the fixed-step accumulator. The renderer
 * only reads snapshots; it never writes to the world. While the hub reports a pause
 * (user pause or a lost controller) the simulation does not step at all.
 */
export class GameSession {
  world: World;
  readonly labels = new KeyLabelSource();
  readonly devices = new DeviceHub({
    keyboardP1: DEFAULT_KEYBOARD_P1,
    keyboardP2: keyboardP2('numpad'),
    gamepad: DEFAULT_GAMEPAD,
  });
  private readonly accumulator = createAccumulator({ hz: SIM_HZ, maxSteps: MAX_STEPS_PER_FRAME });
  private previous: Fighter[];
  private alpha = 0;
  private generation = 0;
  /**
   * Test hooks (dev and e2e builds): run before every simulation step, so browser tests
   * press keys on exact simulation frames however slowly the browser renders. A hook
   * that returns true is removed.
   */
  readonly stepHooks: (() => boolean | void)[] = [];
  /**
   * M10: while a shell screen (menus, briefing, results) is open the simulation does not
   * step at all; the world waits exactly where it is.
   */
  held = false;
  /**
   * M11 recipe playback: while set, Player 1's input comes from this pilot (Academy
   * demonstrations, My Combos playback); the player's own input is still sampled and
   * passed in, so a press can stop the playback.
   */
  pilot: ((world: World, own: FrameInput) => FrameInput) | null = null;
  /** M11: run after every simulation step (Academy lesson goals). */
  readonly afterStep: ((world: World) => void)[] = [];
  /** M12: the Wi-Fi lockstep driver (null: solo and same-device play). */
  net: NetDriver | null = null;

  constructor(
    private readonly seed: number,
    private readonly trainer: Partial<TrainerSettings> = {},
  ) {
    this.world = this.labWorld();
    this.previous = cloneFighters(this.world.bodies);
    this.generation += 1;
  }

  /**
   * M11 Academy and Free Practice: the Lab's mill corner with one training enemy in front
   * of Player 1, the hero and loadout picked, and (Cheat Practice only) cheats.
   */
  startPractice(options: {
    hero: string;
    loadout?: WorldOptions['loadouts'];
    cheats?: WorldOptions['cheats'];
    trainer?: Partial<TrainerSettings>;
    meter?: number;
  }): void {
    this.world = createWorld(this.seed, {
      dummies: 1,
      armory: true,
      environment: true,
      heroes: [options.hero],
      loadouts: options.loadout,
      cheats: options.cheats,
      trainer: { ...this.trainer, ...options.trainer },
    });
    const h = heroOf(this.world, 0);
    const d = this.world.bodies.find((b) => b.team === 'enemy');
    if (h && d) this.placeHero(0, d, 160);
    if (h && options.meter) h.meter = Math.trunc((METER.max * options.meter) / 100);
    this.previous = cloneFighters(this.world.bodies);
    this.generation += 1;
  }

  /** M6: the Lab is the mill corner, with its two weapons and its scenery. */
  private labWorld(): World {
    return createWorld(this.seed, {
      dummies: LAB_DUMMIES,
      trainer: this.trainer,
      armory: true,
      environment: true,
    });
  }

  /**
   * M7 arena mode: a fresh world for `arena` at `difficulty` (ids from the arena table),
   * or the Lab again when `arena` is null. Player heroes keep their selection.
   */
  startArena(
    arena: string | null,
    difficulty = 'medium',
    beat = 0,
    extra: Pick<WorldOptions, 'loadouts' | 'cheats' | 'heroes' | 'steeringAssist'> = {},
    seed = this.seed,
  ): void {
    const heroes = [0, 1].map((slot) => heroOf(this.world, slot)?.hero);
    // M9: a stage id starts the stage journey (from `beat` when practising a later beat).
    const stage = arena !== null && STAGES.some((s) => s.id === arena);
    // M17: a corridor id starts a mounted pursuit with the heroes on stage.
    const corridor = arena !== null && CORRIDORS.some((c) => c.id === arena);
    // M18: a greenhouse room id starts that room with the heroes on stage.
    const room = arena !== null && ROOMS.some((r) => r.id === arena);
    const players = heroes.flatMap((h) => (h === undefined ? [] : [HEROES[h]?.id ?? 'mountain']));
    this.world = stage
      ? createWorld(seed, { stage: arena, difficulty, beat, ...extra })
      : corridor
        ? createWorld(seed, {
            pursuit: arena,
            difficulty,
            heroes: extra.heroes ?? players,
            ...extra,
          })
        : room
          ? createWorld(seed, {
              greenhouse: arena,
              difficulty,
              heroes: extra.heroes ?? players,
              ...extra,
            })
          : arena
            ? createWorld(seed, { arena, difficulty, ...extra })
            : this.labWorld();
    // The heroes carry over from the previous world unless the caller chose them.
    if (!extra.heroes)
      heroes.forEach((h, slot) => {
        const id = h === undefined ? undefined : HEROES[h]?.id;
        if (id && heroOf(this.world, slot)) setHero(this.world, slot, id);
      });
    this.previous = cloneFighters(this.world.bodies);
    this.generation += 1;
  }

  /** Lab: the training enemy's script (who attacks, which attack, how often). */
  setTrainer(settings: Partial<TrainerSettings>): void {
    Object.assign(this.world.trainer, settings);
    for (const d of this.world.bodies)
      if (d.team === 'enemy') d.aiTimer = this.world.trainer.interval;
  }

  /** Advances by the wall time since the last render frame. Pads must be polled first. */
  advance(elapsedMs: number): FrameReport {
    if (this.net) return this.advanceNet(this.net, elapsedMs);
    this.devices.poll();
    const paused = this.devices.paused || this.held;
    // While paused the accumulator is not fed, so no time debt builds up.
    const { steps, alpha } = this.accumulator.advance(paused ? 0 : elapsedMs);
    const inputs: FrameInput[][] = [];
    for (let i = 0; i < (paused ? 0 : steps); i += 1) {
      this.runStepHooks();
      if (this.devices.paused) break; // a test hook paused the game on this exact step
      this.previous = cloneFighters(this.world.bodies);
      const frame = this.devices.sampleFrame();
      if (this.pilot) frame[0] = this.pilot(this.world, frame[0] ?? IDLE);
      inputs.push(frame);
      step(this.world, frame);
      for (const after of this.afterStep) after(this.world);
    }
    if (!paused) this.alpha = alpha;
    return {
      frame: this.world.frame,
      hash: hashWorld(this.world),
      paused: this.devices.paused,
      inputs,
    };
  }

  /**
   * Wi-Fi play: the driver predicts the partner's late input, rolls back and re-simulates
   * when it arrives, and steps new frames with this computer's input applied at once.
   * Pauses are network holds (the driver handles them).
   */
  private advanceNet(net: NetDriver, elapsedMs: number): FrameReport {
    this.devices.poll();
    net.poll();
    const { steps, alpha } = this.accumulator.advance(this.held ? 0 : elapsedMs);
    const inputs = net.advance(
      this.held ? 0 : steps,
      () => this.devices.sampleFrame()[0] ?? IDLE,
      () => this.runStepHooks(),
    );
    this.alpha = alpha;
    return { frame: this.world.frame, hash: hashWorld(this.world), paused: false, inputs };
  }

  /** M12: the partner's snapshot replaces the world (resynchronisation). */
  replaceWorld(world: World): void {
    this.world = world;
    this.previous = cloneFighters(world.bodies);
    this.generation += 1;
  }

  /** M15: the renderer starts over (the world jumped to an authoritative snapshot). */
  worldReplaced(): void {
    this.previous = cloneFighters(this.world.bodies);
    this.generation += 1;
  }

  /**
   * M15: the simulation as the rollback session sees it. Saves are full copies of the
   * world (plain data); loading one never shares objects with the save.
   */
  netHooks(): SimHooks<World> {
    return {
      frame: () => this.world.frame,
      save: () => structuredClone(this.world),
      load: (w) => {
        this.world = structuredClone(w);
        this.previous = cloneFighters(this.world.bodies);
      },
      step: (inputs) => {
        this.previous = cloneFighters(this.world.bodies);
        step(this.world, inputs);
        for (const after of this.afterStep) after(this.world);
      },
      hash: (w) => hashWorld(w ?? this.world),
      snapshot: (w) => snapshotWorld(w ?? this.world),
      restore: (s) => restoreWorld(s),
      proxy: (slot, frames, handover) => proxyInput(this.world, slot, frames, handover),
      actionable: (slot) => actionable(this.world, slot),
    };
  }

  private runStepHooks(): void {
    for (const hook of [...this.stepHooks])
      if (hook()) this.stepHooks.splice(this.stepHooks.indexOf(hook), 1);
  }

  snapshot(): RenderSnapshot {
    const open = new Set<number>();
    for (const b of this.world.bodies) if (escapeOpen(this.world, b)) open.add(b.id);
    return {
      previous: this.previous,
      current: this.world.bodies,
      alpha: this.alpha,
      projectiles: this.world.projectiles,
      escapeOpen: open,
      frame: this.world.frame,
      items: this.world.items,
      environment: this.world.environment,
      encounter: this.world.encounter,
      stageWidth: Math.round(this.world.bounds.maxX / 256),
      generation: this.generation,
      coop: this.world.coop,
      run: this.world.run,
      pursuit: this.world.pursuit,
      greenhouse: this.world.greenhouse,
      greenhouseHints: this.world.greenhouse
        ? this.world.bodies
            .filter((f) => f.team === 'hero' && !f.ko)
            .map((f) => ({ x: f.x, z: f.z, hint: greenhouseHint(this.world, f) }))
        : [],
      cheatAssisted: this.world.cheats.marked,
      infiniteMeter: this.world.infiniteMeter,
    };
  }

  /**
   * M10: a stage from the shell, with each player's chosen hero. M11: each player's owned
   * loadout changes and the accepted cheats start with the run.
   */
  startStage(
    stage: string,
    difficulty: string,
    beat: number,
    heroes: readonly string[],
    extra: Pick<WorldOptions, 'loadouts' | 'cheats'> = {},
    seed = this.seed,
  ): void {
    this.startArena(stage, difficulty, beat, { ...extra, heroes }, seed);
    heroes.forEach((id, slot) => setHero(this.world, slot, id));
    // The stage opens with the chosen heroes, not the previous ones for a first step.
    applyHeroChoices(this.world);
    this.previous = cloneFighters(this.world.bodies);
  }

  setFacingMode(slot: number, mode: FacingMode): void {
    setFacingMode(this.world, slot, mode);
  }

  setHero(slot: number, heroId: string): void {
    setHero(this.world, slot, heroId);
  }

  /** Lab: puts Dummy 1 next to the right stage edge and Player 1 in front of it. */
  dummyToWall(): void {
    const d = this.world.bodies.find((b) => b.team === 'enemy');
    if (!d) return;
    resetBody(d);
    d.x = this.world.bounds.maxX - fx(60);
    this.placeHero(0, d, 80);
  }

  /**
   * Lab: sets up a recipe: the player's hero in front of Dummy 1 (further away for a
   * dash opener), and counter-hit dummies when the recipe needs them.
   */
  practise(slot: number, recipe: RecipeDef): boolean {
    const d = this.world.bodies.find((b) => b.team === 'enemy');
    if (!d) return false;
    resetBody(d);
    if (d.x > this.world.bounds.maxX - fx(400)) d.x = fx(1100);
    this.placeHero(slot, d, recipe.family === 'ground' ? 160 : 80);
    if (recipe.counterHit) this.world.dummy.counterHit = true;
    return this.world.dummy.counterHit;
  }

  /** Lab: Dummy 1 fights with a weapon (index, -1 = unarmed) and reclaims it. */
  armDummy(weapon: number): void {
    armDummy(this.world, weapon);
  }

  /** Lab: puts the stage's weapons back on their spots (and re-arms Dummy 1). */
  resetArmory(): void {
    resetArmory(this.world);
  }

  /** Lab: restores the pillar, the sluice boards and the cog. */
  resetEnvironment(): void {
    resetEnvironment(this.world);
  }

  /** Lab: Dummy 1 just in front of the stone pillar, Player 1 in front of the dummy. */
  dummyToPillar(): void {
    const d = this.world.bodies.find((b) => b.team === 'enemy');
    const pillar = this.world.environment.surfaces[0];
    if (!d || !pillar) return;
    resetBody(d);
    d.x = pillar.x - pillar.hw - fx(70);
    d.z = pillar.z;
    this.placeHero(0, d, 110);
  }

  private placeHero(slot: number, d: Fighter, gap: number): void {
    const h = heroOf(this.world, slot);
    if (!h) return;
    h.x = d.x - fx(gap);
    h.z = d.z;
    h.facing = 1;
  }

  setKeyboardP2Preset(preset: KeyboardP2Preset): void {
    this.devices.keyboardP2.setBindings(keyboardP2(preset));
  }
}

/** Lab reset of a training dummy: standing, idle, combo closed. */
function resetBody(d: Fighter): void {
  d.state = MoveState.Idle;
  d.stateFrame = 0;
  d.stun = 0;
  d.y = 0;
  d.vx = 0;
  d.vy = 0;
  d.vz = 0;
  d.protectedRecovery = false;
  d.groundWindow = 0;
  d.action = -1;
  d.bounce = 0;
  d.airRecover = false;
  d.ctx.open = false;
  d.health = d.maxHealth;
  d.cinematic = false;
  d.grabId = 0;
  d.grabbedBy = 0;
  d.thrownBy = 0;
}

function cloneFighters(bodies: readonly Fighter[]): Fighter[] {
  return bodies.map((b) => ({
    ...b,
    lastTap: [...b.lastTap] as Fighter['lastTap'],
    contactIds: [...b.contactIds],
    contactScales: [...b.contactScales],
    hitIds: [...b.hitIds],
    propHits: [...b.propHits],
    rewardIds: [...b.rewardIds],
    loadout: [...b.loadout],
    ctx: { ...b.ctx, route: [...b.ctx.route] },
  }));
}
