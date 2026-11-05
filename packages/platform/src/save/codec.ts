import {
  SAVE_VERSION,
  normalizeProfile,
  type Profile,
} from './schema';
import { emptyProgress } from './progress';

/**
 * Save envelopes: canonical JSON (sorted keys) of the data plus a CRC-32 checksum, the
 * format name and the schema version. A damaged or edited record fails the checksum and
 * the store falls back to the known-good snapshot.
 */
export const PROFILE_FORMAT = 'ffp-profile';
export const BACKUP_FORMAT = 'ffpsave';
export const BACKUP_EXTENSION = '.ffpsave';

/** JSON with object keys sorted at every level, so equal data has one encoding. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      const val = (v as Record<string, unknown>)[k];
      if (val !== undefined) out[k] = sortKeys(val);
    }
    return out;
  }
  return v;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE) of the UTF-8 bytes of `text`, as 8 hex digits. */
export function crc32(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export interface ProfileEnvelope {
  format: typeof PROFILE_FORMAT;
  version: number;
  savedAt: number;
  checksum: string;
  data: unknown;
}

export function encodeProfile(p: Profile, now = Date.now()): string {
  const body = canonicalJson(p);
  const env: ProfileEnvelope = {
    format: PROFILE_FORMAT,
    version: SAVE_VERSION,
    savedAt: now,
    checksum: crc32(body),
    data: JSON.parse(body),
  };
  return JSON.stringify(env);
}

export type DecodeResult =
  | { ok: true; profile: Profile; version: number; migrated: boolean }
  | { ok: false; error: string };

/** Older schema versions, upgraded one step at a time (version n → n + 1). */
export const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> =
  {
    // 1 → 2 (M11): the progress record and per-hero cheat preferences. Existing stage
    // clears keep their mission records; their Credits are not paid out retroactively.
    1: (d) => {
      const cheats = (d.cheats ?? {}) as Record<string, unknown>;
      return { ...d, cheats: { ...cheats, heroPrefs: {} }, progress: emptyProgress() };
    },
  };

export function migrate(data: unknown, from: number): unknown {
  let d = data as Record<string, unknown>;
  for (let v = from; v < SAVE_VERSION; v += 1) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`no migration from save version ${v}`);
    d = step(structuredClone(d));
  }
  return d;
}

/** Checks the envelope and checksum, migrates older versions and validates the profile. */
export function decodeProfile(text: string): DecodeResult {
  let env: Partial<ProfileEnvelope>;
  try {
    env = JSON.parse(text) as Partial<ProfileEnvelope>;
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (env.format !== PROFILE_FORMAT) return { ok: false, error: 'not a profile' };
  if (typeof env.version !== 'number' || env.version < 1)
    return { ok: false, error: 'no version' };
  if (env.version > SAVE_VERSION)
    return { ok: false, error: `made by a newer game (save version ${env.version})` };
  if (crc32(canonicalJson(env.data)) !== env.checksum)
    return { ok: false, error: 'checksum mismatch' };
  try {
    const data = env.version < SAVE_VERSION ? migrate(env.data, env.version) : env.data;
    return {
      ok: true,
      profile: normalizeProfile(data),
      version: env.version,
      migrated: env.version < SAVE_VERSION,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  game: 'fight-for-peace';
  version: number;
  exportedAt: number;
  gameVersion: string;
  profiles: ProfileEnvelope[];
  checksum: string;
}

/** A portable `.ffpsave` backup of one or more profiles. */
export function encodeBackup(profiles: Profile[], gameVersion: string, now = Date.now()): string {
  const envelopes = profiles.map((p) => JSON.parse(encodeProfile(p, now)) as ProfileEnvelope);
  const file: Omit<BackupFile, 'checksum'> = {
    format: BACKUP_FORMAT,
    game: 'fight-for-peace',
    version: SAVE_VERSION,
    exportedAt: now,
    gameVersion,
    profiles: envelopes,
  };
  return JSON.stringify({ ...file, checksum: crc32(canonicalJson(file)) }, null, 1);
}

export type BackupDecode =
  | { ok: true; profiles: Profile[]; exportedAt: number; gameVersion: string; version: number }
  | { ok: false; error: string };

export function decodeBackup(text: string): BackupDecode {
  let file: Partial<BackupFile>;
  try {
    file = JSON.parse(text) as Partial<BackupFile>;
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (file.format !== BACKUP_FORMAT || file.game !== 'fight-for-peace')
    return { ok: false, error: 'not a Fight For Peace backup' };
  if (typeof file.version !== 'number' || file.version > SAVE_VERSION)
    return { ok: false, error: 'made by a newer game' };
  const { checksum, ...rest } = file;
  if (crc32(canonicalJson(rest)) !== checksum) return { ok: false, error: 'checksum mismatch' };
  if (!Array.isArray(file.profiles) || file.profiles.length === 0)
    return { ok: false, error: 'no profiles' };
  const profiles: Profile[] = [];
  for (const env of file.profiles) {
    const r = decodeProfile(JSON.stringify(env));
    if (!r.ok) return { ok: false, error: `a profile is damaged (${r.error})` };
    profiles.push(r.profile);
  }
  return {
    ok: true,
    profiles,
    exportedAt: typeof file.exportedAt === 'number' ? file.exportedAt : 0,
    gameVersion: typeof file.gameVersion === 'string' ? file.gameVersion : '?',
    version: file.version,
  };
}
