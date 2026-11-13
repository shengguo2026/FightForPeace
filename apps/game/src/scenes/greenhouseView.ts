import * as Phaser from 'phaser';
import {
  AssetState,
  type Fighter,
  GREENHOUSE,
  GRENADIER_ID,
  Special,
  GhEvent,
  GrenadePhase,
  type Greenhouse,
  type Item,
  ItemState,
  JetPhase,
  ROOMS,
  RackState,
  WEAPONS,
  circulating,
  fxToPixels,
  ledgerGrade,
} from '@ffp/sim';
import { AssetRegistry } from '@ffp/platform';
import { audio } from '../media/audio';
import { dt, t, type TextId } from '../text/i18n';
import { TextPool } from './pursuitView';

const px = fxToPixels;
const CALLOUT_FRAMES = 70;
const CAPTION_FRAMES = 150;
/** Asset state colours; every state is also written out (never colour alone). */
const STATE_COLOR = [0x6fd18a, 0xffd166, 0xff6b4a, 0x8fb8ff, 0x777777];
const STATE_TEXT = ['#c9f5d4', '#ffe7a3', '#ffb3a3', '#cfe0ff', '#bbbbbb'];
const CATEGORY_COLOR = [0xd8c7a0, 0x5fb7d9, 0x7cc46a, 0xb0b6c0, 0xd8c7a0];

/**
 * M22 Stage 2 prop art for the room's pieces (sheet, cell per state). Ledger objectives:
 * PROP-S2-OBJECTIVES, damaged from Damaged on (OBJECTIVES-DAMAGED); containers closed and
 * opened; breakables by integrity; pantry food. Pieces without art keep their greybox.
 */
const OBJECTIVE_CELL: Partial<Record<string, number>> = {
  aeration: 0,
  filtration: 1,
  pump: 2,
  'medicinal-bed': 3,
  'seed-reserve': 4,
  'dispatch-control': 5,
};
const CONTAINER_ART: Partial<Record<string, { sheet: string; cells: readonly number[] }>> = {
  'harvest-tote': { sheet: 'prop.s2-containers-a', cells: [0, 1] },
  'meal-carrier': { sheet: 'prop.s2-containers-a', cells: [2, 3] },
  'clinic-cabinet': { sheet: 'prop.s2-containers-a', cells: [4, 5] },
  'maintenance-locker': { sheet: 'prop.s2-containers-b', cells: [0, 1] },
  'emergency-cabinet': { sheet: 'prop.s2-containers-b', cells: [2, 3] },
  'raider-case': { sheet: 'prop.s2-containers-b', cells: [4, 5] },
  // Breakables: intact, damaged, broken open.
  'stolen-cargo-crate': { sheet: 'prop.s2-breakables', cells: [0, 1, 2] },
  'damaged-irrigation-housing': { sheet: 'prop.s2-breakables', cells: [3, 4, 5] },
};
const FOOD_CELL: Partial<Record<string, number>> = {
  'greenhouse-wrap': 0,
  'herb-fish-bowl': 1,
  'mineral-broth': 2,
  'honey-rice-cake': 3,
  'harvest-stew': 4,
};

