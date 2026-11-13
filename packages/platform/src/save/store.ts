import type { SaveBackend } from './backends';
import { decodeBackup, decodeProfile, encodeBackup, encodeProfile } from './codec';
import {
  DEFAULT_DEVICE,
  normalizeDevice,
  newProfileId,
  SAVE_VERSION,
  type DeviceRecord,
  type Profile,
} from './schema';

/**
 * Profiles on top of a SaveBackend (spec §15.1):
 * - `profile.<id>` is the current save, `profile.<id>.prev` the previous known-good one.
 *   A write first copies the current (valid) save to `.prev`, then writes the new one, so
 *   an interrupted write never loses both.
 * - Loading checks the checksum; a damaged save falls back to the snapshot.
 * - An older schema is migrated; the original stays as `profile.<id>.v<n>` until the
 *   migrated copy has been written.
 * - One backup per profile per day (`backup.<id>.<yyyymmdd>`), the newest 5 kept.
 * - Import never silently overwrites: a recovery snapshot (`recovery.<time>`) of every
 *   profile is written first; merge adds profiles (a clashing id gets a new id), replace
 *   only touches the profiles the player selected.
 */
export const BACKUPS_KEPT = 5;
export const RECOVERIES_KEPT = 5;

export interface LoadResult {
  profile: Profile | null;
  /** The current save was damaged and the previous snapshot was used. */
  recovered: boolean;
  migratedFrom: number | null;
  error: string | null;
}

export interface ImportPreview {
  ok: boolean;
  error?: string;
  exportedAt?: number;
  gameVersion?: string;
  profiles: { id: string; name: string; updatedAt: number; exists: boolean; cleared: number }[];
}

export type ImportMode = { mode: 'merge' } | { mode: 'replace'; ids: string[] };

export interface ImportResult {
  added: string[];
  replaced: string[];
  recovery: string;
}

const day = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

export class ProfileStore {
  constructor(
    readonly backend: SaveBackend,
    private readonly gameVersion: string,
    private readonly clock: () => number = Date.now,
  ) {}

  async listIds(): Promise<string[]> {
    const names = await this.backend.list('profile.');
    return names.map((n) => n.slice('profile.'.length)).filter((id) => !id.includes('.'));
  }

