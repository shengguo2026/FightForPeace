import type { Pursuit } from '../mounted/pursuit';
import type { Greenhouse } from '../preservation/greenhouse';
import type { CheatState } from '../cheats/cheats';
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
  // --- M6 weapons ---
  /** Picking up an item (claimed on the first frame). */
  Pickup: 21,
  // --- M7 enemies and boss ---
  /** Morale broke: running for the nearest stage edge. Not a legal target. */
  Flee: 22,
  /** Surrendered (kneeling, hands raised). Not a legal target. */
  Surrender: 23,
  /** Defeated: down for good. Not a legal target. */
  Defeated: 24,
  /** Boss phase transition (queued phase change): protected, heroes separated. */
  PhaseShift: 25,
  // --- M9 stage journey ---
  /** Holding Interact on a stage interaction (free a worker, revive, inspect): interruptible. */
  Channel: 26,
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
  /**
   * M16 Contact-Confirmed Conversion pending on the running action: the action index + 1
   * that starts when its active frames end (0 = none).
   */
  convert: number;
  /** M16: the running action's first hit caught its target in an attack's recovery. */
  punish: boolean;
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

  // --- M6 weapons and environment ----------------------------------------------------
  /** Id of the held item (0 = empty hands). */
  item: number;
  /** Weapon whose armed kit is active (-1 = own kit); kept until a running weapon action ends. */
  wkit: number;
  /** The held weapon's integrity ran out: it breaks once the current action has resolved. */
  breakPending: boolean;
  /** Opponent the running action instance already clashed with (0 = none). */
  clashWith: number;
  /** Scenery the running action instance already struck. */
  propHits: number[];
  /** The latest hit was environment-eligible: an impact surface may slam this fighter. */
  impactArmed: boolean;
  /** No hazard contact before this frame (anti-trapping). */
  hazardSafeUntil: number;
  /** Last weapon event for the Lab (WeaponEvent), its detail and frame. */
  weaponEvent: number;
  weaponDetail: number;
  weaponFrame: number;

  // --- M7 enemies and boss -------------------------------------------------------------
  /** Enemy AI mode (AiMode) and the frame it began. */
  aiMode: number;
  aiFrame: number;
  /** Threat reserved by the current commitment (0 = none), its hero and kind bits (Threat). */
  threat: number;
  threatTarget: number;
  threatFlags: number;
  /** Index of the running AI attack in the profile's attack list (-1 = none). */
  aiAttack: number;
  /** No target switch before this frame (Role-Aware Target Scoring with Commitment). */
  commitUntil: number;
  /** The hero who last hit this fighter, and when. */
  lastHitBy: number;
  lastHitFrame: number;
  /** Since when a hero has been threatening this enemy at close range (NO_FRAME = none). */
  nearSince: number;
  /** Deterministic rate accumulators for guard and evade chances. */
  guardAcc: number;
  evadeAcc: number;
  /** Planned defense (DefPlan) and the frame to carry it out. */
  defPlan: number;
  defAt: number;
  /** Incoming action already judged: attacker id and the frame its action started. */
  seenId: number;
  seenStart: number;
  /** No advanced defense (exact block, counter, breaker, evade) before this frame. */
  advUntil: number;
  /** Keep the guard raised until this frame. */
  guardUntil: number;
  /** Per profile attack: the frame from which it may start again. */
  readyAt: number[];
  /** Health reached 0 (encounters only): goes down for good, or surrenders (boss). */
  ko: boolean;
  /** Off-screen warning: shown until this frame (0 = none). */
  warnUntil: number;
  /** Boss: flinches taken in the current combo while Resolve remains. */
  flinches: number;
  /** Group attack: partner id (0 = none) and the frame the shared telegraph ends. */
  groupWith: number;
  groupAt: number;

  // --- M19 Stage 2 roles ---------------------------------------------------------------
  /** An order this enemy follows (Order): kind, the fighter it concerns, a depth side, and its frames. */
  order: number;
  orderTarget: number;
  orderSide: number;
  orderAt: number;
  orderUntil: number;
  /** A special action is running (Special): a Control Breach step, a call, Scorched Claim. */
  special: number;
  /** Control Breach: next step (1 Access, 2 Tamper, 3 Commit) and the asset index + 1. */
  breach: number;
  breachAsset: number;
  /** The next objective attempt or call may start from this frame. */
  objectiveAt: number;
  /** Interruptions taken (breach steps, calls, the grenade): two shake its morale. */
  interrupts: number;
  /** Morale shaken (grenade lost, disarmed); the profile's `shaken` threshold applies. */
  shaken: boolean;
  /** The Signalman call kind it is raising (CallKind). */
  callKind: number;

  // --- M8 same-device co-op ------------------------------------------------------------
  /**
   * Open handoff opportunity on this target: its TargetState (0 = none), the sender's id,
   * the frame it opened and its last frame.
   */
  handoff: number;
  handoffFrom: number;
  handoffAt: number;
  handoffUntil: number;
  /** M16: the handoff row (COOP.handoffs index + 1) that opened it, for its receivers. */
  handoffRow: number;
  /** One Tagged Partner Assist on this hero-held target: 0 none, 1 available, 2 spent. */
  assist: number;
  /** Frame a hero's grab finisher released this target (a same-frame assist still lands). */
  releasedAt: number;
}

