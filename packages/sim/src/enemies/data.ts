import { ARENA_DATA, DIFFICULTY_DATA, ENEMY_PROFILES } from '../combat/heroes.gen';
import { Cheat, sessionCheat } from '../cheats/cheats';
import { ENEMIES, kitOf } from '../combat/roster';
import type {
  AiAttackDef,
  ArenaDef,
  BossPhaseDef,
  DifficultyDef,
  EnemyProfile,
} from '../combat/types';
import type { Fighter, World } from '../world/types';

/** Arena scenarios, difficulty profiles and enemy AI profiles (generated from YAML). */
export const ARENAS: readonly ArenaDef[] = ARENA_DATA;
export const DIFFICULTIES: readonly DifficultyDef[] = DIFFICULTY_DATA;
export const PROFILES: readonly (EnemyProfile | null)[] = ENEMY_PROFILES;

/** Difficulty index of Medium, the reference profile. */
export const MEDIUM = 1;
/** Difficulty index of Hard, from which elite variants appear. */
export const HARD = 2;

export function arenaIndex(id: string): number {
  const i = ARENAS.findIndex((a) => a.id === id);
  if (i < 0) throw new Error(`unknown arena "${id}"`);
  return i;
}

export function difficultyIndex(id: string): number {
  const i = DIFFICULTIES.findIndex((d) => d.id === id);
  if (i < 0) throw new Error(`unknown difficulty "${id}"`);
  return i;
}

export function enemyKitIndex(id: string): number {
  const i = ENEMIES.findIndex((k) => k.id === id);
  if (i < 0) throw new Error(`unknown enemy kit "${id}"`);
  return i;
}

/** The AI profile of an encounter enemy, or null (heroes, Lab dummies). */
export function profileOf(f: { team: string; hero: number }): EnemyProfile | null {
  if (f.team !== 'enemy' || f.hero < 0) return null;
  return PROFILES[f.hero] ?? null;
}

export function difficultyOf(world: World): DifficultyDef {
  const d = DIFFICULTIES[world.encounter?.difficulty ?? MEDIUM]!;
  return sessionCheat(world, Cheat.QUIETCROWD) ? quietCrowd(d) : d;
}

const quiet = new Map<string, DifficultyDef>();

/**
 * QUIETCROWD: the selected profile with Easy's commitment and concurrency limits (threat
 * budget, per-hero cap, attackers, projectiles, hard control, group cooldown). Perception,
 * warnings, guard choices, roster, variants, phases and objectives stay as selected.
 */
function quietCrowd(d: DifficultyDef): DifficultyDef {
  let q = quiet.get(d.id);
  if (!q) {
    const e = DIFFICULTIES[0]!;
    q = {
      ...d,
      budget: e.budget,
      cap: e.cap,
      attackers: e.attackers,
      projectiles: e.projectiles,
      hardCC: e.hardCC,
      groupCooldown: Math.max(d.groupCooldown, e.groupCooldown),
    };
    quiet.set(d.id, q);
  }
  return q;
}

/** The boss phase a fighter is in, if it is the encounter's boss. */
export function bossPhase(world: World, f: Fighter): BossPhaseDef | null {
  const b = world.encounter?.boss;
  if (!b || b.id !== f.id) return null;
  return profileOf(f)?.boss?.phases[b.phase] ?? null;
}

/** The attack list the AI picks from now (a boss uses its current phase's list). */
export function attacksOf(world: World, f: Fighter): readonly AiAttackDef[] {
  const phase = bossPhase(world, f);
  return phase ? phase.attacks : (profileOf(f)?.attacks ?? []);
}

/** Index of an action id in the fighter's current (possibly armed) kit, or -1. */
export function actionIndex(f: Fighter, id: string): number {
  const kit = kitOf(f);
  return kit ? kit.actions.findIndex((a) => a.id === id) : -1;
}

/** Heroes still in the fight (not defeated). */
export function livingHeroes(world: World): Fighter[] {
  return world.bodies.filter((b) => b.team === 'hero' && !b.ko);
}
