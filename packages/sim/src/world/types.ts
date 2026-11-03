import type { RngState } from '../math/rng';

export type Facing = 1 | -1;
export type Axis = -1 | 0 | 1;

/** A physical body on the belt stage. All values are fixed point (1/256 px). */
export interface Body {
  id: number;
  /** Horizontal position along the stage. */
  x: number;
  /** Stage depth: smaller is further back (towards the top of the screen). */
  z: number;
  /** Height above the floor (jumps, launches). */
  y: number;
  facing: Facing;
}

/** One player's input for one simulation frame. */
export interface FrameInput {
  moveX: Axis;
  /** -1 = up (towards the back of the stage), 1 = down (towards the front). */
  moveZ: Axis;
  /** Bitmask of actions (ActionBit) newly pressed since the previous frame. */
  pressed: number;
  /** Bitmask of actions (ActionBit) held down at this frame. */
  held: number;
  /** Bitmask of directions (DirBit) newly pressed since the previous frame. */
  dirPressed: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Team = 'hero' | 'enemy';
export type FacingMode = 'manual' | 'assisted';

/** Movement states. Numbers are part of the encoded state; never renumber. */
export const MoveState = {
  Idle: 0,
  Walk: 1,
  Dash: 2,
  Air: 3,
  Attack: 4,
  /** Reaction states (targets). */
  Hitstun: 5,
  Launched: 6,
  Down: 7,
  GetUp: 8,
  /** Landing recovery after an aerial attack or a jump. */
  Landing: 9,
  /** Protected landing after air recovery (targets). */
  Recover: 10,
  // --- M4 defense ---
  /** Holding Guard: committed directional guard (or an exact-block attempt at 0 Defense). */
  Guard: 11,
  /** Reaction to a normally guarded contact. */
  Blockstun: 12,
  /** Controlled Guard Crush stagger. */
  GuardCrush: 13,
  /** Directional Predictive Counter attempt (its 3-frame window). */
  Counter: 14,
  /** Vulnerable recovery after a counter that met no counterable contact. */
  CounterMiss: 15,
  /** Combo Breaker: protected separation. */
  Breaker: 16,
  /** An attacker's recoil after being exact-blocked, countered or pushed by a breaker. */
  Recoil: 17,
  // --- M5 grabs ---
  /** Holding a grabbed target (hero: the grab route's decision window; enemy: its hold). */
  Grabbing: 18,
  /** Held by a grabber. */
  Grabbed: 19,
  /** A hero tied up by a `restraint` grab: waits for a partner rescue or the time-out. */
  Restrained: 20,
} as const;
export type MoveState = (typeof MoveState)[keyof typeof MoveState];

/** A hero or enemy. Extends Body with velocity, state and per-fighter input memory. */
export interface Fighter extends Body {
  team: Team;
  /** Player slot for heroes (0, 1); -1 for enemies. */
  slot: number;
  vx: number;
  vz: number;
  vy: number;
  state: MoveState;
  /** Frames spent in the current state, counting from 0 on the first frame. */
  stateFrame: number;
  /** Direction of the current dash or of the jump takeoff (each -1, 0 or 1). */
  dirX: Axis;
  dirZ: Axis;
  facingMode: FacingMode;
  /** World frame of the last unconsumed press per direction (up, down, left, right). */
  lastTap: [number, number, number, number];
  /** Buffered offensive action (one ActionBit, 0 = none) and the frame it was pressed. */
  bufAction: number;
  bufFrame: number;
  /** Action of the current attack stub (ActionBit), 0 when not attacking. */
  attackKind: number;
  /** The current attack started out of a dash (the low-attack chord only works then). */
  attackFromDash: boolean;
  /** World frame of the last Guard press, for the Dash + Attack + Guard chord. */
  lastGuardFrame: number;
  /** Assisted Facing target kept during an attack chain (0 = none). */
  targetId: number;
  /** Consecutive frames this hero tried to move but was held by enemy collision. */
  pinFrames: number;
  /** Set by the anti-trap rule: enemies are soft for this hero until they stop overlapping. */
  passEnemies: boolean;