const EVENT: Partial<Record<number, { key: TextId; color: string; sfx?: string }>> = {
  [GhEvent.Opened]: { key: 'gh.ev.opened', color: '#7ddc7d', sfx: 'sfx.rescue.open' },
  [GhEvent.Broke]: { key: 'gh.ev.broke', color: '#ffd166', sfx: 'sfx.crush.case' },
  [GhEvent.Ate]: { key: 'gh.ev.ate', color: '#7ddc7d', sfx: 'sfx.run.food' },
  [GhEvent.Repaired]: { key: 'gh.ev.repaired', color: '#7ddc7d', sfx: 'sfx.rescue.repair' },
  [GhEvent.Fallback]: { key: 'gh.ev.fallback', color: '#8fb8ff', sfx: 'sfx.phase.fallback' },
  [GhEvent.Lost]: { key: 'gh.ev.lost', color: '#ff6b6b', sfx: 'sfx.phase.lost' },
  [GhEvent.RackLoose]: { key: 'gh.ev.rackLoose', color: '#ffd166' },
  [GhEvent.RackTopple]: { key: 'gh.ev.rackTopple', color: '#ff8f6b', sfx: 'sfx.knockdown.rack' },
  [GhEvent.RackRighted]: { key: 'gh.ev.rackRighted', color: '#7ddc7d' },
  [GhEvent.JetWarn]: { key: 'gh.ev.jetWarn', color: '#ffb020', sfx: 'sfx.exact.jet' },
  [GhEvent.JetFire]: { key: 'gh.ev.jetFire', color: '#7df9ff', sfx: 'sfx.dash.jet' },
  [GhEvent.Redirected]: { key: 'gh.ev.redirected', color: '#7df9ff', sfx: 'sfx.run.redirect' },
  [GhEvent.Lashed]: { key: 'gh.ev.lashed', color: '#ffd166', sfx: 'sfx.grab.strap' },
  [GhEvent.Fitted]: { key: 'gh.ev.fitted', color: '#7ddc7d' },
  [GhEvent.GrenadeSecured]: { key: 'gh.ev.secured', color: '#7ddc7d', sfx: 'sfx.rescue.secure' },
  [GhEvent.GrenadeReturned]: { key: 'gh.ev.returned', color: '#ffd166', sfx: 'sfx.throw.grenade' },
  [GhEvent.Blast]: { key: 'gh.ev.blast', color: '#ff6b4a', sfx: 'sfx.crush.blast' },
};

/** Grenade captions (subtitle line) and their warning sounds (spec §9.3: visual, audio, caption). */
const CAPTION: Partial<Record<number, { key: TextId; sfx: string }>> = {
  [GhEvent.GrenadeRemove]: { key: 'gh.cap.remove', sfx: 'sfx.exact.draw' },
  [GhEvent.GrenadeArm]: { key: 'gh.cap.arm', sfx: 'sfx.exact.arm' },
  [GhEvent.GrenadeAim]: { key: 'gh.cap.aim', sfx: 'sfx.exact.aim' },
  [GhEvent.GrenadeThrow]: { key: 'gh.cap.throw', sfx: 'sfx.throw.lob' },
  [GhEvent.GrenadeDropped]: { key: 'gh.cap.dropped', sfx: 'sfx.ui.drop' },
  [GhEvent.GrenadeLiveDrop]: { key: 'gh.cap.liveDrop', sfx: 'sfx.exact.live' },
  [GhEvent.Blast]: { key: 'gh.cap.blast', sfx: 'sfx.crush.blast' },
};

/**
 * M18 greybox presentation of a greenhouse room: glass walls and beds, every Ledger asset
 * with its condition bar and written state, containers (protected or breakable), pantry
 * items, the shutter, the seedling rack, the purge jet's lanes and valve, the redirect
 * wheel, the cargo strap and bay, the grenade with its fuse ring and the thrower's
 * telegraphs, callouts and captions, and the Ledger panel. Reads the simulation only.
 */
export class GreenhouseView {
  private floor!: Phaser.GameObjects.Graphics;
  private back!: Phaser.GameObjects.Graphics;
  private front!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private words!: TextPool;
  private hudWords!: TextPool;
  private lastEvent = '';
  private callout: { text: string; color: string; x: number; z: number; until: number } | null =
    null;
  private caption: { text: string; until: number } | null = null;
  /** M22: prop sprites by piece key, and the keys drawn this frame. */
  private readonly assets = new AssetRegistry();
  private readonly props = new Map<string, Phaser.GameObjects.Image>();
  private readonly used = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * M22: draws one prop cell standing on (x, z), `h` pixels tall; false when the art is
   * missing (the greybox piece is drawn instead).
   */
  private prop(key: string, sheet: string, cell: number, x: number, z: number, h: number): boolean {
    const meta = this.assets.sheet(sheet)?.sheet;
    const c = meta?.cells[cell];
    if (!meta || !c || !this.scene.textures.exists(sheet)) return false;
    let img = this.props.get(key);
    if (!img) {
      img = this.scene.add.image(0, 0, sheet, cell);
      this.props.set(key, img);
    }
    img.setTexture(sheet, cell).setVisible(true);
    img.setOrigin(0.5, c.foot / meta.cell);
    img.setScale(h / Math.max(1, c.foot - c.y0));
    img.setPosition(x, z);
    img.setDepth(1 + z / 10000);
    this.used.add(key);
    return true;
  }