/** Enemy AI modes. Numbers are encoded; never renumber. */
export const AiMode = {
  Idle: 0,
  /** Closing in on the target. */
  Approach: 1,
  /** Waiting for attack permission at the role's ring distance (circling, not idle). */
  Hold: 2,
  /** Flanker moving to the target's open side. */
  Flank: 3,
  /** Ranged role keeping its distance in the target's lane. */
  Kite: 4,
  /** Off-screen-capable attack: showing its warning. */
  Warn: 5,
  /** Group attack: shared telegraph, moving into the pincer. */
  Group: 6,
  /** Going for a weapon. */
  Weapon: 7,
  /** Boss: working the objective device. */
  Objective: 8,
  /** Entering the arena from outside the view. */
  Enter: 9,
} as const;

/** Threat reservation kind bits. */
export const Threat = {
  HardCC: 1,
  Projectile: 2,
  Unblockable: 4,
  Group: 8,
  Boss: 16,
  /** M19: a firearm aim (warned line) or a sweeping burst. */
  Aim: 32,
} as const;

/** M19 enemy orders. Numbers are encoded; never renumber. */
export const Order = { None: 0, Crossfang: 1, Escort: 2 } as const;
/** M19 special actions. Numbers are encoded; never renumber. */
export const Special = { None: 0, Breach: 1, Call: 2, Scorch: 3, Summon: 4 } as const;

/** Planned enemy defenses. Numbers are encoded; never renumber. */
export const DefPlan = { None: 0, Guard: 1, Exact: 2, Counter: 3, Evade: 4 } as const;

/** Director verdicts for the Lab. Numbers are encoded; never renumber. */
export const Verdict = {
  Ok: 0,
  /** Global threat budget would be exceeded. */
  Budget: 1,
  /** The target's per-hero pressure cap would be exceeded. */
  Cap: 2,
  /** Committed attacker limit. */
  Attackers: 3,
  /** Hostile projectile limit. */
  Projectiles: 4,
  /** Only one hard crowd-control source at a time. */
  HardCC: 5,
  /** No overlapping true unblockables. */
  Unblockable: 6,
  /** A group attack is in progress. */
  Group: 7,
  /** The attacker is outside the combat-safe zone. */
  Hidden: 8,
  /** Supports may not use the boss's share. */
  BossShare: 9,
  /** M19: too many firearm aims at once. */
  Aims: 10,
  /** M19: an attack's minimum range (too close to aim). */
  TooClose: 11,
} as const;