  // --- M2 combat ---------------------------------------------------------------------
  /** Roster index of the hero definition; -1 for dummies. */
  hero: number;
  /** Index of the running action in the hero's action table; -1 for none or a stub. */
  action: number;
  /** Most recently pressed cardinal direction (DirBit), for diagonal tie-breaks. */
  lastCardinal: number;
  /** Frame of the last walk turn and the facing before it (turn grace). */
  turnFrame: number;
  turnFrom: number;
  /** Action frame of the first contact of the running action, -1 before any contact. */
  contactAt: number;
  /** Targets this action has hit, and the damage scale locked for each of them. */
  contactIds: number[];
  contactScales: number[];
  /** Active segment index for which hitIds are recorded, and the targets hit in it. */
  hitSeg: number;
  hitIds: number[];
  /** Actions used in the current string (bit per action index). */
  chainUsed: number;
  /** An aerial starter was used during this jump. */
  airUsed: boolean;
  /** The current dash came from the premium dash bridge. */
  bridged: boolean;
  /** Enemy collision is soft during this action (passThrough tag). */
  ghost: boolean;
  /** Attack meter, 0–100 %. */
  meter: number;
  /** Queued cancel: index of the link in the running action (-1 none) and its press frame. */
  reqLink: number;
  reqFrame: number;
  /** Last cancel verdict for the Lab: destination code, Reject code, world frame. */
  verdictTo: number;
  verdictReject: number;
  verdictFrame: number;
  /** Frames the current reaction or landing recovery lasts. */
  stun: number;
  /** A launched target lands on its feet (forced separation) instead of going down. */
  airRecover: boolean;
  /** Health (dummies: 1000). */
  health: number;
  maxHealth: number;
  /** Combo context owned by this fighter as a defender. */
  ctx: ComboContext;

  // --- M3 aerial and ground combat ----------------------------------------------------
  /** Protected recovery: cannot be hit and gives attackers nothing until actionable. */
  protectedRecovery: boolean;
  /** Bounces armed by the last hit (Bounce bits); spent on impact if the quota allows. */
  bounce: number;
  /** Minimal-lift juggle band: falls with 1.5 × gravity until it lands. */
  heavyFall: boolean;
  /** Frames left in the open ground window while downed (0 = closed). */
  groundWindow: number;

  // --- M4 defense ---------------------------------------------------------------------
  /** Defense meter, 0–100 %. */
  defense: number;
  /** Frames actionable without guarding, attacking or taking damage (passive recovery). */
  defIdle: number;
  /** Defensive facing in the belt plane (8-way), used while guarding. */
  guardX: Axis;
  guardZ: Axis;
  /** Guard was raised with no direction (a direction inside the chord tolerance makes a counter). */
  guardNeutral: boolean;
  /** Pending guard pivot: direction and the frame it takes effect (NO_TAP = none). */
  pivotX: Axis;
  pivotZ: Axis;
  pivotAt: number;
  /** Press frame of the open exact-block attempt (NO_TAP = none). */
  exactFrame: number;
  /** No new exact-block attempt before this frame (precision cooldown). */
  precisionUntil: number;
  /** Frame the counter chord completed, and its direction (NO_TAP = none). */
  counterFrame: number;
  counterX: Axis;
  counterZ: Axis;
  /** World frames of the last fresh direction press and Ultimate press (chords). */
  lastDirFrame: number;
  lastUltFrame: number;
  /** Attacker: defenders already rewarded for exact-blocking the running action. */
  rewardIds: number[];
  /** Last defensive outcome for the Lab (DefEvent), its timing offset, frame and attack. */
  defEvent: number;
  defOffset: number;
  defFrame: number;
  /** Route code of the incoming action of the last defensive outcome (-1 = none). */
  defAction: number;
  /** Training enemy: frames until the next attack, and the step of its attack cycle. */
  aiTimer: number;
  aiStep: number;

