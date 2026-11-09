import type { Fighter, World } from '../world/types';

/**
 * Elder's Secrets (spec §16.2, Appendix E): the Cheat-Assisted catalogue. Cheats are
 * explicit modifiers inside the one deterministic engine, not a second simulation. Each
 * code has a stable ASCII identifier and a bit; hero-scoped bits live per player slot,
 * session-scoped bits once per run. Bits are encoded; never renumber.
 */
export const Cheat = {
  SOFTERBLOWS: 1 << 0,
  SAFEHEART: 1 << 1,
  STEADYFEET: 1 << 2,
  IRONGUARD: 1 << 3,
  BRIGHTSPIRIT: 1 << 4,
  STRONGHANDS: 1 << 5,
  TRUSTYTOOLS: 1 << 6,
  STEADYRIDE: 1 << 7,
  QUIETCROWD: 1 << 8,
  FULLPANTRY: 1 << 9,
  HOMECOMING: 1 << 10,
  SAFEPASSAGE: 1 << 11,
} as const;

export type CheatCode = keyof typeof Cheat;
export type CheatScope = 'hero' | 'session';

export interface CheatDef {
  code: CheatCode;
  bit: number;
  scope: CheatScope;
  /** Codes this one supersedes when both are selected (they stay visible). */
  supersedes: readonly CheatCode[];
  /** Does the code change anything in the stages that exist (Stage 1)? */
  active: boolean;
}

const def = (
  code: CheatCode,
  scope: CheatScope,
  supersedes: readonly CheatCode[] = [],
  active = true,
): CheatDef => ({ code, bit: Cheat[code], scope, supersedes, active });

/** The twelve codes in catalogue order (Appendix E.1). */
export const CHEATS: readonly CheatDef[] = [
  def('SOFTERBLOWS', 'hero'),
  def('SAFEHEART', 'hero', ['SOFTERBLOWS']),
  def('STEADYFEET', 'hero'),
  def('IRONGUARD', 'hero'),
  def('BRIGHTSPIRIT', 'hero'),
  def('STRONGHANDS', 'hero'),
  def('TRUSTYTOOLS', 'hero'),
  // M17: mounted Stability (the bike pursuit). Protected objectives arrive later.
  def('STEADYRIDE', 'hero'),
  def('QUIETCROWD', 'session'),
  def('FULLPANTRY', 'session'),
  def('HOMECOMING', 'session'),
  def('SAFEPASSAGE', 'session', [], false),
];

export interface PresetDef {
  code: string;
  codes: readonly CheatCode[];
}

/** Preset bundles (Appendix E.2): they expand into ordinary, visible codes. */
export const PRESETS: readonly PresetDef[] = [
  { code: 'FIRSTSTEPS', codes: ['SOFTERBLOWS', 'IRONGUARD', 'STEADYRIDE', 'HOMECOMING'] },
  {
    code: 'CALMBATTLE',
    codes: ['SOFTERBLOWS', 'QUIETCROWD', 'FULLPANTRY', 'STEADYRIDE', 'HOMECOMING'],
  },
  {
    code: 'PEACEFULPATH',
    codes: ['SAFEHEART', 'IRONGUARD', 'STEADYRIDE', 'SAFEPASSAGE', 'HOMECOMING'],
  },
  {
    code: 'UNSTOPPABLE',
    codes: [
      'SAFEHEART',
      'STEADYFEET',
      'IRONGUARD',
      'BRIGHTSPIRIT',
      'STRONGHANDS',
      'TRUSTYTOOLS',
      'STEADYRIDE',
      'SAFEPASSAGE',
      'HOMECOMING',
    ],
  },
];

/** Version of this catalogue (profiles store it with their cheat preferences). */
export const CHEAT_REGISTRY_VERSION = 1;

/**
 * Typed input to its canonical form: case-insensitive, surrounding whitespace ignored,
 * spaces, hyphens and underscores equivalent (and dropped). Nothing is ever guessed.
 */
export function canonicalCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '');
}

export type CodeMatch = { kind: 'cheat'; cheat: CheatDef } | { kind: 'preset'; preset: PresetDef };

/** The cheat or preset a typed code names exactly, or null (misspellings are not guessed). */
export function lookupCode(input: string): CodeMatch | null {
  const c = canonicalCode(input);
  if (c.length === 0) return null;
  const cheat = CHEATS.find((x) => x.code === c);
  if (cheat) return { kind: 'cheat', cheat };
  const preset = PRESETS.find((x) => x.code === c);
  if (preset) return { kind: 'preset', preset };
  return null;
}