/** Boss state (spec §12.3, F&D §8). */
export interface BossState {
  id: number;
  phase: number;
  resolve: number;
  resolveMax: number;
  /** Stagger Break: frames left of its window (0 = not staggered). */
  stagger: number;
  /** The window is closing: a knockdown or exhausted budget ended the combo. */
  closing: boolean;
  /** Stagger Breaks earned so far (Lab). */
  breaks: number;
  /** A phase threshold was crossed: the transition is queued. */
  pending: boolean;
  pendingSince: number;
  /** Damage carried over into the next phase (capped). */
  carry: number;
  /** Frames left of the phase transition (0 = none). */
  shift: number;
  // --- M19 Marek ---
  /** The phase's summon (Command Pressure) was used. */
  summoned: boolean;
  /** Capture: 0 none, 1 Resolve surrender, 2 forced capture; and the frame it began. */
  capture: number;
  captureAt: number;
  /** How the armed phase's gun was lost (GunLost) and the rounds it still held. */
  gunLost: number;
  gunAmmo: number;
  /** The armed phase's gun (item id; 0 = none). */
  gunItem: number;
  /** Scorched Claim: 0 not tried, 1 running, 2 interrupted (may retry), 3 completed. */
  scorch: number;
  scorchAt: number;
  scorchStops: number;
  /** The mounted intercept's outcome: 0 none, 1 crashed (broken), 2 forced dismount. */
  intercept: number;
}

/** M19: how Marek lost the support gun. Numbers are encoded; never renumber. */
export const GunLost = { None: 0, Disarmed: 1, Broken: 2, Emptied: 3 } as const;

/** M19 encounter events for captions and the HUD. Numbers are encoded; never renumber. */
export const EncEvent = {
  None: 0,
  Call: 1,
  CallDone: 2,
  CallBroken: 3,
  BreachStep: 4,
  BreachDone: 5,
  BreachStopped: 6,
  ReserveWarn: 7,
  ReserveIn: 8,
  Summon: 9,
  Disarmed: 10,
  ScorchStart: 11,
  ScorchStopped: 12,
  ScorchDone: 13,
  Capture: 14,
  Collapse: 15,
  Escort: 16,
} as const;

/** An objective device (the sluice winch): advanced only by completed hostile actions. */
export interface Device {
  id: number;
  kind: string;
  x: number;
  z: number;
  count: number;
  progress: number;
  /** The device is in play (its boss phase is active). */
  active: boolean;
  /** Hazard index it releases when the count is reached (-1 = none). */
  hazard: number;
}

/** The last director decision, for the Lab. */
export interface DirectorLog {
  frame: number;
  enemy: number;
  /** Route code of the action asked for. */
  code: number;
  verdict: number;
}

/** Arena encounter state (M7): waves, director, visibility zone, boss and devices. */
export interface Encounter {
  arena: number;
  /** World frame the encounter began (its first wave arrives FIRST_WAVE_AT frames later). */
  start: number;
  difficulty: number;
  wave: number;
  /** Ids of the current wave's enemies. */
  waveIds: number[];
  nextId: number;
  /** 0 running, 1 cleared, 2 defeated, 3 waiting (a stage beat between camera locks). */
  result: number;
  /** Combat visibility zone (fixed point x range), from the simulation, never the screen. */
  viewMin: number;
  viewMax: number;
  /** No group attack before this frame. */
  groupReadyAt: number;
  boss: BossState | null;
  devices: Device[];
  log: DirectorLog;
  /** Telemetry: peak committed attackers, warned off-screen attacks, unwarned off-screen hits. */
  peakCommitted: number;
  offscreenWarned: number;
  offscreenUnwarned: number;
  // --- M19 ---
  /** The Signalman raising a call (0 = none) and the next frame a call may start. */
  call: number;
  callReadyAt: number;
  /** The Saboteur running a Control Breach (one sabotage per room at a time; 0 = none). */
  sabotage: number;
  /** Ledger asset indices already breached (each control at most once). */
  breached: number[];
  /** Reserve entries used, and a pending warned entry (kit index, -1 = none). */
  reserveUsed: number;
  entryKit: number;
  entryX: number;
  entryZ: number;
  entryAt: number;
  /** The mounted intercept's outcome brought into this room (0 none, 1 broken, 2 dismounted). */
  opening: number;
  /** The last event (EncEvent) for captions: kind, frame and two details. */
  event: { kind: number; frame: number; a: number; b: number };
}

