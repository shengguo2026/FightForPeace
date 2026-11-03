import type { RecipeDef } from './types';

/** The recipe's attack steps (jump-chase hints removed). */
export function recipeAttackSteps(recipe: RecipeDef): RecipeDef['steps'] {
  return recipe.steps.filter((s) => !s.jump);
}

/**
 * How many attack steps of a recipe one target context's route has performed: the actions
 * of `hero` that connected, in order, must start with the recipe's steps. Hits by other
 * heroes in the same context (a helping partner) are ignored.
 */
export function recipeProgress(recipe: RecipeDef, route: readonly number[], hero: number): number {
  const mine = route.filter((c) => Math.trunc(c / 64) === hero).map((c) => c % 64);
  const steps = recipeAttackSteps(recipe);
  let n = 0;
  while (n < steps.length && n < mine.length && steps[n]!.any.includes(mine[n]!)) n += 1;
  return n;
}

export function recipeDone(recipe: RecipeDef, route: readonly number[], hero: number): boolean {
  return recipeProgress(recipe, route, hero) === recipeAttackSteps(recipe).length;
}
