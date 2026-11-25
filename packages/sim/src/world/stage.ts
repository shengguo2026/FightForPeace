/**
 * Authored stage layouts (spec §11.2 Representative Environmental Slice). Pixels; the
 * world converts them to fixed point. Every number is an M6 candidate for the Combat Lab.
 */
export interface LayoutItem {
  weapon: string;
  x: number;
  z: number;
  /** M28: only from / up to this difficulty index (absent: every difficulty). */
  min?: number;
  max?: number;
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
    /** Weapon id of its one interactive fragment ('' = none). */
    fragment: string;
    /** M24: tags (tools whose `opens` list a tag break it at once). */
    tags?: readonly string[];
    /** M24 property class (PropertyClass) and its damage cluster (one incident per cluster). */
    property?: number;
    cluster?: number;
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
  /** M24: moving hazards (carts, rolling debris, suspended cargo, a released wagon). */
  movers?: readonly MoverLayout[];
  /** M24: moving platforms (a wagon bed, a cable cart) that carry the bodies on them. */
  platforms?: readonly PlatformLayout[];
  /** M24: support-robot stations and their interventions. */
  stations?: readonly StationLayout[];
}

/** M24 property classes (Reedwater §12). Numbers are data codes; never renumber. */
export const PropertyClass = { Expendable: 0, Protected: 1, Objective: 2, Required: 3 } as const;

/** M24 how a moving hazard may be redirected. */
export interface MoverLayout {
  /** Path from (x0, z0) to (x1, z1), pixels; it travels the path during its active frames. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  hw: number;
  hd: number;
  h: number;
  /** Frames before the first warning (staggers several movers). */
  start: number;
  rest: number;
  warn: number;
  active: number;
  damage: number;
  /** '' = cannot be redirected, 'any' = any strike, otherwise a tool tag (`redirects`). */
  redirect: string;
  /** Cycles before it stays at rest for good (0 = repeats). */
  cycles: number;
  tags: readonly string[];
  /** M27: waits at rest until a boss completes this device kind (absent: on its schedule). */
  trigger?: string;
}

export interface PlatformLayout {
  /** Travels between x0 and x1 at depth z, pixels; speed px per frame; waits at each end. */
  x0: number;
  x1: number;
  z: number;
  hw: number;
  hd: number;
  speed: number;
  wait: number;
}

/** M24 support-robot intervention kinds. Numbers are data codes; never renumber. */
export const Intervention = { Cover: 0, Delay: 1, Interfere: 2 } as const;

export interface StationLayout {
  x: number;
  z: number;
  kind: number;
  /** Frames the robot needs to reach the station (the window an enemy can disrupt). */
  approach: number;
  /** Cover: the barrier (pixels) and how long it stands; Delay: frames the next wave waits. */
  frames: number;
  cover: { x: number; z: number; hw: number; hd: number; h: number } | null;
  cooldown: number;
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