/**
 * Weapon events for the Lab. Numbers are encoded; never renumber. Details: Clash 0 = even,
 * 1 = won, 2 = lost; Break 0 = after an action, 1 = on a thrown impact, 2 = in a hazard.
 */
export const WeaponEvent = {
  None: 0,
  Pickup: 1,
  Throw: 2,
  Break: 3,
  /** This fighter's weapon was knocked out of its hands. */
  Disarmed: 4,
  /** This fighter disarmed someone. */
  Disarm: 5,
  Clash: 6,
  /** Picked up its own disarmed weapon inside the reclaim window. */
  Reclaim: 7,
  /** Lost a same-frame pickup. */
  Contested: 8,
  /** Exact-blocked a thrown weapon aside. */
  Deflect: 9,
  /** Countered a thrown weapon back at its thrower. */
  Return: 10,
  /** Guarded a thrown weapon. */
  Blocked: 11,
  NoAmmo: 12,
  Discard: 13,
  /** Struck a thrown weapon aside with a projectileDeflect attack. */
  StruckAside: 14,
  /** Two-handed weapon: a Special or Ultimate is unavailable. */
  HandsFull: 15,
} as const;

/** Item lifecycle states. Numbers are encoded; never renumber. */
export const ItemState = {
  /** A stage pickup (neutral, or reserved for its former holder). */
  Ground: 0,
  Held: 1,
  /** Thrown, deflected, returned or dropped, until it lands. */
  Flying: 2,
  /** Landing safety correction: non-damaging and not collectible. */
  Settling: 3,
  /** Broken or consumed. */
  Gone: 4,
} as const;

/** How an item is flying. Only Throw and Returned flights can hit. */
export const Flight = { Throw: 0, Drop: 1, Deflected: 2, Returned: 3 } as const;

/** A weapon or fragment on the stage (spec §11, F&D §7.1). All values fixed point. */
export interface Item {
  id: number;
  /** Weapon registry index. */
  def: number;
  state: number;
  x: number;
  z: number;
  y: number;
  vx: number;
  vy: number;
  integrity: number;
  /** Rounds left (finite ammunition belongs to the physical weapon). */
  ammo: number;
  holder: number;
  /** Last fighter who held it (reclaim, Lab). */
  lastHolder: number;
  /** Flying: the fighter whose attack it is, and that attack's route code. */
  owner: number;
  code: number;
  flight: number;
  /** Its throw emptied its integrity: it breaks once the collision or landing resolved. */
  breakOnImpact: boolean;
  /** This flight came from a disarm: reserve it for the former holder when it rests. */
  disarmed: boolean;
  /** Fighters this flight already met. */
  hitIds: number[];
  /** Short Reclaim Priority: reserved for this fighter until the frame (0 = neutral). */
  reserveFor: number;
  reserveUntil: number;
  /** Settling towards (settleX, settleZ) for settleLeft more frames. */
  settleX: number;
  settleZ: number;
  settleLeft: number;
  /** Stage-authored recovery anchor in the same combat region. */
  anchorX: number;
  anchorZ: number;
}

/** An impact surface (the mill pillar). Solid. */
export interface Surface {
  id: number;
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
  /** Presentation state: cracked after its first damaging impact (persistent). */
  cracked: boolean;
  impacts: number;
}

/** Breakable states (spec §11.2). Numbers are encoded; never renumber. */
export const BreakState = { Intact: 0, Loosened: 1, Critical: 2, Broken: 3 } as const;

/** A multi-state breakable (the stacked sluice boards). Solid until broken. */
export interface Breakable {
  id: number;
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
  /** Accumulated breakPower and the state thresholds (Loosened, Critical, Broken). */
  power: number;
  thresholds: readonly [number, number, number];
  state: number;
  /** Weapon index of its one interactive fragment, and whether it was spawned. */
  fragment: number;
  spawned: boolean;
}