  /** M22: hides the prop sprites not drawn this frame. */
  private endProps(): void {
    for (const [k, img] of this.props) if (!this.used.has(k)) img.setVisible(false);
    this.used.clear();
  }

  create(): void {
    this.floor = this.scene.add.graphics().setDepth(-0.5);
    this.back = this.scene.add.graphics().setDepth(0.9);
    this.front = this.scene.add.graphics().setDepth(3);
    this.hud = this.scene.add.graphics().setScrollFactor(0).setDepth(20);
    this.words = new TextPool(this.scene, false, 6);
    this.hudWords = new TextPool(this.scene, true, 21);
  }

  hide(): void {
    this.used.clear();
    this.endProps();
    for (const g of [this.floor, this.back, this.front, this.hud]) g.clear();
    this.words.begin();
    this.words.end();
    this.hudWords.begin();
    this.hudWords.end();
  }

  draw(
    gh: Greenhouse,
    bodies: readonly Fighter[],
    items: readonly Item[],
    frame: number,
    hints: readonly { x: number; z: number; hint: number }[],
    /** M22: the area's backdrop art is drawn, so the greybox walls and floor are not. */
    art = false,
  ): void {
    for (const g of [this.floor, this.back, this.front, this.hud]) g.clear();
    this.words.begin();
    this.hudWords.begin();
    const room = ROOMS[gh.room]!;
    const G = GREENHOUSE!;
    const width = room.width;
    const blink = Math.floor(frame / 8) % 2 === 0;
    // Glass walls and the floor (greybox; M22: the Stage 2 area's art when it is drawn).
    if (!art) {
      const f = this.floor;
      f.fillStyle(0x203a34, 1);
      f.fillRect(0, 0, width, 1080);
      f.fillStyle(0x6f9c8f, 0.35);
      f.fillRect(0, 120, width, 460);
      f.lineStyle(2, 0xbfe6dc, 0.35);
      for (let x = 0; x <= width; x += 160) f.lineBetween(x, 120, x, 580);
      f.lineBetween(0, 340, width, 340);
      f.fillStyle(0x4b5a50, 1);
      f.fillRect(0, 580, width, 500);
      f.lineStyle(2, 0x5f7064, 1);
      for (let x = 0; x <= width; x += 120) f.lineBetween(x, 580, x, 1080);
    }
    // Purge-jet lanes (the current one marked; warned and active phases pulse).
    const jet = room.jet;
    if (jet && gh.jet) {
      jet.lanes.forEach((l, i) => {
        const current = i === gh.jet!.lane;
        const [x0, x1, z0, z1] = [px(l.x0), px(l.x1), px(l.z0), px(l.z1)];
        const phase = gh.jet!.phase;
        const alpha =
          current && phase === JetPhase.Active
            ? 0.6
            : current && phase === JetPhase.Warn
              ? blink
                ? 0.45
                : 0.2
              : current
                ? 0.14
                : 0.05;
        this.back.fillStyle(phase === JetPhase.Active && current ? 0x7df9ff : 0x5fb7d9, alpha);
        this.back.fillRect(x0, z0, x1 - x0, z1 - z0);
        if (current) {
          this.back.lineStyle(3, 0x7df9ff, phase === JetPhase.Warn && blink ? 1 : 0.5);
          this.back.strokeRect(x0, z0, x1 - x0, z1 - z0);
        }
      });
      const vx = px(jet.x);
      const vz = px(jet.z);
      this.box(this.back, vx, vz, 18, 12, 70, 0x2f6f8f);
      const left = Math.max(0, jet.warn - (frame - gh.jet.frame));
      const label =
        gh.jet.phase === JetPhase.Ready
          ? t('gh.jet.ready')
          : gh.jet.phase === JetPhase.Warn
            ? `${t('gh.jet.warn')} ${(left / 60).toFixed(1)}`
            : gh.jet.phase === JetPhase.Active
              ? t('gh.ev.jetFire')
              : t('gh.jet.cooldown');
      this.words.put(vx, vz - 96, label, 18, '#bff6ff');
    }
    // Redirect wheel.
    if (room.redirect && gh.redirect) {
      const rx = px(room.redirect.x);
      const rz = px(room.redirect.z);
      this.back.lineStyle(6, 0x9fb8c8, 1);
      this.back.strokeCircle(rx, rz - 60, 34);
      this.back.lineBetween(rx - 34, rz - 60, rx + 34, rz - 60);
      this.back.lineBetween(rx, rz - 94, rx, rz - 26);
      const need = room.redirect.solo * 2;
      if (gh.redirect.progress > 0)
        this.bar(this.front, rx - 50, rz - 112, 100, 8, gh.redirect.progress, need, 0x7df9ff);
      this.words.put(rx, rz - 128, t('gh.redirect'), 18, '#d8ecff');
    }
    // Cargo strap: the bay and the anchor.
    if (room.restraint && gh.restraint) {
      const r = room.restraint;
      const [zx, zz, hw, hd] = [px(r.zx), px(r.zz), px(r.hw), px(r.hd)];
      this.back.lineStyle(3, 0xffb020, 0.6);
      this.back.strokeRect(zx - hw, zz - hd, hw * 2, hd * 2);
      this.box(this.back, px(r.x), px(r.z), 16, 10, 50, 0x8a6a2a);
      const ready = gh.restraint.target === 0 && frame >= gh.restraint.ready;
      this.words.put(
        px(r.x),
        px(r.z) - 70,
        `${t('gh.restraint')} · ${ready ? t('gh.restraint.ready') : t('gh.restraint.wait')}`,
        18,
        ready ? '#ffe7a3' : '#bbbbbb',
      );
      const held = bodies.find((b) => b.id === gh.restraint!.target);
      if (held) {
        this.front.lineStyle(5, 0xffb020, 1);
        this.front.lineBetween(px(r.x), px(r.z) - 30, px(held.x), px(held.z) - 60);
      }
    }
    // M19: assets a hostile objective is working on right now (Control Breach, Scorched
    // Claim) are marked THREATENED (word and blinking outline, not colour alone).
    const threatened = new Set<number>();
    for (const b of bodies) {
      if (b.special === Special.Breach && b.breachAsset > 0) threatened.add(b.breachAsset - 1);
      if (b.special === Special.Scorch && room.scorch >= 0) threatened.add(room.scorch);
    }
    // Ledger assets.
    for (const [ai, a] of gh.assets.entries()) {
      if (threatened.has(ai)) {
        const k = G.ledger[a.kind]!;
        const [tx, tz, thw, th] = [px(a.x), px(a.z), px(k.hw), px(k.h)];
        this.front.lineStyle(5, 0xff4d4d, blink ? 1 : 0.35);
        this.front.strokeRect(tx - thw - 8, tz - th - 8, thw * 2 + 16, th + 16 + px(k.hd));
        this.words.put(tx, tz - th - 48, t('m19.threatened'), 22, '#ff8080');
      }
      const k = G.ledger[a.kind]!;
      const [x, z, hw, hd, h] = [px(a.x), px(a.z), px(k.hw), px(k.hd), px(k.h)];
      const lost = a.state === AssetState.Lost;
      const isShutter = room.shutter && gh.assets[room.shutter.asset] === a;
      const isRack = room.rack && gh.assets[room.rack.asset] === a;
      const objCell = OBJECTIVE_CELL[k.id];
      const damaged = a.state >= AssetState.Damaged;
      const art =
        isRack && gh.rack
          ? gh.rack.state === RackState.Toppled
            ? this.prop(`a${ai}`, 'prop.s2-env-b', 0, x, z + hd, Math.max(80, h * 0.5))
            : this.prop(
                `a${ai}`,
                'prop.s2-env-a',
                gh.rack.state === RackState.Loose ? 5 : damaged ? 4 : 3,
                x,
                z + hd,
                h,
              )
          : isShutter
            ? this.prop(`a${ai}`, 'prop.s2-env-a', lost ? 0 : damaged ? 2 : 1, x, z + hd, h)
            : objCell !== undefined
              ? this.prop(
                  `a${ai}`,
                  damaged ? 'prop.s2-objectives-damaged' : 'prop.s2-objectives',
                  objCell,
                  x,
                  z + hd,
                  Math.max(110, h),
                )
              : false;
      if (art) {
        // Damage is also written in the label and the bar (never art alone).
      } else if (isRack && gh.rack) {
        this.drawRack(gh, x, z, hw, h, a.state);
      } else {
        const color = lost ? 0x555555 : CATEGORY_COLOR[k.category]!;
        this.back.fillStyle(0x000000, 0.25);
        this.back.fillEllipse(x, z + hd, hw * 2.2, 24);
        this.back.fillStyle(color, isShutter ? 0.95 : art ? 0.3 : 0.85);
        this.back.fillRect(x - hw, z - h + hd, hw * 2, h);
        this.back.lineStyle(3, STATE_COLOR[a.state]!, 1);
        this.back.strokeRect(x - hw, z - h + hd, hw * 2, h);
        if (isShutter) {
          this.back.lineStyle(2, 0x2c3238, 1);
          for (let y = z - h + hd + 14; y < z + hd; y += 18)
            this.back.lineBetween(x - hw, y, x + hw, y);
        }
        // Damage marks: diagonal hatching on Critical and below (not colour alone).
        if (a.state >= AssetState.Critical) {
          this.back.lineStyle(2, 0x000000, 0.45);
          for (let i = -h; i < hw * 2; i += 16)
            this.back.lineBetween(
              x - hw + Math.max(0, i),
              z + hd - Math.max(0, -i),
              x - hw + Math.min(hw * 2, i + h),
              z + hd - Math.min(h, h - i + 0),
            );
        }
      }
      const top = z - h + hd;
      this.bar(
        this.front,
        x - 50,
        top - 18,
        100,
        8,
        a.condition,
        k.condition,
        STATE_COLOR[a.state]!,
      );
      const state = t(`gh.state.${a.state}` as TextId);
      this.words.put(
        x,
        top - 34,
        `${dt(`gh.asset.${k.id}`, k.name)} · ${state}`,
        16,
        STATE_TEXT[a.state]!,
      );
      if (frame < a.guardUntil && blink) {
        this.front.lineStyle(3, 0xffffff, 0.7);
        this.front.strokeRect(x - hw - 4, top - 4, hw * 2 + 8, h + 8);
      }
    }
    // Containers.
    for (const c of gh.containers) {
      const k = G.containers[c.kind]!;
      const [x, z, hw, hd, h] = [px(c.x), px(c.z), px(k.hw), px(k.hd), px(k.h)];
      const color = k.hostile ? 0x7a4a2a : 0x3d6b8a;
      const height = c.opened && k.hostile ? h * 0.4 : h;
      const ca = CONTAINER_ART[k.id];
      const broken = c.opened
        ? ca && ca.cells.length > 2
          ? 2
          : 1
        : c.integrity < k.integrity && ca && ca.cells.length > 2
          ? 1
          : 0;
      const art = ca
        ? this.prop(
            `c${c.id}`,
            ca.sheet,
            ca.cells[Math.min(broken, ca.cells.length - 1)]!,
            x,
            z + hd,
            Math.max(70, h * 1.4),
          )
        : false;
      if (!art) {
        this.back.fillStyle(0x000000, 0.25);
        this.back.fillEllipse(x, z + hd, hw * 2.2, 20);
        this.back.fillStyle(color, c.opened ? 0.5 : 1);
        this.back.fillRect(x - hw, z + hd - height, hw * 2, height);
        this.back.lineStyle(2, k.hostile ? 0xffb020 : 0x9fd3ff, 1);
        this.back.strokeRect(x - hw, z + hd - height, hw * 2, height);
        if (c.opened && !k.hostile) {
          // An open door.
          this.back.fillStyle(0x1b1d22, 0.8);
          this.back.fillRect(x - hw + 4, z + hd - height + 4, hw * 2 - 8, height - 8);
        }
      }
      if (k.hostile && !c.opened && c.integrity < k.integrity)
        this.bar(
          this.front,
          x - 40,
          z + hd - height - 16,
          80,
          6,
          c.integrity,
          k.integrity,
          0xffb020,
        );
      const tag = c.opened ? t('gh.opened') : k.hostile ? t('gh.hostile') : t('gh.protected');
      this.words.put(
        x,
        z + hd - height - 30,
        `${dt(`gh.container.${k.id}`, k.name)} · ${tag}`,
        15,
        k.hostile ? '#ffd8a8' : '#cfe8ff',
      );
    }
    // Pantry items.
    for (const p of gh.pantry) {
      if (p.taken) continue;
      const def = G.pantry[p.item]!;
      const [x, z] = [px(p.x), px(p.z)];
      const food = FOOD_CELL[def.id];
      if (food === undefined || !this.prop(`p${p.id}`, 'prop.s2-food', food, x, z, 46)) {
        this.back.fillStyle(
          def.rare ? 0xffd166 : def.health > 0 ? 0xff9a7a : def.defense > 0 ? 0x8fd3ff : 0xc3a6ff,
          1,
        );
        this.back.fillCircle(x, z - 14, 14);
        this.back.lineStyle(2, 0xffffff, 0.9);
        this.back.strokeCircle(x, z - 14, 14);
      }
      this.words.put(x, z - 42, dt(`gh.item.${def.id}`, def.name), 14, '#fff3d6');
    }
    // Weapon names on the floor (greybox items have no art yet).
    for (const it of items) {
      if (it.state === ItemState.Gone || it.state === ItemState.Held) continue;
      const def = WEAPONS[it.def];
      if (!def || gh.grenade?.item === it.id) continue;
      const ammo = def.ammo > 0 ? ` ${it.ammo}/${def.ammo}` : '';
      this.words.put(px(it.x), px(it.z) - px(it.y) - 30, `${def.name}${ammo}`, 15, '#ffe7a3');
    }
    this.endProps();
    this.drawGrenade(gh, bodies, items, frame, blink);
    // Interaction prompts over the heroes.
    for (const h of hints)
      if (h.hint > 0)
        this.words.put(px(h.x), px(h.z) - 360, t(`gh.hint.${h.hint}` as TextId), 18, '#ffffff');
    this.events(gh, frame);
    if (this.callout && frame < this.callout.until)
      this.words.put(
        this.callout.x,
        this.callout.z - 230,
        this.callout.text,
        30,
        this.callout.color,
      );
    this.panel(gh, frame);
    if (this.caption && frame < this.caption.until) {
      this.hud.fillStyle(0x000000, 0.65);
      this.hud.fillRect(360, 896, 1200, 48);
      this.hudWords.put(960, 920, this.caption.text, 24, '#ffffff');
    }
    this.words.end();
    this.hudWords.end();
  }