  // --- M5 Specials, Ultimates and grabs --------------------------------------------------
  /** Equipped moves: Special slots 0–4 then Ultimate slots 5–9 (by Dir), -1 = empty. */
  loadout: number[];
  /** Ultimate cinematic protection: strikes and grabs ignore this fighter. */
  cinematic: boolean;
  /** Id of the fighter this one holds (0 = none). */
  grabId: number;
  /** Id of the fighter holding this one (0 = none). */
  grabbedBy: number;
  /** World frame the current hold (or decision window) began. */
  grabStart: number;
  /** The grab route's one extension has been used. */
  grabExtUsed: boolean;
  /** Direction of the running grab attempt (8-way, belt plane). */
  grabX: Axis;
  grabZ: Axis;
  /** No grab may take this fighter before this frame (re-grab immunity). */
  regrabUntil: number;
  /** The one Grab Escape attempt of the current hold was used. */
  escapeTried: boolean;
  /** Thrown as a body projectile: thrower id (0 = not), and the throw's route code. */
  thrownBy: number;
  thrownCode: number;
  /** Last grab outcome for the Lab (GrabEvent), its offset and frame. */
  grabEvent: number;
  grabOffset: number;
  grabFrame: number;
}

/**
 * Grab outcomes for the Lab's grab panel. Numbers are encoded; never renumber. Offsets:
 * Escape = frame inside the window (0-based); EscapeEarly/Late = frames outside it.
 */
export const GrabEvent = {
  None: 0,
  /** This hero grabbed someone. */
  Hold: 1,
  Whiff: 2,
  Contested: 3,
  Throw: 4,
  ReleaseStrike: 5,
  SpecialFinish: 6,
  /** The decision window ran out: separating shove. */
  Shove: 7,
  /** The grab was broken by a hit on the grabber. */
  Interrupted: 8,
  Escape: 9,
  EscapeEarly: 10,
  EscapeLate: 11,
  /** Held to the end without an escape attempt: the enemy's finisher landed. */
  Thrown: 12,
  Restrained: 13,
  Rescued: 14,
  RestraintEnded: 15,
  /** A thrown body hit another enemy. */
  BodyHit: 16,
  /** This hero was grabbed. */
  Grabbed: 17,
  Extension: 18,
  /** This hero freed a restrained partner. */
  RescuedPartner: 19,
} as const;

/** A projectile in flight (one per owner). All values fixed point. */
export interface Projectile {
  /** Owner fighter id. */
  owner: number;
  /** Route code of the action that launched it. */
  code: number;
  /** Centre of the box, its bottom height and depth. */
  x: number;
  z: number;
  y: number;
  vx: number;
  /** Frames left. */
  life: number;
  /** Half width, height, half depth of the box. */
  hw: number;
  h: number;
  depth: number;
}

/**
 * Defensive outcomes, for the Lab's timing readouts. Numbers are encoded; never renumber.
 * Offsets: contact frame minus press frame (≥ 0), or press minus contact for Late.
 */
export const DefEvent = {
  None: 0,
  /** Normal guard (Guard held from earlier). */
  Guard: 1,
  /** Exact Block: offset frames before contact. */
  Exact: 2,
  /** Exact Block of a sequence-breaking contact. */
  ExactBreak: 3,
  GuardCrush: 4,
  /** Successful counter: offset frames before contact. */
  Counter: 5,
  /** The counter window passed with no contact. */
  CounterMiss: 6,
  /** A contact reached a counter attempt from outside its direction (connected). */
  CounterWrongDir: 7,
  /** Guarded, but the fresh press came too early for an exact block (offset before contact). */
  ExactEarly: 8,
  /** Guard pressed after an unguarded contact (offset after contact). */
  Late: 9,
  /** A guard-piercing attack beat the held guard. */
  Pierced: 10,
  /** A true unblockable attack connected. */
  Unblockable: 11,
  /** The contact came from outside the guard arc. */
  Behind: 12,
  Breaker: 13,
  /** Breaker chord refused: offset 1 = under 75 % Defense, 2 = not trapped, 3 = already used. */
  BreakerDenied: 14,
  /** A contact reached a counter attempt but the action is not counterable (connected). */
  CounterUncounterable: 15,
  /** A contact with no defense. */
  Hit: 16,
  /** Guarded inside the exact window, but the press was in the precision cooldown. */
  Cooldown: 17,
  /** The hero's armored Special absorbed the strike (damage, no reaction). */
  Armored: 18,
} as const;

/** Bounce bits armed on a target by tagged hits. */
export const Bounce = { Wall: 1, Ground: 2 } as const;

/** Ground-route tag recorded by the last knockdown. */
export const GroundTag = { None: 0, Opens: 1, Terminal: 2 } as const;

/**
 * Target-owned combo context. Opens on the first confirmed hit, closes when the target
 * is actionable again. Shared by every attacker hitting this target.
 */
export interface ComboContext {
  open: boolean;
  /** Offensive actions that connected (the opener is action 1). */
  actions: number;
  /** Individual hits (multi-hit moves count each hit). */
  hits: number;
  damage: number;
  /** Damage scale in percent for the next action. */
  scale: number;
  stunBudget: number;
  /** Move-weighted juggle budget; 0 = exhausted (protected landing). */
  juggleBudget: number;
  /** Attack meter that can still be earned from this combo. */
  meterBudget: number;
  bridgeUsed: boolean;
  exhausted: boolean;
  groundTag: number;
  /** Damage dealt by the most recent hit, for the hit pop-up. */
  lastDamage: number;
  /** One ordinary wall rebound and one ground bounce per combo (a relaunch uses the latter). */
  wallBounceUsed: boolean;
  groundBounceUsed: boolean;
  /** The ground window opened once in this combo (re-knockdown never refreshes it). */
  groundOpened: boolean;
  /** Ground route allowance shared by every attacker: one extension, one finisher. */
  groundExtUsed: boolean;
  groundFinUsed: boolean;
  /** How the combo ended (Protect code), 0 while open or ended by plain recovery. */
  ended: number;
  /** Actions that connected, in order: kit code × 64 + action index (see routeCode). */
  route: number[];
  /** The defender used its one Combo Breaker against this combo. */
  breakerUsed: boolean;
}

/** Why a target entered protected recovery (for the Lab). Numbers are encoded. */
export const Protect = {
  None: 0,
  GetUp: 1,
  AirRecovery: 2,
  SoftReset: 3,
  MissedWindow: 4,
  /** The defender broke the combo with a Combo Breaker. */
  Breaker: 5,
} as const;

/** Route log cap per context. */
export const ROUTE_CAP = 32;

export interface DummySettings {
  /** Treat every hit as a counter-hit (dummies do not attack yet). */
  counterHit: boolean;
  /** Restore full health whenever a combo context closes (dummies and heroes). */
  refill: boolean;
}

/** Lab: the training enemy's script (deterministic, no RNG). */
export interface TrainerSettings {
  /** 0 = dummies never attack, 1 = Dummy 1 attacks, 2 = every dummy attacks. */
  attackers: number;
  /** Index of the attack in the training kit, or -1 to cycle through all of them. */
  pattern: number;
  /** Frames between attacks once in range. */
  interval: number;
  /** Walk into range of the nearest hero before attacking. */
  approach: boolean;
}

export interface World {
  frame: number;
  rng: RngState;
  bodies: Fighter[];
  bounds: Bounds;
  /** Lab switch: dummies walk towards the nearest hero. */
  dummiesChase: boolean;
  /** Facing mode chosen by each player slot (applies to the hero when it spawns). */
  playerFacing: FacingMode[];
  /** Roster index chosen by each player slot. */
  playerHero: number[];
  dummy: DummySettings;
  /** Lab switch: premium cancels cost nothing and the meter shows full. */
  infiniteMeter: boolean;
  /** Lab switch: heroes' Defense meter stays full. */
  infiniteDefense: boolean;
  trainer: TrainerSettings;
  /** Loadout chosen by each player slot (applies to the hero when it spawns or switches). */
  playerLoadout: number[][];
  /** Projectiles in flight, in ascending owner id. */
  projectiles: Projectile[];
}
