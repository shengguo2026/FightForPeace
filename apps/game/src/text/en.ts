/**
 * Player-facing English text for M1. Strings never contain a key or button name:
 * `{action:Attack}` and `{dir:Forward}` tokens are drawn by <InputPrompt> from the
 * player's current bindings and device. tests/lint/prompt-text.test.ts enforces this.
 */
export const TEXT = {
  hintMove: 'Move {dir:Up}{dir:Left}{dir:Down}{dir:Right}',
  hintDash: 'Dash {action:Dash}',
  hintJump: 'Jump {action:Jump}',
  hintAttack: 'Attack {action:Attack}',
  hintLowAttack: 'Low attack {action:LowAttack}',
  hintAirAttack: 'Air attack {action:Jump} then {action:Attack}',
  hintGuard: 'Guard {action:Guard}',
  hintCounter: 'Counter {dir:Forward}+{action:Guard} just before contact',
  hintBreaker: 'Combo Breaker {action:Guard}+{action:Ultimate} while being hit',
  hintSpecial: 'Special {action:Special}',
  hintUltimate: 'Ultimate {action:Ultimate} (full bar)',
  hintGrab: 'Grab {action:Interact}',
  hintEscape: 'Grab escape {action:Guard} when ESCAPE shows',
  grabRoute:
    'Holding: {action:Attack} extension, then {action:Attack} release strike · {action:Interact} throw ({dir:Backward}+{action:Interact} behind) · {action:Special} finisher',
  escapeNow: 'ESCAPE! {action:Guard}',
  restrained: 'RESTRAINED · partner: {action:Interact} next to them',
  joinKeyboard: 'Player 2: press {action:Attack} on the split keyboard to join',
  paused: 'Paused. Press {action:Pause} to continue.',
  pausedFocus: 'Paused: the game window lost focus. Press {action:Pause} to continue.',
  teamInvite: 'Team Attack! Press {action:TeamAttack} to join in',
  teamWaiting: 'Team Attack: waiting for your partner',
  hintTeam: 'Team {action:TeamAttack}',
  // --- M17 mounted pursuit (the hero's mounted move names fill {name}) ---
  hintRideSteer: 'Steer {dir:Up}{dir:Down} · faster {dir:Right} · slower {dir:Left}',
  hintRideAttack: '{action:Attack} {name}',
  hintRideKick: '{dir:Up}/{dir:Down}+{action:Attack} {name}',
  hintRideHop: '{action:Jump} {name}',
  hintRideLean: '{action:Guard} {name}',
  hintRideSpecial: '{action:Special} {name}',
  hintRideUltimate: '{action:Ultimate} {name} (full bar)',
  hintRideRescue: 'Rescue {action:TeamAttack} beside a downed partner',
  controllerLost: 'Player {player} lost their controller.',
  // --- M9 stage journey (hold Interact next to something) ---
  holdWorker: 'Hold {action:Interact} to free the worker',
  holdRevive: 'Hold {action:Interact} to help your partner up',
  holdClue: 'Hold {action:Interact} to look closer',
  holdEvidence: 'Hold {action:Interact} to secure the evidence',
  downedWait: 'Down: your partner can help you up, or you return when this fight ends',
  controllerReconnect:
    'Reconnect it, or press the Attack button on another controller or keyboard to continue with that one.',
} as const;

export type TextKey = keyof typeof TEXT;

/** Move-list input notation per input context and direction code (Dir: 0 neutral … 5 up/down). */
const DIR_PREFIX = [
  '',
  '{dir:Forward}+',
  '{dir:Backward}+',
  '{dir:Up}+',
  '{dir:Down}+',
  '{dir:Up}/{dir:Down}+',
];

export function moveInputText(context: string, dir: number): string {
  const d = DIR_PREFIX[dir] ?? '';
  switch (context) {
    case 'neutral':
      return `${d}{action:Attack}`;
    case 'chain':
      return 'repeat {action:Attack}';
    case 'air':
      return `in the air: ${d}{action:Attack}`;
    case 'dash':
      return 'dashing: {action:Attack}';
    case 'dashLow':
      return 'dashing: {action:Attack}+{action:Guard}, or {action:LowAttack}';
    case 'groundFocus':
      return `near a downed target: ${d}{action:Attack}`;
    case 'counter':
      return 'toward the attacker: {dir:Forward}+{action:Guard} just before contact';
    case 'special':
      return `${d}{action:Special}`;
    case 'ultimate':
      return `${d}{action:Ultimate} with a full bar`;
    case 'grab':
      return '{action:Interact} (a direction picks the side)';
    case 'grabExtension':
      return 'holding: {action:Attack}';
    case 'grabRelease':
      return 'holding, after the extension: {action:Attack}';
    case 'grabThrow':
      return `holding: ${d}{action:Interact}`;
    case 'grabSpecial':
      return 'holding: {action:Special}';
    default:
      return '';
  }
}

