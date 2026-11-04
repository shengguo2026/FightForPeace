import defaultManifest from './manifest.json';

/** Placeholder families: how a missing asset is drawn until approved art arrives. */
export type PlaceholderFamily =
  | 'standing'
  | 'aerial'
  | 'low'
  | 'ground'
  | 'dash'
  | 'counter'
  | 'special'
  | 'ultimate'
  | 'grab'
  | 'grabStrike'
  | 'throw'
  | 'weaponThrow'
  | 'idle'
  | 'panel'
  | 'sound'
  | 'unknown';

export type ResolvedAsset =
  | { kind: 'approved'; id: string; url: string }
  | { kind: 'placeholder'; id: string; family: PlaceholderFamily; label: string };

/** One cell's opaque bounds in sheet-cell pixels; `foot` is the lowest opaque row. */
export interface CellBox {
  x0: number;
  y0: number;
  x1: number;
  foot: number;
}

/** A sprite sheet: a cols x rows grid of square cells (null = empty cell). */
export interface SheetMeta {
  cols: number;
  rows: number;
  cell: number;
  /** Ground line in cell pixels: the median foot of the sheet's cells. */
  ground: number;
  cells: (CellBox | null)[];
}

/** A background layer image (Stage areas): size, opaque rows and whether it tiles. */
export interface LayerMeta {
  w: number;
  h: number;
  /** First and last opaque rows (a middle layer's landmark band). */
  top: number;
  bottom: number;
  /** Seamless horizontally: drawn repeated across the arena. */
  tiled: boolean;
}

export interface ManifestEntry {
  url: string;
  status?: 'candidate' | 'approved';
  sheet?: SheetMeta;
  layer?: LayerMeta;
}

export interface AssetManifest {
  version: number;
  assets: Record<string, ManifestEntry>;
}

const POSE_FAMILIES: readonly PlaceholderFamily[] = [
  'standing',
  'aerial',
  'low',
  'ground',
  'dash',
  'counter',
  'special',
  'ultimate',
  'grab',
  'grabStrike',
  'throw',
  'weaponThrow',
];

/** The placeholder family a logical asset ID falls into. */
export function familyOf(id: string): PlaceholderFamily {
  const parts = id.split('.');
  const pose = parts.indexOf('pose');
  if (pose !== -1) {
    const fam = parts[pose + 1] as PlaceholderFamily | undefined;
    return fam && POSE_FAMILIES.includes(fam) ? fam : 'idle';
  }
  if (parts[0] === 'sfx' || parts[0] === 'mus') return 'sound';
  if (parts[0] === 'bg' || parts[0] === 'cine' || parts[0] === 'ui') return 'panel';
  return 'unknown';
}

/**
 * Logical asset ID → approved asset, or a labelled placeholder. Unknown IDs are never an
 * error: the game always has something to draw, and delivered art replaces the
 * placeholder through a manifest entry without code changes.
 */
export class AssetRegistry {
  constructor(private readonly manifest: AssetManifest = defaultManifest as AssetManifest) {}

  resolve(id: string): ResolvedAsset {
    const entry = this.manifest.assets[id];
    if (entry && entry.status !== 'candidate') return { kind: 'approved', id, url: entry.url };
    const label = id.split('.').pop() ?? id;
    return { kind: 'placeholder', id, family: familyOf(id), label };
  }

  /** An approved sprite sheet, if the manifest has one for this id. */
  sheet(id: string): (ManifestEntry & { sheet: SheetMeta }) | undefined {
    const entry = this.manifest.assets[id];
    if (!entry || entry.status === 'candidate' || !entry.sheet) return undefined;
    return entry as ManifestEntry & { sheet: SheetMeta };
  }

  /** An approved background layer, if the manifest has one for this id. */
  layer(id: string): (ManifestEntry & { layer: LayerMeta }) | undefined {
    const entry = this.manifest.assets[id];
    if (!entry || entry.status === 'candidate' || !entry.layer) return undefined;
    return entry as ManifestEntry & { layer: LayerMeta };
  }

  /** Every approved background layer (for preloading). */
  layers(): { id: string; url: string; layer: LayerMeta }[] {
    return Object.entries(this.manifest.assets).flatMap(([id, e]) =>
      e.layer && e.status !== 'candidate' ? [{ id, url: e.url, layer: e.layer }] : [],
    );
  }

  /** Every approved sprite sheet (for preloading). */
  sheets(): { id: string; url: string; sheet: SheetMeta }[] {
    return Object.entries(this.manifest.assets).flatMap(([id, e]) =>
      e.sheet && e.status !== 'candidate' ? [{ id, url: e.url, sheet: e.sheet }] : [],
    );
  }
}