/** Hazard phases. Numbers are encoded; never renumber. */
export const HazardPhase = { Rest: 0, Warn: 1, Active: 2 } as const;

/** An active hazard (the mill cog): an authored, telegraphed, guardable action. */
export interface Hazard {
  id: number;
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
  phase: number;
  phaseFrame: number;
  rest: number;
  warn: number;
  active: number;
  damage: number;
}

/** Environment events for the Lab. Numbers are encoded; never renumber. */
export const EnvEvent = {
  None: 0,
  /** Full environmental damage; detail: 1 = wall rebound, 2 = terminal slam. */
  Impact: 1,
  /** Contact after the allowance was spent, or without force or eligibility: separation only. */
  Separation: 2,
  /** A breakable took breakPower; detail = its new state. */
  Break: 3,
  /** A breakable broke and released its fragment (detail = fragment item id). */
  Fragment: 4,
  HazardHit: 5,
  HazardGuard: 6,
  /** An item could not rest where it landed and was corrected (detail 1 = to its anchor). */
  Corrected: 7,
} as const;

/** The last environment event, for the Lab (deterministic event identity: kind + frame). */
export interface EnvLog {
  kind: number;
  frame: number;
  /** Fighter or item id involved, and the scenery id. */
  target: number;
  prop: number;
  /** Speed at contact (fixed point), damage dealt, kind-specific detail. */
  force: number;
  damage: number;
  detail: number;
}

export interface Environment {
  surfaces: Surface[];
  breakables: Breakable[];
  hazards: Hazard[];
  log: EnvLog;
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
  /** The one full environmental damage event of this combo was used (spec §11.2). */
  environmentImpactUsed: boolean;
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
  /** A team finisher concluded the combo (M8). */
  TeamFinisher: 6,
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
  /** Weapon Dummy 1 fights with and reclaims (-1 = unarmed). */
  arm: number;
}

/** Co-op events for the Lab and the presentation. Numbers are encoded; never renumber. */
export const CoopEvent = {
  None: 0,
  /** A sender's hit opened a handoff (detail = TargetState). */
  HandoffOpen: 1,
  /** The partner's receiving move claimed it (detail = TargetState). */
  HandoffClaim: 2,
  /** It closed unclaimed (detail: 1 expired, 2 target actionable or protected). */
  HandoffClosed: 3,
  /** A Team Attack invitation is waiting for the partner (detail = finisher index). */
  Invite: 4,
  /** Both pressed Team Attack on the same frame: one merged, confirmed request. */
  Merged: 5,
  /** The partner confirmed: both costs committed, the team finisher begins. */
  Confirm: 6,
  /** The invitation ran out unanswered: nothing spent. */
  Expired: 7,
  /** Revalidation failed on confirmation: nothing spent (detail = TeamDenied). */
  Invalid: 8,
  /** The team finisher connected and closed the combo. */
  Finisher: 9,
  /** A partner's grab assist connected on the held target. */
  Assist: 10,
  /** Restraint release: the partner freed a restrained hero. */
  Release: 11,
  /** Partner interrupt: a strike on the grabber freed the held hero. */
  Interrupt: 12,
  /** Same-frame hits on one target resolved as one Combined Hit Bundle (detail = hits). */
  Bundle: 13,
  /** Team Attack pressed but no invitation was possible (detail = TeamDenied). */
  Unavailable: 14,
} as const;

/** Why a Team Attack could not invite or commit. Numbers are encoded; never renumber. */
export const TeamDenied = {
  None: 0,
  NoPartner: 1,
  /** No authored team finisher supports this pair. */
  Pairing: 2,
  /** No enemy in an authored target state in range. */
  NoTarget: 3,
  Meter: 4,
  /** A hero is not active and controllable. */
  Busy: 5,
  /** The partner is out of range of the target. */
  Range: 6,
} as const;

/** A pending Team Attack invitation (Invite and Confirm). */
export interface Invitation {
  from: number;
  target: number;
  /** Index into the team finisher table. */
  finisher: number;
  at: number;
  /** Last frame the partner may confirm. */
  until: number;
}

