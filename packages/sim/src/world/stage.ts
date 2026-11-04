/**
 * Authored stage layouts (spec §11.2 Representative Environmental Slice). Pixels; the
 * world converts them to fixed point. Every number is an M6 candidate for the Combat Lab.
 */
export interface LayoutItem {
  weapon: string;
  x: number;
  z: number;
}

export interface StageLayout {
  items: readonly LayoutItem[];
  /** Impact surfaces: centre, half width, half depth (floor footprint), height. */
  surfaces: readonly { x: number; z: number; hw: number; hd: number; h: number }[];
  breakables: readonly {
    x: number;
    z: number;
    hw: number;
    hd: number;
    h: number;
    /** breakPower for Loosened, Critical and Broken. */
    thresholds: readonly [number, number, number];
    /** Weapon id of its one interactive fragment. */
    fragment: string;
  }[];
  hazards: readonly {
    x: number;
    z: number;
    hw: number;
    hd: number;
    h: number;
    rest: number;
    warn: number;
    active: number;
    damage: number;
  }[];
}

/** The Combat Lab's working-mill corner: two weapons, the pillar, the sluice boards, the cog. */
export const LAB_LAYOUT: StageLayout = {
  items: [
    { weapon: 'workstaff', x: 600, z: 860 },
    { weapon: 'handwheel', x: 760, z: 950 },
  ],
  surfaces: [{ x: 1720, z: 760, hw: 55, hd: 36, h: 300 }],
  breakables: [
    {
      x: 700,
      z: 680,
      hw: 80,
      hd: 26,
      h: 230,
      thresholds: [40, 80, 120],
      fragment: 'timber-board',
    },
  ],
  hazards: [
    { x: 1450, z: 970, hw: 80, hd: 28, h: 170, rest: 150, warn: 45, active: 30, damage: 60 },
  ],
};
