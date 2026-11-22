import * as Phaser from 'phaser';
import type { AssetRegistry } from '@ffp/platform';

/**
 * Loads the sprite sheets a mode needs when it needs them (2026-11-22).
 *
 * The game used to load every approved sheet at start (about 730 images, 680 megapixels),
 * so nothing moved for about 19 s and every art import made it slower (lessons_learned.md
 * M1). Sheets are grouped into families: one per hero and outfit (`hero.mountain`,
 * `hero.mountain.s3`), one per enemy art (`enemy.marek`), and `core` (props, effects and
 * villagers, small enough to load at start). A family loads the first time one of its
 * sheets is asked for; while a family that is being drawn is still loading, `pending` is
 * true and the game holds the simulation, so no fighter acts without its art.
 */
export function familyOf(id: string): string {
  const p = id.split('.');
  if (p[0] === 'hero') return p[2] === 's3' ? `hero.${p[1]}.s3` : `hero.${p[1]}`;
  if (p[0] === 'enemy') return `enemy.${p[1]}`;
  return 'core';
}

type Sheet = ReturnType<AssetRegistry['sheets']>[number];

export class ArtLoader {
  private readonly families = new Map<string, Sheet[]>();
  private readonly ready = new Set<string>();
  private readonly loading = new Set<string>();
  /** A family asked for since the last `beginFrame` is not ready yet. */
  private waiting = false;

  constructor(
    private readonly scene: Phaser.Scene,
    assets: AssetRegistry,
  ) {
    for (const s of assets.sheets()) {
      const f = familyOf(s.id);
      const list = this.families.get(f) ?? [];
      list.push(s);
      this.families.set(f, list);
    }
  }

  /** Scene preload: only the core family (props, effects, villagers). */
  preloadCore(): void {
    for (const s of this.families.get('core') ?? []) this.add(s);
    this.ready.add('core');
  }

  /** Called at the start of each drawn frame. */
  beginFrame(): void {
    this.waiting = false;
  }

  /** A family the current frame draws is still loading: hold the simulation. */
  get pending(): boolean {
    return this.waiting;
  }

  /** Whether a family has finished loading (tests, the debug hook). */
  isReady(family: string): boolean {
    return this.ready.has(family);
  }

  /** Every family has finished loading. */
  get allReady(): boolean {
    for (const f of this.families.keys()) if (!this.ready.has(f)) return false;
    return true;
  }

  /** Starts loading every family not loaded yet (online lobbies). */
  requestAll(): void {
    this.request(...this.families.keys());
  }

  /**
   * Whether a sheet can be drawn now. A sheet that is not loaded yet asks for its family
   * (once) and marks the frame as waiting.
   */
  has(sheet: string): boolean {
    if (this.scene.textures.exists(sheet)) return true;
    const family = familyOf(sheet);
    if (!this.families.has(family) || this.ready.has(family)) return false;
    this.waiting = true;
    this.request(family);
    return false;
  }

  /** Starts loading families (a stage's roster can be asked for ahead of its waves). */
  request(...families: string[]): void {
    const want = families.filter(
      (f) => this.families.has(f) && !this.ready.has(f) && !this.loading.has(f),
    );
    if (want.length === 0) return;
    for (const f of want) {
      this.loading.add(f);
      for (const s of this.families.get(f)!) this.add(s);
    }
    // Files added while the loader runs join that run; COMPLETE fires once all are done.
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      for (const f of want) {
        this.loading.delete(f);
        this.ready.add(f);
      }
    });
    this.scene.load.start();
  }

  private add(s: Sheet): void {
    this.scene.load.spritesheet(s.id, s.url, {
      frameWidth: s.sheet.w ?? s.sheet.cell,
      frameHeight: s.sheet.cell,
    });
  }
}
