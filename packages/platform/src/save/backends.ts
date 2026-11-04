/**
 * Where saves live (review 06 §2.4): a small key-value store of named text records.
 * - IndexedDB in the browser build (`pnpm dev`, any browser),
 * - the portable build's local server, which writes them into `saves/` in the game folder,
 * - memory, for tests and for a browser without storage (then nothing persists).
 */
export interface SaveBackend {
  readonly kind: 'indexeddb' | 'server' | 'memory';
  read(name: string): Promise<string | null>;
  write(name: string, text: string): Promise<void>;
  remove(name: string): Promise<void>;
  /** Names starting with `prefix`, sorted. */
  list(prefix: string): Promise<string[]>;
}

/** Record names: lowercase letters, digits and `. _ -`, so they are safe file names too. */
export const RECORD_NAME = /^[a-z0-9][a-z0-9._-]{0,95}$/;

function checkName(name: string): void {
  if (!RECORD_NAME.test(name)) throw new Error(`invalid save record name "${name}"`);
}

export class MemoryBackend implements SaveBackend {
  readonly kind = 'memory' as const;
  readonly records = new Map<string, string>();
  read(name: string): Promise<string | null> {
    return Promise.resolve(this.records.get(name) ?? null);
  }
  write(name: string, text: string): Promise<void> {
    checkName(name);
    this.records.set(name, text);
    return Promise.resolve();
  }
  remove(name: string): Promise<void> {
    this.records.delete(name);
    return Promise.resolve();
  }
  list(prefix: string): Promise<string[]> {
    return Promise.resolve([...this.records.keys()].filter((k) => k.startsWith(prefix)).sort());
  }
}

const DB_NAME = 'fight-for-peace';
const STORE = 'saves';

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, fail) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error ?? new Error('IndexedDB request failed'));
  });
}

/** IndexedDB: one object store of name → text; every write is its own transaction. */
export class IndexedDbBackend implements SaveBackend {
  readonly kind = 'indexeddb' as const;
  private constructor(private readonly db: IDBDatabase) {}

  static async open(factory: IDBFactory = indexedDB): Promise<IndexedDbBackend> {
    const req = factory.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    return new IndexedDbBackend(await request(req));
  }

  private store(mode: IDBTransactionMode): IDBObjectStore {
    return this.db.transaction(STORE, mode).objectStore(STORE);
  }

  async read(name: string): Promise<string | null> {
    const v = (await request(this.store('readonly').get(name))) as unknown;
    return typeof v === 'string' ? v : null;
  }

  write(name: string, text: string): Promise<void> {
    checkName(name);
    const tx = this.db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(text, name);
    return new Promise((ok, fail) => {
      tx.oncomplete = () => ok();
      tx.onerror = () => fail(tx.error ?? new Error('IndexedDB write failed'));
      tx.onabort = () => fail(tx.error ?? new Error('IndexedDB write aborted'));
    });
  }

  async remove(name: string): Promise<void> {
    await request(this.store('readwrite').delete(name));
  }

  async list(prefix: string): Promise<string[]> {
    const keys = await request(this.store('readonly').getAllKeys());
    return keys
      .filter((k): k is string => typeof k === 'string' && k.startsWith(prefix))
      .sort();
  }
}

/** The portable server's save API (tools/portable/server.mjs). */
export const SAVES_PATH = '/__ffp/saves/';

export class ServerBackend implements SaveBackend {
  readonly kind = 'server' as const;
  constructor(private readonly fetcher: typeof fetch = (...a) => fetch(...a)) {}

  async read(name: string): Promise<string | null> {
    checkName(name);
    const r = await this.fetcher(SAVES_PATH + name, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`save server: ${r.status}`);
    return r.text();
  }

  async write(name: string, text: string): Promise<void> {
    checkName(name);
    const r = await this.fetcher(SAVES_PATH + name, {
      method: 'PUT',
      body: text,
      headers: { 'Content-Type': 'application/json' },
    });
    if (!r.ok) throw new Error(`save server: ${r.status}`);
  }

  async remove(name: string): Promise<void> {
    checkName(name);
    const r = await this.fetcher(SAVES_PATH + name, { method: 'DELETE' });
    if (!r.ok && r.status !== 404) throw new Error(`save server: ${r.status}`);
  }

  async list(prefix: string): Promise<string[]> {
    const r = await this.fetcher(`${SAVES_PATH}?prefix=${encodeURIComponent(prefix)}`, {
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`save server: ${r.status}`);
    const names = (await r.json()) as unknown;
    return Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string') : [];
  }
}

/**
 * Picks the backend: the portable server when it says it stores saves, otherwise
 * IndexedDB, otherwise memory (and the caller shows that nothing will be kept).
 */
export async function openBackend(): Promise<SaveBackend> {
  try {
    const r = await fetch('/__ffp/id', { cache: 'no-store' });
    if (r.ok) {
      const info = (await r.json()) as { saves?: boolean };
      if (info.saves) return new ServerBackend();
    }
  } catch {
    // Not the portable server.
  }
  try {
    if (typeof indexedDB !== 'undefined') return await IndexedDbBackend.open();
  } catch {
    // Private mode or storage blocked.
  }
  return new MemoryBackend();
}