/** Move-list notation for a cancel link to something other than an attack. */
export const LINK_TEXT = {
  jump: '{action:Jump}',
  dash: '{action:Dash} or {dir:Forward}{dir:Forward}',
  special: 'Special {action:Special}',
  ultimate: 'Ultimate {action:Ultimate}',
  grab: 'Grab {action:Interact}',
} as const;

/**
 * Defense timing readouts (Lab F8), by DefEvent code. `{o}` is the timing offset in
 * frames, `{a}` the incoming attack, `{w}` the window.
 */
export const DEFENSE_TEXT: Record<number, string> = {
  1: 'Guarded {a} (guard held)',
  2: 'Exact Block ✓ {a}: pressed {o} f before contact (window {w} f)',
  3: 'Exact Block ✓ {a}: sequence broken, pressed {o} f before contact (window {w} f)',
  4: 'GUARD CRUSH by {a}: Defense exhausted',
  5: 'Counter ✓ {a}: pressed {o} f before contact (window {w} f)',
  6: 'Counter ✗ no contact inside the {w} f window: vulnerable recovery',
  7: 'Counter ✗ {a} came from outside the counter direction',
  8: 'Guarded {a}: pressed {o} f before contact, too early for Exact Block (window {w} f)',
  9: 'Too late: Guard pressed {o} f after the contact (no correction after contact)',
  10: '{a} pierces a held guard: Exact Block it',
  11: '{a} is unblockable: move away',
  12: '{a} came from outside the guard arc',
  13: 'Combo Breaker ✓ 75 % Defense spent',
  14: 'Combo Breaker ✗ {reason}',
  15: 'Counter ✗ {a} cannot be countered',
  16: 'Hit by {a}',
  17: 'Guarded {a}: pressed {o} f before contact, but inside the precision cooldown',
  18: 'Armor absorbed {a} (damage, no stagger)',
};

/**
 * Grab readouts (Lab F9), by GrabEvent code. `{o}` is the offset in frames, `{w}` the
 * Grab escape window.
 */
export const GRAB_TEXT: Record<number, string> = {
  1: 'Grab ✓ holding: choose within the decision window',
  2: 'Grab ✗ nobody in reach (whiff recovery)',
  3: 'Grab ✗ the other hero grabbed first (short recovery)',
  4: 'Throw ✓',
  5: 'Release strike ✓',
  6: 'Special finisher ✓',
  7: 'Decision window over: shove (no damage)',
  8: 'Grab broken: the grabber was hit',
  9: 'Grab escape ✓ pressed on frame {o} of the {w} f window',
  10: 'Grab escape ✗ too early: {o} f before the window (one attempt per grab)',
  11: 'Grab escape ✗ too late: {o} f after the window',
  12: 'Thrown: no escape attempt',
  13: 'Restrained: wait for the partner, or the rope gives way',
  14: 'Freed ✓',
  15: 'Struggled free (restraint over)',
  16: 'Body throw ✓ the thrown enemy hit another',
  17: 'Grabbed! Watch for ESCAPE',
  18: 'Extension ✓',
  19: 'Partner freed ✓',
};

/** Why a loadout change was refused (Lab F2). */
export const EQUIP_TEXT: Record<string, string> = {
  fixed: 'the neutral slot is the fixed signature move',
  incompatible: 'that move does not fit this slot',
  unknown: 'unknown move',
  ok: '',
};

export const BREAKER_DENIED: Record<number, string> = {
  1: 'needs 75 % Defense',
  2: 'only while being hit, juggled or in a ground window',
  3: 'already used in this combo',
};

/** Defense-response profile of an attack, in words (telegraph labels; never colour alone). */
export function profileText(tags: readonly string[]): string {
  const parts: string[] = [];
  if (tags.includes('unblockable')) parts.push('UNBLOCKABLE');
  else if (tags.includes('guardPiercing')) parts.push('PIERCES GUARD');
  else if (tags.includes('guardPressure')) parts.push('GUARD PRESSURE');
  if (tags.includes('counterable') && !tags.includes('uncounterable')) parts.push('counterable');
  return parts.join(' · ');
}