  private drawRack(
    gh: Greenhouse,
    x: number,
    z: number,
    hw: number,
    h: number,
    state: number,
  ): void {
    const g = this.back;
    const rack = gh.rack!;
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x, z + 10, hw * 2.4, 22);
    if (rack.state === RackState.Toppled) {
      // Fallen along the floor in front of it.
      g.fillStyle(0x8a7a5a, 1);
      g.fillRect(x, z - 24, h, 24);
      g.fillStyle(STATE_COLOR[state]!, 0.9);
      for (let i = 0; i < 4; i += 1) g.fillCircle(x + 20 + i * (h / 4), z - 30, 10);
      return;
    }
    const lean = rack.state === RackState.Loose ? 10 : 0;
    g.lineStyle(6, 0x8a7a5a, 1);
    g.lineBetween(x - hw, z, x - hw + lean, z - h);
    g.lineBetween(x + hw, z, x + hw + lean, z - h);
    for (let i = 1; i <= 3; i += 1) {
      const y = z - (h * i) / 4;
      const dx = (lean * i) / 4;
      g.lineBetween(x - hw + dx, y, x + hw + dx, y);
      g.fillStyle(STATE_COLOR[state]!, 0.95);
      for (let j = -1; j <= 1; j += 1) g.fillCircle(x + dx + j * (hw * 0.6), y - 10, 9);
    }
    this.words.put(
      x + hw + 16,
      z - h / 2,
      t(`gh.rack.${rack.state}` as TextId),
      16,
      rack.state === RackState.Secure ? '#c9f5d4' : '#ffd166',
      0,
    );
  }

  private drawGrenade(
    gh: Greenhouse,
    bodies: readonly Fighter[],
    items: readonly Item[],
    frame: number,
    blink: boolean,
  ): void {
    const g = gh.grenade;
    if (!g) return;
    const G = GREENHOUSE!.grenade;
    const thrower = bodies.find((b) => b.id === GRENADIER_ID);
    if (thrower) {
      const x = px(thrower.x);
      const z = px(thrower.z);
      this.words.put(x, z - 300, t('gh.thrower'), 16, '#ffd8a8');
      const steps: Partial<Record<number, TextId>> = {
        [GrenadePhase.Remove]: 'gh.cap.remove',
        [GrenadePhase.Arm]: 'gh.cap.arm',
        [GrenadePhase.Aim]: 'gh.cap.aim',
      };
      const step = steps[g.phase];
      if (step) {
        // The thrower's telegraph: a pulsing ring, a progress bar for the step, and
        // the aim line once armed.
        const len =
          g.phase === GrenadePhase.Remove ? G.remove : g.phase === GrenadePhase.Arm ? G.arm : G.aim;
        this.front.lineStyle(
          5,
          g.phase === GrenadePhase.Remove ? 0xffd166 : 0xff4040,
          blink ? 1 : 0.5,
        );
        this.front.strokeEllipse(x, z, 200, 56);
        this.bar(
          this.front,
          x - 50,
          z - 270,
          100,
          10,
          frame - g.frame,
          len,
          g.phase === GrenadePhase.Remove ? 0xffd166 : 0xff4040,
        );
        if (g.phase === GrenadePhase.Aim) {
          this.front.lineStyle(4, 0xff4040, blink ? 1 : 0.4);
          this.front.lineBetween(x, z - 120, px(g.aimX), px(g.aimZ));
          this.front.strokeEllipse(px(g.aimX), px(g.aimZ), px(G.radius) * 2, px(G.radius) * 0.6);
        }
      }
    }
    let spot: { x: number; z: number; y: number } | null = null;
    if (g.phase === GrenadePhase.Lob) spot = { x: px(g.x), z: px(g.z), y: px(g.y) };
    else if (g.item) {
      const it = items.find((i) => i.id === g.item && i.state !== ItemState.Gone);
      if (it) {
        const holder =
          it.state === ItemState.Held ? bodies.find((b) => b.id === it.holder) : undefined;
        spot = holder
          ? { x: px(holder.x), z: px(holder.z), y: 110 }
          : { x: px(it.x), z: px(it.z), y: px(it.y) };
      }
    }
    if (!spot) return;
    const sx = spot.x;
    const sy = spot.z - spot.y;
    this.front.fillStyle(0x2a3a2a, 1);
    this.front.fillCircle(sx, sy - 12, 12);
    this.front.lineStyle(2, 0xffffff, 1);
    this.front.strokeCircle(sx, sy - 12, 12);
    if (g.armed) {
      // The fuse ring empties as the fuse burns; the blast radius is marked on the floor.
      const share = Math.max(0, g.fuse) / G.fuse;
      this.front.lineStyle(6, 0xff4040, 1);
      this.front.beginPath();
      this.front.arc(sx, sy - 12, 24, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2, false);
      this.front.strokePath();
      this.back.lineStyle(3, 0xff4040, blink ? 0.8 : 0.35);
      this.back.strokeEllipse(spot.x, spot.z, px(G.radius) * 2, px(G.radius) * 0.6);
      this.words.put(
        sx,
        sy - 56,
        t('gh.fuse', { s: (Math.max(0, g.fuse) / 60).toFixed(1) }),
        20,
        '#ff8f8f',
      );
    } else this.words.put(sx, sy - 48, t('gh.unarmed'), 18, '#c9f5d4');
  }

  /** Callouts, captions and sounds for new greenhouse events. */
  private events(gh: Greenhouse, frame: number): void {
    const l = gh.log;
    const key = `${l.kind}/${l.frame}/${l.a}`;
    if (key === this.lastEvent || l.kind === GhEvent.None) return;
    this.lastEvent = key;
    if (frame - l.frame > 5) return;
    const e = EVENT[l.kind];
    const c = CAPTION[l.kind];
    if (c) {
      this.caption = { text: t(c.key), until: frame + CAPTION_FRAMES };
      audio.sfx(c.sfx, 'critical');
    }
    if (!e) return;
    const where = this.where(gh, l.kind, l.a, l.b);
    this.callout = {
      text: t(e.key),
      color: e.color,
      x: where.x,
      z: where.z,
      until: frame + CALLOUT_FRAMES,
    };
    if (e.sfx && !c) audio.sfx(e.sfx, 'confirm');
  }

  private where(gh: Greenhouse, kind: number, a: number, b: number): { x: number; z: number } {
    const room = ROOMS[gh.room]!;
    const asset = gh.assets.find((x) => x.id === a);
    if (asset) return { x: px(asset.x), z: px(asset.z) };
    const c = gh.containers.find((x) => x.id === a);
    if (c) return { x: px(c.x), z: px(c.z) };
    const p = gh.pantry.find((x) => x.id === a);
    if (p) return { x: px(p.x), z: px(p.z) };
    if (kind === GhEvent.Blast) return { x: px(a), z: px(b) };
    if (kind >= GhEvent.RackLoose && kind <= GhEvent.RackRighted && room.rack)
      return { x: px(room.rack.x), z: px(room.rack.z) };
    if ((kind === GhEvent.JetWarn || kind === GhEvent.JetFire) && room.jet)
      return { x: px(room.jet.x) + 400, z: px(room.jet.z) + 120 };
    if (kind === GhEvent.Redirected && room.redirect)
      return { x: px(room.redirect.x), z: px(room.redirect.z) };
    if (kind === GhEvent.Lashed && room.restraint)
      return { x: px(room.restraint.zx), z: px(room.restraint.zz) };
    return { x: 960, z: 800 };
  }

  /** The Ledger panel (screen space, right side): grade, circulation, every asset. */
  private panel(gh: Greenhouse, frame: number): void {
    const G = GREENHOUSE!;
    const grade = ledgerGrade(gh);
    const x0 = 1540;
    const y0 = 90;
    const rows = gh.assets.length;
    const h = 88 + rows * 20;
    this.hud.fillStyle(0x0b1512, 0.62);
    this.hud.fillRect(x0, y0, 360, h);
    this.hud.lineStyle(2, 0x6fd18a, 0.8);
    this.hud.strokeRect(x0, y0, 360, h);
    this.hudWords.put(x0 + 12, y0 + 18, t('gh.ledgerTitle'), 20, '#c9f5d4', 0);
    this.hudWords.put(
      x0 + 12,
      y0 + 44,
      `${t('gh.grade')}: ${dt(`gh.grade.${grade.grade}`, grade.name)} · ${grade.score}%`,
      18,
      grade.grade === G.grades[0]!.id ? '#ffd166' : '#ffffff',
      0,
    );
    const flow = circulating(gh);
    const stable = frame < gh.stableUntil;
    this.hudWords.put(
      x0 + 12,
      y0 + 68,
      `${t('gh.circulation')}: ${flow ? t('gh.circulationOn') : stable ? t('gh.stable') : t('gh.circulationOff')}`,
      15,
      flow || stable ? '#bff6ff' : '#ffb3a3',
      0,
    );
    // Two assets of one kind (the crop beds) are numbered in the panel.
    const seen = new Map<number, number>();
    const twice = new Set(
      gh.assets
        .filter((a, i) => gh.assets.findIndex((b) => b.kind === a.kind) !== i)
        .map((a) => a.kind),
    );
    gh.assets.forEach((a, i) => {
      const k = G.ledger[a.kind]!;
      const y = y0 + 92 + i * 20;
      const n = (seen.get(a.kind) ?? 0) + 1;
      seen.set(a.kind, n);
      const suffix = twice.has(a.kind) ? ` ${n}` : '';
      this.bar(this.hud, x0 + 220, y - 5, 128, 10, a.condition, k.condition, STATE_COLOR[a.state]!);
      this.hudWords.put(
        x0 + 12,
        y,
        `${dt(`gh.asset.${k.id}`, k.name)}${suffix} · ${t(`gh.state.${a.state}` as TextId)}`,
        14,
        STATE_TEXT[a.state]!,
        0,
      );
    });
  }

  private box(
    g: Phaser.GameObjects.Graphics,
    x: number,
    z: number,
    hw: number,
    hd: number,
    h: number,
    color: number,
  ): void {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x, z + hd, hw * 2.4, 18);
    g.fillStyle(color, 1);
    g.fillRect(x - hw, z + hd - h, hw * 2, h);
  }

  private bar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    max: number,
    color: number,
  ): void {
    g.fillStyle(0x111111, 0.85);
    g.fillRect(x, y, w, h);
    g.fillStyle(color, 1);
    g.fillRect(x, y, Math.max(0, Math.min(1, value / Math.max(1, max))) * w, h);
  }
}