/** The last co-op event (deterministic event identity: kind + frame). */
export interface CoopLog {
  kind: number;
  frame: number;
  /** Who acted, the partner involved and the target (0 = none). */
  actor: number;
  partner: number;
  target: number;
  detail: number;
}

/** Same-device co-op state (M8). */
export interface CoopState {
  invite: Invitation | null;
  log: CoopLog;
  /** The last Combined Hit Bundle: frame, target, hits and the dominant action's route code. */
  bundleFrame: number;
  bundleTarget: number;
  bundleHits: number;
  bundleDominant: number;
  /** Telemetry for the Lab. */
  handoffs: number;
  finishers: number;
  assists: number;
  rescues: number;
  bundles: number;
  /** M16: handoffs claimed on an authored pair route (Reciprocal Handoffs). */
  reciprocal: number;
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
  /** Weapons and fragments, in ascending id. */
  items: Item[];
  nextItem: number;
  environment: Environment;
  /** M7 arena encounter (null in the Lab). */
  encounter: Encounter | null;
  /** M8 same-device co-op: invitations, handoff and bundle log, telemetry. */
  coop: CoopState;
  /** M9 stage journey (null in the Lab and the arenas). */
  run: StageRun | null;
  /** M11 Elder's Secrets: active cheats and the Cheat-Assisted mark. */
  cheats: CheatState;
  /** M17 mounted pursuit (null outside a Guided Pursuit Corridor). */
  pursuit: Pursuit | null;
  /** M18 greenhouse room: Preservation Ledger, containers, pantry, fixtures (or null). */
  greenhouse: Greenhouse | null;
}

// --- M9 stage journey --------------------------------------------------------------------

/** Phases of a stage run. Numbers are encoded; never renumber. */
export const RunPhase = {
  /** Crossing a beat between camera locks. */
  Walk: 0,
  /** A camera lock: the view and the heroes are held until its waves are cleared. */
  Locked: 1,
  /** Fade between two beats. */
  Transition: 2,
  /** Every hero is down: the DEFEATED banner, then a continue or the restart. */
  Defeat: 3,
  /** The sponsor evidence is secured: the results screen. */
  Complete: 4,
} as const;

/** Coerced worker states. Numbers are encoded; never renumber. */
export const WorkerState = { Bound: 0, Freed: 1, Leaving: 2, Safe: 3 } as const;

/** What a hero's Channel works on. Numbers are encoded; never renumber. */
export const ChannelKind = { None: 0, Worker: 1, Clue: 2, Evidence: 3, Revive: 4 } as const;

/** Stage events for the HUD (the last one is kept). Numbers are encoded; never renumber. */
export const RunEvent = {
  None: 0,
  BeatStart: 1,
  Checkpoint: 2,
  LockStart: 3,
  LockClear: 4,
  WorkerFreed: 5,
  CacheOpen: 6,
  Food: 7,
  Clue: 8,
  Downed: 9,
  Revived: 10,
  Rejoined: 11,
  ContinueUsed: 12,
  StageRestart: 13,
  RiverRestored: 14,
  Evidence: 15,
  Complete: 16,
  ExitOpen: 17,
  /** M20: a room beat's evidence is ready (the marked crate after Marek's capture). */
  EvidenceReady: 18,
  /** M20: an optional branch ended (detail: its outcome, BranchOutcome). */
  BranchEnd: 19,
} as const;

/** M20 optional branch outcomes. Numbers are encoded; never renumber. */
export const BranchOutcome = { Skipped: 0, Completed: 1, Failed: 2 } as const;

/** M20: one Ledger asset as a room beat left it (for the stage's Preservation result). */
export interface RunAsset {
  /** Beat index of the room and the asset's authored name there. */
  beat: number;
  name: string;
  /** Ledger kind index, its condition and state (AssetState) at the end of the beat. */
  kind: number;
  condition: number;
  state: number;
}

