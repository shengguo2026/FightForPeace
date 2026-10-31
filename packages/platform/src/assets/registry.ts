import defaultManifest from './manifest.json';

/** Placeholder families: how a missing asset is drawn until approved art arrives. */
export type PlaceholderFamily =
  'standing' | 'aerial' | 'low' | 'ground' | 'dash' | 'idle' | 'panel' | 'sound' | 'unknown';

export type ResolvedAsset =
  | { kind: 'approved'; id: string; url: string }
  | { kind: 'placeholder'; id: string; family: PlaceholderFamily; label: string };

export interface AssetManifest {
  version: number;
  assets: Record<string, { url: string; status?: 'candidate' | 'approved' }>;
}

const POSE_FAMILIES: readonly PlaceholderFamily[] = ['standing', 'aerial', 'low', 'ground', 'dash'];

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
}