  /** Every profile that loads (damaged ones without a good snapshot are skipped). */
  async loadAll(): Promise<Profile[]> {
    const out: Profile[] = [];
    for (const id of await this.listIds()) {
      const r = await this.load(id);
      if (r.profile) out.push(r.profile);
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async load(id: string): Promise<LoadResult> {
    const main = await this.backend.read(`profile.${id}`);
    if (main !== null) {
      const r = decodeProfile(main);
      if (r.ok) {
        if (r.migrated) {
          await this.backend.write(`profile.${id}.v${r.version}`, main);
          await this.backend.write(`profile.${id}`, encodeProfile(r.profile, this.clock()));
        }
        return {
          profile: r.profile,
          recovered: false,
          migratedFrom: r.migrated ? r.version : null,
          error: null,
        };
      }
      const prev = await this.backend.read(`profile.${id}.prev`);
      const p = prev === null ? null : decodeProfile(prev);
      if (p?.ok) return { profile: p.profile, recovered: true, migratedFrom: null, error: r.error };
      return { profile: null, recovered: false, migratedFrom: null, error: r.error };
    }
    return { profile: null, recovered: false, migratedFrom: null, error: 'not found' };
  }

  async save(profile: Profile): Promise<void> {
    if (profile.guest) return;
    const now = this.clock();
    profile.updatedAt = now;
    const name = `profile.${profile.id}`;
    const current = await this.backend.read(name);
    if (current !== null && decodeProfile(current).ok)
      await this.backend.write(`${name}.prev`, current);
    const text = encodeProfile(profile, now);
    await this.backend.write(name, text);
    await this.backupDaily(profile.id, text, now);
  }

  private async backupDaily(id: string, text: string, now: number): Promise<void> {
    const prefix = `backup.${id}.`;
    const name = prefix + day(now);
    const existing = await this.backend.list(prefix);
    if (!existing.includes(name)) {
      await this.backend.write(name, text);
      existing.push(name);
    }
    existing.sort();
    for (const old of existing.slice(0, Math.max(0, existing.length - BACKUPS_KEPT)))
      await this.backend.remove(old);
  }

  async remove(id: string): Promise<void> {
    for (const n of await this.backend.list(`profile.${id}`))
      if (n === `profile.${id}` || n.startsWith(`profile.${id}.`)) await this.backend.remove(n);
  }

  /** The daily backups of a profile, newest first. */
  async backups(id: string): Promise<{ name: string; day: string }[]> {
    const names = await this.backend.list(`backup.${id}.`);
    return names.reverse().map((name) => ({ name, day: name.slice(`backup.${id}.`.length) }));
  }

  /** Restores a daily backup (the current save becomes the previous snapshot). */
  async restoreBackup(name: string): Promise<Profile | null> {
    const text = await this.backend.read(name);
    const r = text === null ? null : decodeProfile(text);
    if (!r?.ok) return null;
    await this.save(r.profile);
    return r.profile;
  }

  async exportBackup(ids?: string[]): Promise<string> {
    const all = await this.loadAll();
    return encodeBackup(
      ids ? all.filter((p) => ids.includes(p.id)) : all,
      this.gameVersion,
      this.clock(),
    );
  }

  async previewImport(text: string): Promise<ImportPreview> {
    const r = decodeBackup(text);
    if (!r.ok) return { ok: false, error: r.error, profiles: [] };
    const ids = new Set(await this.listIds());
    return {
      ok: true,
      exportedAt: r.exportedAt,
      gameVersion: r.gameVersion,
      profiles: r.profiles.map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        exists: ids.has(p.id),
        cleared: Object.values(p.missions).filter((m) => m.clears > 0).length,
      })),
    };
  }

  async applyImport(text: string, how: ImportMode): Promise<ImportResult> {
    const r = decodeBackup(text);
    if (!r.ok) throw new Error(r.error);
    const recovery = `recovery.${this.clock()}`;
    await this.backend.write(recovery, await this.exportBackup());
    const old = (await this.backend.list('recovery.')).sort();
    for (const n of old.slice(0, Math.max(0, old.length - RECOVERIES_KEPT)))
      await this.backend.remove(n);
    const ids = new Set(await this.listIds());
    const added: string[] = [];
    const replaced: string[] = [];
    for (const p of r.profiles) {
      if (how.mode === 'replace') {
        if (!how.ids.includes(p.id)) continue;
        await this.save(p);
        (ids.has(p.id) ? replaced : added).push(p.id);
      } else {
        const copy = ids.has(p.id) ? { ...p, id: newProfileId(this.clock()) } : p;
        await this.save(copy);
        added.push(copy.id);
      }
    }
    return { added, replaced, recovery };
  }

  /** Recovery snapshots taken before imports, newest first. */
  async recoveries(): Promise<string[]> {
    return (await this.backend.list('recovery.')).reverse();
  }

  async restoreRecovery(name: string): Promise<void> {
    const text = await this.backend.read(name);
    if (text === null) throw new Error('recovery snapshot not found');
    const r = decodeBackup(text);
    if (!r.ok) throw new Error(r.error);
    for (const p of r.profiles) await this.save(p);
  }

  async device(): Promise<DeviceRecord> {
    const text = await this.backend.read('device');
    if (text === null) return { ...DEFAULT_DEVICE };
    try {
      return normalizeDevice(JSON.parse(text));
    } catch {
      return { ...DEFAULT_DEVICE };
    }
  }

  async saveDevice(d: DeviceRecord): Promise<void> {
    await this.backend.write('device', JSON.stringify({ ...d, version: SAVE_VERSION }));
  }
}

/**
 * Only one tab may write a profile (spec §15.1): a Web Lock named after the profile is
 * held for as long as the tab uses it. A second tab gets `false` and stays read-only.
 * Without the Web Locks API (old browsers) every tab may write.
 */
export class WriterLock {
  private release: (() => void) | null = null;
  held: string | null = null;

  constructor(private readonly locks: LockManager | undefined = globalThis.navigator?.locks) {}

  async acquire(profileId: string): Promise<boolean> {
    this.drop();
    if (!this.locks) {
      this.held = profileId;
      return true;
    }
    const name = `ffp-profile-${profileId}`;
    return new Promise<boolean>((resolve) => {
      void this.locks!.request(name, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        this.held = profileId;
        resolve(true);
        return new Promise<void>((done) => (this.release = done));
      });
    });
  }

  drop(): void {
    this.release?.();
    this.release = null;
    this.held = null;
  }
}