export function cheatDef(code: string): CheatDef | undefined {
  return CHEATS.find((c) => c.code === code);
}

/** Canonical codes in catalogue order, without unknown entries or duplicates. */
export function sortCodes(codes: Iterable<string>): CheatCode[] {
  const set = new Set(codes);
  return CHEATS.filter((c) => set.has(c.code)).map((c) => c.code);
}

/** The preset a selection is exactly, 'custom' for any other non-empty selection, or null. */
export function presetName(codes: readonly string[]): string | null {
  const sorted = sortCodes(codes);
  if (sorted.length === 0) return null;
  const p = PRESETS.find(
    (x) => x.codes.length === sorted.length && sortCodes(x.codes).every((c, i) => c === sorted[i]),
  );
  return p ? p.code : 'custom';
}

/** Codes a selection lists but that another selected code supersedes (shown, no effect). */
export function supersededCodes(codes: readonly string[]): CheatCode[] {
  const set = new Set(codes);
  const out = new Set<CheatCode>();
  for (const c of CHEATS)
    if (set.has(c.code)) for (const s of c.supersedes) if (set.has(s)) out.add(s);
  return sortCodes(out);
}

/** The bit mask of one scope's codes in a selection. */
export function cheatMask(codes: readonly string[], scope: CheatScope): number {
  let m = 0;
  for (const c of CHEATS) if (c.scope === scope && codes.includes(c.code)) m |= c.bit;
  return m;
}

/** Codes of a mask, in catalogue order. */
export function codesOf(mask: number): CheatCode[] {
  return CHEATS.filter((c) => (mask & c.bit) !== 0).map((c) => c.code);
}

// --- run state ----------------------------------------------------------------------------

/** Cheats of the running world. Encoded and hashed like every other state. */
export interface CheatState {
  /** Hero-scoped masks per player slot. */
  hero: number[];
  /** Session-scoped mask. */
  session: number;
  /** An accepted modifier marked the run Cheat-Assisted (never cleared for this run). */
  marked: boolean;
  /** World frame and stage beat of the first accepted activation (-1 = none). */
  firstFrame: number;
  firstBeat: number;
  /** Every code ever active in this run (mask union of both scopes), for the results. */
  used: number;
}

export function newCheatState(): CheatState {
  return { hero: [0, 0], session: 0, marked: false, firstFrame: -1, firstBeat: -1, used: 0 };
}

/**
 * Applies a cheat configuration (hero masks per slot, session mask). The first non-empty
 * configuration marks the run for good; turning every cheat off later does not unmark it.
 */
export function setCheats(world: World, hero: readonly number[], session: number): void {
  const s = world.cheats;
  s.hero = [hero[0] ?? 0, hero[1] ?? 0];
  s.session = session;
  const any = s.hero.some((m) => m !== 0) || session !== 0;
  if (any && !s.marked) {
    s.marked = true;
    s.firstFrame = world.frame;
    s.firstBeat = world.run ? world.run.beat : -1;
  }
  s.used |= s.hero[0]! | s.hero[1]! | session;
}

/** Does this hero fighter have a hero-scoped cheat bit? (Enemies never do.) */
export function heroCheat(world: World, f: Fighter, bit: number): boolean {
  return f.team === 'hero' && ((world.cheats.hero[f.slot] ?? 0) & bit) !== 0;
}

export function sessionCheat(world: World, bit: number): boolean {
  return (world.cheats.session & bit) !== 0;
}

/**
 * Incoming Health damage for a hero: SAFEHEART keeps Health from decreasing (it supersedes
 * SOFTERBLOWS), SOFTERBLOWS halves it (at least 1). Reactions are unaffected.
 */
export function incomingDamage(world: World, t: Fighter, dmg: number): number {
  if (t.team !== 'hero' || dmg <= 0) return dmg;
  if (heroCheat(world, t, Cheat.SAFEHEART)) return 0;
  if (heroCheat(world, t, Cheat.SOFTERBLOWS)) return Math.max(1, Math.trunc(dmg / 2));
  return dmg;
}

/** Outgoing Health and Resolve damage of a hero: STRONGHANDS doubles it (scaling stays). */
export function outgoingDamage(world: World, att: Fighter | undefined, dmg: number): number {
  if (!att || dmg <= 0) return dmg;
  return heroCheat(world, att, Cheat.STRONGHANDS) ? dmg * 2 : dmg;
}