/** M20: a corridor beat's Civil-Protection Response Record (line scores in record order). */
export interface RunResponse {
  beat: number;
  scores: number[];
  rewinds: number;
  mastery: boolean;
}

/** M20: Marek's capture as the boss room left it (BossState fields). */
export interface RunCapture {
  route: number;
  gunLost: number;
  gunAmmo: number;
  scorch: number;
  scorchStops: number;
  intercept: number;
}

/** M20: a weapon a hero carries from one beat into the next (exact Integrity and rounds). */
export interface RunCarry {
  def: number;
  integrity: number;
  ammo: number;
}

export interface RunWorker {
  x: number;
  z: number;
  look: number;
  state: number;
  /** World frame the current state began. */
  since: number;
}

export interface RunPickup {
  x: number;
  z: number;
  heal: number;
  look: number;
  taken: boolean;
}

/** One hero's hold-to-interact progress (see MoveState.Channel). */
export interface ChannelState {
  kind: number;
  /** Worker index, or the downed partner's slot for a revive. */
  target: number;
  progress: number;
  /** Frames the interaction needs. */
  need: number;
}

/** Counters for the results screen (all integers). */
export interface RunStats {
  /** Frames since the run (or its restart) began, until the evidence is secured. */
  frames: number;
  defeated: number;
  surrendered: number;
  fled: number;
  damageTaken: number;
  food: number;
  downs: number;
  revives: number;
  workersFreed: number;
  clues: number;
  evidence: number;
  /** M11: most hits and most damage of one hero combo on one enemy. */
  bestHits: number;
  bestDamage: number;
}

/** What a checkpoint keeps: the beat to restart, each hero's meter and the counters. */
export interface RunCheckpoint {
  beat: number;
  meter: number[];
  stats: RunStats;
  /** M20: the stage records as the checkpoint found them (copies). */
  ledger: RunAsset[];
  response: RunResponse[];
  branches: number[];
  intercept: number;
  carry: (RunCarry | null)[];
}

export interface StageRun {
  /** STAGES index. */
  stage: number;
  difficulty: number;
  /** Beat the run started at (0 = the stage start; later beats are Lab practice). */
  startBeat: number;
  beat: number;
  phase: number;
  /** World frame the phase began. */
  phaseFrame: number;
  /** Camera locks of this beat already cleared (locks run in order). */
  locksDone: number;
  /** Heroes cannot walk back further left than this (fixed point). */
  floorX: number;
  continues: number;
  continuesUsed: number;
  checkpoint: RunCheckpoint | null;
  workers: RunWorker[];
  pickups: RunPickup[];
  cacheOpen: boolean;
  /** 0 none in this beat, 1 waiting, 2 inspected. */
  clue: number;
  /** 0 not yet, 1 lying at the gate, 2 secured. */
  evidence: number;
  channel: ChannelState[];
  /** Health per slot after the last frame (damage taken). */
  lastHealth: number[];
  /** World frame each slot's hero went down (-1 = up). */
  downedAt: number[];
  /** Enemy ids already counted as defeated, surrendered or fled in this lock. */
  counted: number[];
  stats: RunStats;
  /** Totals of the stage (for the results). */
  workersTotal: number;
  cluesTotal: number;
  event: { kind: number; frame: number; detail: number };
  /** M20: Ledger assets of every room beat left so far. */
  ledger: RunAsset[];
  /** M20: the record of every corridor beat ridden so far. */
  response: RunResponse[];
  /** M20: outcome per branch beat (indexed by beat; BranchOutcome, Skipped when unvisited). */
  branches: number[];
  /** M20: the latest corridor's Marek intercept outcome (the boss room's opening). */
  intercept: number;
  /** M20: Marek's capture (null until the boss room is cleared). */
  capture: RunCapture | null;
  /** M20: weapon per slot carried into the next on-foot beat. */
  carry: (RunCarry | null)[];
  /** M20: steering assistance for the run's corridor beats (a player setting). */
  assist: boolean;
  /** M20: the phase the beat continues in once the fade ends (Walk, or a room's Locked). */
  resume: number;
}