export type TextPart =
  { kind: 'text'; text: string } | { kind: 'action'; name: string } | { kind: 'dir'; name: string };

/** Splits a string into plain text and prompt tokens; `{player}` style values are filled in. */
export function parseText(s: string, values: Record<string, string | number> = {}): TextPart[] {
  const parts: TextPart[] = [];
  const re = /\{(action|dir):(\w+)\}|\{(\w+)\}/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index > last) parts.push({ kind: 'text', text: s.slice(last, m.index) });
    if (m[1] === 'action') parts.push({ kind: 'action', name: m[2]! });
    else if (m[1] === 'dir') parts.push({ kind: 'dir', name: m[2]! });
    else parts.push({ kind: 'text', text: String(values[m[3]!] ?? m[0]) });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ kind: 'text', text: s.slice(last) });
  return parts;
}

/** M7 arena HUD words. */
export const ARENA_TEXT = {
  wave: 'Wave',
  left: 'left',
  cleared: 'ARENA CLEARED',
  defeated: 'DEFEATED',
  restart: 'F1 Lab → Arena → Restart',
  stagger: 'STAGGER BREAK',
  phaseShift: 'phase change',
  phaseQueued: 'phase change queued',
  phase: 'Phase',
  resolve: 'Resolve',
  incoming: 'INCOMING',
  teamAttack: 'TEAM ATTACK',
  flee: 'flees',
  surrender: 'surrenders',
} as const;

/** Director verdicts (Verdict numbers) for the Lab's encounter panel. */
export const VERDICT_TEXT = [
  'allowed',
  'over the threat budget',
  'over the pressure cap',
  'too many attackers',
  'too many projectiles',
  'one hard crowd control at a time',
  'no overlapping unblockables',
  'group attack in progress',
  'not visible (off screen)',
  'boss share reserved',
  'too many firearm aims at once',
  'too close to aim',
] as const;

/** M8 co-op event words for the Lab's Co-op panel (index = CoopEvent). */
export const COOP_EVENT_TEXT: readonly string[] = [
  'none yet',
  'handoff opened',
  'handoff claimed by the partner',
  'handoff closed unclaimed',
  'Team Attack invitation waiting',
  'both pressed Team Attack together: merged',
  'partner confirmed: team finisher starts',
  'invitation ran out: nothing spent',
  'confirmation refused: nothing spent',
  'team finisher connected',
  'grab assist connected',
  'rescue: restraint released',
  'rescue: partner interrupted the grab',
  'Combined Hit Bundle',
  'Team Attack not available',
];

/** Why a Team Attack was refused (index = TeamDenied). */
export const TEAM_DENIED_TEXT: readonly string[] = [
  '',
  'no partner on stage',
  'this pair has no team finisher',
  'no target in a team state in range',
  'not enough meter (both need it)',
  'a hero is busy',
  'partner out of range',
];

/** M9 stage journey: HUD words, notices and the results screen. */
export const STAGE_TEXT = {
  stage: 'Stage',
  beat: 'Beat',
  continues: 'Continues',
  checkpoint: 'Checkpoint saved',
  go: 'GO',
  lockClear: 'CLEAR',
  defeated: 'DEFEATED',
  continueLeft: 'Continue from the checkpoint · {n} left',
  noContinues: 'No continues left: the stage starts again',
  restarted: 'The stage starts again',
  continued: 'Continue used',
  workerFreed: 'Worker freed',
  cacheOpen: 'Recovery cache opened',
  food: 'Food',
  downed: 'P{n} is down',
  revived: 'P{n} is back up',
  rejoined: 'P{n} rejoins',
  riverRestored: 'THE RIVER FLOWS AGAIN',
  exitOpen: 'The way ahead is open',
  complete: 'STAGE COMPLETE',
  objectiveDone: 'Done',
  workers: 'Workers freed',
  resultsTitle: 'Stage 1 complete · The Broken Water Pact',
  overall: 'Overall',
  practice: 'practice run from beat {n}',
  playAgain: 'Play again',
  backToLab: 'Back to the Lab',
  sponsorHook:
    'The faction is beaten, but the machined parts point to someone outside the valley. Who is paying for this?',
} as const;

/** Grade category names (StageResults grade ids). */
export const GRADE_TEXT = {
  rescue: 'Rescue (workers freed)',
  evidence: 'Investigation (clue and sponsor evidence)',
  continues: 'Continues used',
  time: 'Time',
} as const;
