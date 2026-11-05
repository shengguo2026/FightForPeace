/**
 * Presentation preferences the Phaser scene reads every frame (M10 accessibility and
 * audio). They change only drawing and sound, never the simulation.
 */
export const presentation = {
  /** Sound-effect gain, 0–1 (master × effects). */
  effects: 1,
  reducedFlashing: false,
  reducedShake: false,
  /** M11: each player's worn outfit as a sprite tint (null: default clothes). */
  outfitTint: [] as (number | null)[],
};
