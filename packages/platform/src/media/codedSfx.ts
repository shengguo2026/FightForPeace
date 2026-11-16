/**
 * The game's sound effects made in code (decided 2026-11-16: every sound effect is coded;
 * pictures, music cues and title loops are delivered files). One list for all stages:
 * the shared fight sounds, Stage 1, Stage 2 and Stage 3. See sfxKit.ts for the rules.
 */
import { renderRecipe, type Recipe, type SfxDef, type SfxGroup } from './sfxKit.ts';
import { STAGE12_RECIPES } from './stage12sfx.ts';
import { STAGE3_RECIPES } from './stage3sfx.ts';

export { SFX_RATE, SFX3_RATE, type SfxDef, type SfxGroup } from './sfxKit.ts';

/** Lab and export groups in order, with the stage each belongs to (0: shared). */
export const SFX_GROUPS: readonly { group: SfxGroup; stage: 0 | 1 | 2 | 3 }[] = [
  { group: 'combat', stage: 0 },
  { group: 'stage1', stage: 1 },
  { group: 'stage2', stage: 2 },
  { group: 'pursuit', stage: 2 },
  { group: 'greenhouse', stage: 2 },
  { group: 'horse', stage: 3 },
  { group: 'weapons', stage: 3 },
  { group: 'enemies', stage: 3 },
  { group: 'garran', stage: 3 },
  { group: 'environment', stage: 3 },
  { group: 'rescue', stage: 3 },
  { group: 'food', stage: 3 },
];

const def = ({ id, group, category, ms, use }: Recipe): SfxDef => ({
  id,
  group,
  category,
  ms,
  use,
});

/** Every coded sound (ids, groups, mixer categories, lengths, uses). */
export const CODED_SFX: readonly SfxDef[] = [...STAGE12_RECIPES, ...STAGE3_RECIPES].map(def);
/** The Stage 3 sounds. */
export const STAGE3_SFX: readonly SfxDef[] = STAGE3_RECIPES.map(def);
/** The shared fight sounds and the Stage 1 and 2 sounds. */
export const STAGE12_SFX: readonly SfxDef[] = STAGE12_RECIPES.map(def);

const BY_ID = new Map([...STAGE12_RECIPES, ...STAGE3_RECIPES].map((r) => [r.id, r]));

/** The definition of a coded sound id, if it is one. */
export function codedSfx(id: string): SfxDef | undefined {
  const r = BY_ID.get(id);
  return r ? def(r) : undefined;
}

/** Renders a coded sound (mono, `SFX_RATE`), or null for other ids. Deterministic. */
export function renderCodedSfx(id: string): Float32Array | null {
  const r = BY_ID.get(id);
  return r ? renderRecipe(r) : null;
}

/** Stage 3 names from before the Stage 1/2 sounds (kept for callers and tests). */
export const stage3Sfx = (id: string): SfxDef | undefined =>
  STAGE3_RECIPES.some((r) => r.id === id) ? codedSfx(id) : undefined;
export const renderStage3Sfx = (id: string): Float32Array | null =>
  STAGE3_RECIPES.some((r) => r.id === id) ? renderCodedSfx(id) : null;
