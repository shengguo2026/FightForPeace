import * as Phaser from 'phaser';
import {
  BODY_HALF_D,
  BODY_HALF_W,
  BreakState,
  DefEvent,
  EnvEvent,
  type Environment,
  type Fighter,
  HazardPhase,
  type Item,
  ItemState,
  WEAPONS,
  WeaponEvent,
  conditionOf,
  GrabEvent,
  HEROES,
  METER,
  MoveState,
  type Projectile,
  activeHitbox,
  fxToPixels,
  groundFocus,
  hurtbox,
  kitOf,
  phaseOf,
} from '@ffp/sim';
import { profileText } from '../text/en';
import { AssetRegistry, type PlaceholderFamily, SpritePicker } from '@ffp/platform';
import type { RenderSnapshot } from '../game';

export const VIEW_WIDTH = 1920;
export const VIEW_HEIGHT = 1080;
const FLOOR_TOP = 620;
const FLOOR_BOTTOM = 1000;
const DUMMY_W = 70;
const BODY_H = 300;
const NOTCH = 24;
const HERO_COLORS = [0x4fa3ff, 0xff9a3c];
const DUMMY_COLOR = 0x9a9ea6;
/** Placeholder strike colours per pose family (standing yellow, low cyan, aerial magenta). */
export const STRIKE_COLORS: Record<string, number> = {
  standing: 0xfff2a8,
  dash: 0xfff2a8,
  low: 0x5ef2e6,
  aerial: 0xff4fd8,
  ground: 0xb0ff6a,
  special: 0xffb347,
  ultimate: 0xff5ea0,
  grab: 0xc8a2ff,
  grabStrike: 0xc8a2ff,
  throw: 0xc8a2ff,
};
const PROJECTILE_COLOR = 0x8fe3ff;
const RECOVERY_COLOR = 0x8a8f99;
/** Words drawn over a fighter for weapon events. */
const WEAPON_CALLOUTS: Partial<Record<number, { text: string; color: string }>> = {
  [WeaponEvent.Clash]: { text: 'CLASH', color: '#ffe066' },
  [WeaponEvent.Disarmed]: { text: 'DISARMED', color: '#ff8f6b' },
  [WeaponEvent.Disarm]: { text: 'DISARM', color: '#ffd166' },
  [WeaponEvent.Break]: { text: 'WEAPON BREAK', color: '#ff6b6b' },
  [WeaponEvent.Reclaim]: { text: 'RECLAIMED', color: '#7ddc7d' },
  [WeaponEvent.Contested]: { text: 'contested', color: '#bbbbbb' },
  [WeaponEvent.Deflect]: { text: 'DEFLECT', color: '#7df9ff' },
  [WeaponEvent.Return]: { text: 'RETURNED', color: '#ffd166' },
  [WeaponEvent.StruckAside]: { text: 'STRUCK ASIDE', color: '#7df9ff' },
};
const CONDITION_TEXT = ['Ready', 'Worn', 'Critical'];
const CONDITION_COLOR = [0x7ddc7d, 0xe0c050, 0xe05050];
const POPUP_MS = 700;
const CALLOUT_MS = 900;
/** Words drawn over a hero for defensive outcomes (shape and text, not colour alone). */
const CALLOUTS: Partial<Record<number, { text: string; color: string }>> = {
  [DefEvent.Exact]: { text: 'EXACT', color: '#7df9ff' },
  [DefEvent.ExactBreak]: { text: 'EXACT · BREAK', color: '#7df9ff' },
  [DefEvent.Counter]: { text: 'COUNTER', color: '#ffd166' },
  [DefEvent.GuardCrush]: { text: 'GUARD CRUSH', color: '#ff6b6b' },
  [DefEvent.Breaker]: { text: 'BREAKER', color: '#c3a6ff' },
  [DefEvent.CounterMiss]: { text: 'counter missed', color: '#bbbbbb' },
  [DefEvent.Armored]: { text: 'ARMOR', color: '#ffb347' },
};
/** Words drawn over a hero for grab outcomes. */
const GRAB_CALLOUTS: Partial<Record<number, { text: string; color: string }>> = {
  [GrabEvent.Throw]: { text: 'THROW', color: '#c8a2ff' },
  [GrabEvent.Escape]: { text: 'ESCAPED', color: '#7df9ff' },
  [GrabEvent.EscapeEarly]: { text: 'too early', color: '#bbbbbb' },
  [GrabEvent.EscapeLate]: { text: 'too late', color: '#bbbbbb' },
  [GrabEvent.Interrupted]: { text: 'GRAB BROKEN', color: '#ffd166' },
  [GrabEvent.Rescued]: { text: 'FREED', color: '#7ddc7d' },
  [GrabEvent.RescuedPartner]: { text: 'RESCUE', color: '#7ddc7d' },
};

export interface StageOptions {
  getSnapshot: () => RenderSnapshot;
  showCollision: () => boolean;
  showLabels: () => boolean;
  /** Called once the sprite sheets have loaded and the stage is drawn. */
  onReady?: () => void;
}

interface Popup {
  text: Phaser.GameObjects.Text;
  born: number;
}

/**
 * Greybox stage drawn from simulation snapshots only: the floor band, placeholder heroes
 * and training dummies, floor shadows, pose placeholders chosen through the asset
 * registry by pose family, the hitbox view and hit feedback.
 */
export class StageScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private moveLabels = new Map<number, Phaser.GameObjects.Text>();
  private comboLabels = new Map<number, Phaser.GameObjects.Text>();
  private lastHits = new Map<number, number>();
  private lastDefense = new Map<number, string>();
  private lastGrab = new Map<number, string>();
  private cues = new Map<number, Phaser.GameObjects.Text>();
  private popups: Popup[] = [];
  private readonly assets = new AssetRegistry();
  private readonly picker = new SpritePicker(this.assets);
  /** Drawn above every body: hitboxes, projectiles, tethers. */
  private overlay!: Phaser.GameObjects.Graphics;
  private sprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private propSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private weaponTags = new Map<number, Phaser.GameObjects.Text>();
  private lastWeapon = new Map<number, string>();
  private lastEnv = '';

  constructor(private readonly opts: StageOptions) {
    super('stage');
  }

  /** Approved sprite sheets from the asset manifest (M6: the first real art). */
  preload(): void {
    for (const s of this.assets.sheets())
      this.load.spritesheet(s.id, s.url, { frameWidth: s.sheet.cell, frameHeight: s.sheet.cell });
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x1b1d22, 1);
    bg.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    bg.fillStyle(0x4a4d55, 1);
    bg.fillRect(0, FLOOR_TOP, VIEW_WIDTH, FLOOR_BOTTOM - FLOOR_TOP);
    bg.lineStyle(2, 0x6b6f78, 1);
    for (let x = 0; x <= VIEW_WIDTH; x += 120) bg.lineBetween(x, FLOOR_TOP, x, FLOOR_BOTTOM);
    this.gfx = this.add.graphics();
    this.overlay = this.add.graphics();
    this.overlay.setDepth(8);
    this.opts.onReady?.();
  }

  override update(time: number): void {
    const snap = this.opts.getSnapshot();
    const { previous, current, alpha } = snap;
    const byId = new Map(previous.map((b) => [b.id, b]));
    const drawn = current
      .map((b) => ({ f: b, p: interpolate(byId.get(b.id) ?? b, b, alpha) }))
      .sort((a, b) => a.p.z - b.p.z || a.f.id - b.f.id);
    const g = this.gfx;
    g.clear();
    this.overlay.clear();
    const collision = this.opts.showCollision();
    this.drawScenery(snap.environment, snap.frame, collision);
    this.drawItems(snap.items, snap.frame);
    // Ground-Opportunity Focus: a ring under each marked target a hero is focused on.
    const focused = new Set<number>();
    for (const f of current) {
      if (f.team !== 'hero') continue;
      const t = groundFocus(current, f);
      if (t) focused.add(t.id);
    }
    for (const { f, p } of drawn) {
      if (focused.has(f.id)) {
        g.lineStyle(4, 0xb0ff6a, 0.9);
        g.strokeEllipse(p.x, p.z - 6, 300, 52);
      }
      this.drawShadow(p);
      if (f.state === MoveState.Guard || f.state === MoveState.Blockstun) this.drawGuard(f, p);
      const top = this.drawSprite(f, p, snap.frame) ?? this.drawBody(f, p);
      this.label(f, p, top);
      this.weapon(f, p, top, time, snap.items);
      this.feedback(f, p, top, time);
      this.defense(f, p, top, time);
      this.grabCue(f, p, top, time, snap.escapeOpen.has(f.id));
    }
    this.drawTethers(drawn);
    for (const pr of snap.projectiles) this.drawProjectile(pr);
    // Boxes go on top of every body, so a hitbox inside a target stays visible.
    if (collision) for (const { f, p } of drawn) this.drawBoxes(f, p);
    this.dropStale(this.sprites, new Set(current.map((b) => b.id)));
    this.environmentCallout(snap.environment, time);
    this.updatePopups(time);
  }

  /** Depth of anything standing on the floor at screen row z (bodies, items, scenery). */
  private depthAt(z: number): number {
    return 1 + z / 2000;
  }

  private sprite(map: Map<number, Phaser.GameObjects.Sprite>, id: number, sheet: string) {
    let sp = map.get(id);
    if (!sp) {
      sp = this.add.sprite(0, 0, sheet, 0);
      map.set(id, sp);
    }
    return sp;
  }

  private dropStale(map: Map<number, Phaser.GameObjects.Sprite>, keep: Set<number>): void {
    for (const [id, sp] of map) {
      if (keep.has(id)) continue;
      sp.destroy();
      map.delete(id);
    }
  }

  /**
   * The fighter's sprite-sheet pose: cell chosen from simulation state, mirrored for
   * facing left, feet on the ground line. Returns the top of the drawn figure, or null
   * when this fighter has no art yet (the greybox body is drawn instead).
   */
  private drawSprite(f: Fighter, p: Pos, frame: number): number | null {
    const pick = this.picker.fighter(f, frame);
    const meta = pick ? this.assets.sheet(pick.sheet)?.sheet : undefined;
    if (!pick || !meta || !this.textures.exists(pick.sheet)) {
      this.sprites.get(f.id)?.setVisible(false);
      return null;
    }
    const sp = this.sprite(this.sprites, f.id, pick.sheet);
    sp.setVisible(true);
    sp.setTexture(pick.sheet, pick.cell);
    sp.setFlipX(f.facing === -1);
    sp.setOrigin(0.5, meta.ground / meta.cell);
    sp.setPosition(p.x, p.z - p.y);
    sp.setDepth(this.depthAt(p.z));
    sp.setAlpha(f.protectedRecovery ? 0.55 : f.state === MoveState.Dash ? 0.85 : 1);
    // Hit flash: the first frames of hit-stun draw the figure solid white.
    if (f.state === MoveState.Hitstun && f.stateFrame < 4) {
      sp.setTint(0xffffff);
      sp.setTintMode(Phaser.TintModes.FILL);
    } else {
      sp.setTintMode(Phaser.TintModes.MULTIPLY);
      if (f.team === 'hero' && f.slot === 1) sp.setTint(0xffe2c4);
      else sp.clearTint();
    }
    const cell = meta.cells[pick.cell];
    const head = cell ? meta.ground - cell.y0 : BODY_H;
    if (f.state === MoveState.Down) return p.z - 90;
    return p.z - p.y - Math.max(head, 140);
  }

  /** Loose and flying weapons; held weapons are part of the holder's pose art. */
  private drawItems(items: readonly Item[], frame: number): void {
    const g = this.gfx;
    const keep = new Set<number>();
    for (const item of items) {
      if (item.state === ItemState.Held || item.state === ItemState.Gone) continue;
      keep.add(item.id);
      const x = fxToPixels(item.x);
      const z = fxToPixels(item.z);
      const y = fxToPixels(item.y);
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(x, z, 90, 16);
      // Short Reclaim Priority: a ring in the reserved holder's colour while it lasts.
      if (item.state === ItemState.Ground && item.reserveFor !== 0 && frame < item.reserveUntil) {
        g.lineStyle(4, 0x7ddc7d, 0.8);
        g.strokeEllipse(x, z, 120, 30);
      }
      const pick = this.picker.item(item, frame);
      const meta = pick ? this.assets.sheet(pick.sheet)?.sheet : undefined;
      if (!pick || !meta || !this.textures.exists(pick.sheet)) {
        g.fillStyle(0xc89b5a, 1);
        g.fillRect(x - 40, z - y - 10, 80, 10);
        continue;
      }
      const sp = this.sprite(this.itemSprites, item.id, pick.sheet);
      sp.setTexture(pick.sheet, pick.cell);
      const cell = meta.cells[pick.cell];
      sp.setOrigin(0.5, cell ? cell.foot / meta.cell : 1);
      sp.setScale(0.6);
      sp.setPosition(x, z - y);
      sp.setDepth(this.depthAt(z));
      const flying = item.state === ItemState.Flying;
      const spin = WEAPONS[item.def]?.id === 'workstaff' && flying;
      sp.setRotation(spin ? (frame % 24) * ((2 * Math.PI) / 24) : 0);
      sp.setFlipX(item.vx < 0);
    }
    this.dropStale(this.itemSprites, keep);
  }

  /** The pillar, the sluice boards (by state) and the cog (telegraph ring by phase). */
  private drawScenery(env: Environment, frame: number, collision: boolean): void {
    const g = this.gfx;
    const place = (id: number, sheet: string, cell: number, x: number, z: number, h: number) => {
      const meta = this.assets.sheet(sheet)?.sheet;
      const c = meta?.cells[cell];
      if (!meta || !c || !this.textures.exists(sheet)) return false;
      const sp = this.sprite(this.propSprites, id, sheet);
      sp.setTexture(sheet, cell);
      sp.setOrigin(0.5, c.foot / meta.cell);
      sp.setScale(Math.max(0.4, h / Math.max(1, c.foot - c.y0)));
      sp.setPosition(x, z);
      sp.setDepth(this.depthAt(z));
      return true;
    };
    for (const s of env.surfaces) {
      const [x, z, hw, hd, h] = [s.x, s.z, s.hw, s.hd, s.h].map(fxToPixels) as number[];
      if (!place(s.id, 'prop.impact-hazard', s.cracked ? 1 : 0, x!, z! + hd!, h!) || collision) {
        g.fillStyle(0x6d6a66, collision ? 0.35 : 1);
        g.fillRect(x! - hw!, z! - h!, hw! * 2, h!);
      }
    }
    for (const b of env.breakables) {
      const [x, z, hw, hd, h] = [b.x, b.z, b.hw, b.hd, b.h].map(fxToPixels) as number[];
      const height = b.state === BreakState.Broken ? h! * 0.45 : h!;
      if (!place(b.id, 'prop.sluiceboards', b.state, x!, z! + hd!, height) || collision) {
        g.fillStyle(0x8b5a2b, collision ? 0.35 : 1);
        g.fillRect(x! - hw!, z! - height, hw! * 2, height);
      }
    }
    for (const hz of env.hazards) {
      const [x, z, hw, hd, h] = [hz.x, hz.z, hz.hw, hz.hd, hz.h].map(fxToPixels) as number[];
      // Telegraph: the danger zone on the floor, amber while warning, red while active.
      if (hz.phase !== HazardPhase.Rest) {
        const active = hz.phase === HazardPhase.Active;
        const pulse = active ? 0.55 : 0.25 + 0.25 * Math.abs(Math.sin(hz.phaseFrame / 4));
        g.fillStyle(active ? 0xff3b30 : 0xffb020, pulse);
        g.fillEllipse(x!, z!, hw! * 2.4, hd! * 3);
      }
      const speed = hz.phase === HazardPhase.Active ? 2 : hz.phase === HazardPhase.Warn ? 6 : 0;
      const cell = 2 + (speed === 0 ? 0 : Math.floor(frame / speed) % 4);
      place(hz.id, 'prop.impact-hazard', cell, x!, z! + hd!, h!);
    }
  }

  /** IMPACT (or a separation) and break call-outs at the scenery. */
  private environmentCallout(env: Environment, time: number): void {
    const l = env.log;
    const key = `${l.kind}/${l.frame}/${l.target}`;
    if (key === this.lastEnv) return;
    this.lastEnv = key;
    const text =
      l.kind === EnvEvent.Impact
        ? `IMPACT ${l.damage}`
        : l.kind === EnvEvent.Break && l.detail === BreakState.Broken
          ? 'BROKEN'
          : '';
    if (!text || l.frame === 0) return;
    const prop = [...env.surfaces, ...env.breakables].find((s) => s.id === l.prop);
    if (!prop) return;
    const t = this.add.text(fxToPixels(prop.x), fxToPixels(prop.z - prop.h) - 20, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ffb347',
      stroke: '#000000',
      strokeThickness: 6,
    });
    t.setOrigin(0.5, 1);
    t.setDepth(13);
    this.popups.push({ text: t, born: time + (CALLOUT_MS - POPUP_MS) });
  }

  /** Weapon HUD (Layered Information Display): integrity gauge, condition word, ammo. */
  private weapon(f: Fighter, p: Pos, top: number, time: number, items: readonly Item[]): void {
    let tag = this.weaponTags.get(f.id);
    if (!tag) {
      tag = this.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      });
      tag.setOrigin(0.5, 1);
      tag.setDepth(12);
      this.weaponTags.set(f.id, tag);
    }
    const item = f.item !== 0 ? items.find((i) => i.id === f.item) : undefined;
    const def = item ? WEAPONS[item.def] : undefined;
    if (item && def) {
      const cond = conditionOf(def, item.integrity);
      const g = this.overlay;
      const w = 90;
      const y = top - 120;
      g.fillStyle(0x222222, 0.8);
      g.fillRect(p.x - w / 2, y, w, 6);
      g.fillStyle(CONDITION_COLOR[cond]!, 1);
      g.fillRect(p.x - w / 2, y, (w * item.integrity) / def.integrity.max, 6);
      const ammo = def.ammo > 0 ? ` · ${item.ammo}/${def.ammo}` : '';
      tag.setText(`${def.name} · ${CONDITION_TEXT[cond]}${ammo}`);
      tag.setPosition(p.x, y - 2);
      tag.setVisible(true);
    } else tag.setVisible(false);
    const key = `${f.weaponEvent}/${f.weaponFrame}`;
    if (this.lastWeapon.get(f.id) === key) return;
    this.lastWeapon.set(f.id, key);
    const c = WEAPON_CALLOUTS[f.weaponEvent];
    if (!c || f.weaponFrame === 0) return;
    const t = this.add.text(p.x, top - 150, c.text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: c.color,
      stroke: '#000000',
      strokeThickness: 6,
    });
    t.setOrigin(0.5, 1);
    t.setDepth(13);
    this.popups.push({ text: t, born: time + (CALLOUT_MS - POPUP_MS) });
  }

  private drawShadow(p: Pos): void {
    const g = this.gfx;
    const lift = Math.min(p.y / 200, 0.6);
    g.fillStyle(0x000000, 0.35 * (1 - lift));
    g.fillEllipse(p.x, p.z, DUMMY_W * 1.3 * (1 - lift / 2), 24 * (1 - lift / 2));
  }

  /** The pose family of what the fighter is doing, resolved through the asset registry. */
  private family(f: Fighter): PlaceholderFamily | 'stub' | null {
    if (f.state !== MoveState.Attack) return null;
    if (f.action < 0) return 'stub';
    const a = kitOf(f)?.actions[f.action];
    if (!a) return null;
    const r = this.assets.resolve(a.pose);
    return r.kind === 'placeholder' ? r.family : a.category;
  }

  /** Draws the body and its strike; returns the top of the body in screen pixels. */
  private drawBody(f: Fighter, p: Pos): number {
    const g = this.gfx;
    const hero = f.team === 'hero' ? HEROES[f.hero] : undefined;
    const width = hero?.bodyWidth ?? DUMMY_W;
    const fam = this.family(f);
    const color = f.team === 'hero' ? (HERO_COLORS[f.slot] ?? 0xd8d8d8) : DUMMY_COLOR;
    const flash = f.state === MoveState.Hitstun && f.stateFrame < 4;

    // Protected recovery is drawn translucent: nothing can hit it.
    const alpha = f.protectedRecovery ? 0.45 : 1;
    if (f.state === MoveState.Down) {
      // Lying on the floor.
      g.fillStyle(color, alpha);
      g.fillRect(p.x - BODY_H * 0.45, p.z - 50, BODY_H * 0.9, 46);
      return p.z - 60;
    }
    let height = BODY_H;
    if (fam === 'low') height = BODY_H * 0.6;
    else if (fam === 'aerial') height = BODY_H * 0.7;
    else if (fam === 'ground') height = BODY_H * 0.55;
    else if (
      f.state === MoveState.Landing ||
      f.state === MoveState.GetUp ||
      f.state === MoveState.Recover
    )
      height = BODY_H * 0.82;
    const left = p.x - width / 2;
    const top = p.z - p.y - height;
    g.fillStyle(flash ? 0xffffff : color, f.state === MoveState.Dash ? 0.7 : alpha);
    g.fillRect(left, top, width, height);
    // Facing notch.
    g.fillStyle(0xe0503c, 1);
    g.fillRect(f.facing === 1 ? left + width - NOTCH : left, top + 34, NOTCH, NOTCH);

    if (fam === 'aerial') {
      // Tucked knees and a strike limb angled diagonally downward: the aerial placeholder.
      g.fillStyle(0x000000, 0.25);
      g.fillRect(left + 8, top + height * 0.55, width - 16, 18);
    }
    if (fam && fam !== 'stub') this.drawStrike(f, p, fam, left, top, width, height);
    else if (fam === 'stub') {
      g.fillStyle(0xd0d0ff, 1);
      g.fillRect(f.facing === 1 ? left + width : left - 60, top + 110, 60, 22);
    }
    return top;
  }

  private drawStrike(
    f: Fighter,
    p: Pos,
    fam: PlaceholderFamily,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    const a = kitOf(f)!.actions[f.action]!;
    const { phase } = phaseOf(a, f.stateFrame + 1);
    const reach = phase === 'active' ? 1 : phase === 'startup' ? 0.45 : 0.65;
    const color = phase === 'recovery' ? RECOVERY_COLOR : (STRIKE_COLORS[fam] ?? 0xffffff);
    const alpha = phase === 'startup' ? 0.55 : 1;
    const g = this.gfx;
    const front = f.facing === 1 ? left + width : left;
    const dir = f.facing;
    g.fillStyle(color, alpha);
    if (fam === 'low') {
      const len = 130 * reach;
      g.fillRect(dir === 1 ? front - 10 : front - len + 10, p.z - p.y - 34, len, 26);
    } else if (fam === 'aerial') {
      g.lineStyle(24, color, alpha);
      const hipX = p.x + dir * width * 0.25;
      const hipY = top + height * 0.7;
      g.lineBetween(hipX, hipY, hipX + dir * 95 * reach, hipY + 80 * reach);
    } else if (fam === 'ground') {
      g.fillRect(front - (dir === 1 ? 0 : 20), top + height - 20, 20, 60 * reach + 20);
    } else {
      const len = 80 * reach;
      g.fillRect(dir === 1 ? front : front - len, top + 110, len, 22);
    }
  }

  private drawBoxes(f: Fighter, p: Pos): void {
    const g = this.overlay;
    const hw = fxToPixels(BODY_HALF_W);
    const hd = fxToPixels(BODY_HALF_D);
    g.lineStyle(2, f.passEnemies || f.ghost ? 0xff4040 : 0x40ff80, 0.9);
    g.strokeRect(p.x - hw, p.z - hd, hw * 2, hd * 2);
    const dx = p.x - fxToPixels(f.x);
    const dz = p.z - fxToPixels(f.z);
    const dy = p.y - fxToPixels(f.y);
    if (f.state !== MoveState.Down && f.state !== MoveState.GetUp) {
      const hb = hurtbox(f);
      g.lineStyle(2, 0x4f8cff, 0.95);
      g.strokeRect(
        fxToPixels(hb.x0) + dx,
        fxToPixels(hb.z) + dz - fxToPixels(hb.y1) - dy,
        fxToPixels(hb.x1 - hb.x0),
        fxToPixels(hb.y1 - hb.y0),
      );
    }
    const box = activeHitbox(f);
    if (box) {
      const x = fxToPixels(box.x0) + dx;
      const w = fxToPixels(box.x1 - box.x0);
      const z = fxToPixels(box.z) + dz;
      g.fillStyle(0xff3030, 0.35);
      g.fillRect(x, z - fxToPixels(box.y1) - dy, w, fxToPixels(box.y1 - box.y0));
      g.lineStyle(2, 0xff3030, 1);
      g.strokeRect(x, z - fxToPixels(box.y1) - dy, w, fxToPixels(box.y1 - box.y0));
      // Depth band on the floor.
      g.fillStyle(0xff3030, 0.18);
      const d = fxToPixels(box.depth);
      g.fillRect(x, z - d, w, d * 2);
    }
  }

  private label(f: Fighter, p: Pos, top: number): void {
    let t = this.labels.get(f.id);
    if (!t) {
      const name = HEROES[f.hero]?.name.split(' ')[0] ?? '';
      const text = f.team === 'hero' ? `P${f.slot + 1} · ${name}` : `Dummy ${f.id - 100}`;
      t = this.add.text(0, 0, text, { fontFamily: 'system-ui, sans-serif', fontSize: '26px' });
      t.setOrigin(0.5, 1);
      t.setDepth(10);
      this.labels.set(f.id, t);
    }
    if (f.team === 'hero') {
      const name = HEROES[f.hero]?.name.split(' ')[0] ?? '';
      t.setText(`P${f.slot + 1} · ${name}`);
    }
    t.setPosition(p.x, top - 8);
    // Current move name above the label while the Lab is visible.
    let m = this.moveLabels.get(f.id);
    if (!m) {
      m = this.add.text(0, 0, '', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '20px',
        color: '#ffe9a8',
      });
      m.setOrigin(0.5, 1);
      m.setDepth(10);
      this.moveLabels.set(f.id, m);
    }
    const a =
      f.state === MoveState.Attack && f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
    // An enemy attack is always announced with its defense profile in words (telegraph).
    const profile = f.team === 'enemy' && a ? profileText(a.tags) : '';
    const text = a && (f.team === 'enemy' || this.opts.showLabels()) ? a.name : '';
    m.setText(profile ? `${text}\n${profile}` : text);
    m.setColor(a?.tags.includes('unblockable') ? '#ff8080' : '#ffe9a8');
    m.setPosition(p.x, top - 38);
  }

  /** Damage pop-ups, the combo counter and the ground-window marker on targets. */
  private feedback(f: Fighter, p: Pos, top: number, time: number): void {
    if (f.team !== 'enemy') return;
    const hits = f.ctx.open ? f.ctx.hits : 0;
    const before = this.lastHits.get(f.id) ?? 0;
    if (hits > before) {
      const t = this.add.text(p.x + 30, top - 20, `${f.ctx.lastDamage}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: '#ffd166',
        stroke: '#000000',
        strokeThickness: 5,
      });
      t.setDepth(12);
      this.popups.push({ text: t, born: time });
    }
    this.lastHits.set(f.id, hits);
    let c = this.comboLabels.get(f.id);
    if (!c) {
      c = this.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      });
      c.setOrigin(0.5, 1);
      c.setDepth(11);
      this.comboLabels.set(f.id, c);
    }
    const ground =
      f.groundWindow > 0 && !f.protectedRecovery && f.state === MoveState.Down
        ? `▼ ground window ${f.groundWindow}`
        : f.protectedRecovery
          ? 'protected'
          : '';
    const combo = f.ctx.open && f.ctx.hits > 1 ? `${f.ctx.hits} hits · ${f.ctx.damage}` : '';
    c.setText([combo, ground].filter(Boolean).join('\n'));
    c.setPosition(p.x, top - 44);
  }

  /** Defensive facing: a 150° arc in front of a guarding hero, on the floor. */
  private drawGuard(f: Fighter, p: Pos): void {
    const g = this.gfx;
    const angle = Math.atan2(f.guardZ * 0.6, f.guardX);
    const crushed = f.defense <= 0;
    g.lineStyle(8, crushed ? 0xaaaaaa : 0x7df9ff, crushed ? 0.4 : 0.85);
    g.beginPath();
    g.arc(p.x, p.z, 110, angle - (75 * Math.PI) / 180, angle + (75 * Math.PI) / 180);
    g.strokePath();
  }

  /** Defense bar above heroes, and the call-out words for defensive outcomes. */
  private defense(f: Fighter, p: Pos, top: number, time: number): void {
    if (f.team !== 'hero') return;
    const g = this.gfx;
    const w = 90;
    const y = top - 74;
    g.fillStyle(0x222222, 0.8);
    g.fillRect(p.x - w / 2, y, w, 8);
    g.fillStyle(f.defense >= 75 ? 0x7ddc7d : f.defense >= 25 ? 0xe0c050 : 0xe05050, 1);
    g.fillRect(p.x - w / 2, y, (w * f.defense) / 100, 8);
    // Tick at the 75 % breaker threshold.
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(p.x - w / 2 + w * 0.75, y - 2, 2, 12);
    // Attack meter below it; a full bar is an Ultimate.
    const full = f.meter >= METER.max;
    g.fillStyle(0x222222, 0.8);
    g.fillRect(p.x - w / 2, y + 12, w, 8);
    g.fillStyle(full ? 0xff5ea0 : 0xffb347, 1);
    g.fillRect(p.x - w / 2, y + 12, (w * f.meter) / METER.max, 8);
    this.readyLabel(f, p.x, y + 22, full);
    const key = `${f.defEvent}/${f.defFrame}`;
    if (this.lastDefense.get(f.id) === key) return;
    this.lastDefense.set(f.id, key);
    const c = CALLOUTS[f.defEvent];
    if (!c || f.defFrame === 0) return;
    const t = this.add.text(p.x, top - 100, c.text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: c.color,
      stroke: '#000000',
      strokeThickness: 6,
    });
    t.setOrigin(0.5, 1);
    t.setDepth(13);
    this.popups.push({ text: t, born: time + (CALLOUT_MS - POPUP_MS) });
  }

  private ready = new Map<number, Phaser.GameObjects.Text>();

  private readyLabel(f: Fighter, x: number, y: number, full: boolean): void {
    let t = this.ready.get(f.id);
    if (!t) {
      t = this.add.text(0, 0, 'ULTIMATE READY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ff8fbf',
        stroke: '#000000',
        strokeThickness: 4,
      });
      t.setOrigin(0.5, 0);
      t.setDepth(12);
      this.ready.set(f.id, t);
    }
    t.setVisible(full);
    t.setPosition(x, y);
  }

  /** A line from each grabber to the fighter it holds. */
  private drawTethers(drawn: { f: Fighter; p: Pos }[]): void {
    const at = new Map(drawn.map((d) => [d.f.id, d.p]));
    const g = this.overlay;
    for (const { f, p } of drawn) {
      if (!f.grabbedBy) continue;
      const q = at.get(f.grabbedBy);
      if (!q) continue;
      g.lineStyle(6, 0xc8a2ff, 0.8);
      g.lineBetween(q.x, q.z - q.y - 150, p.x, p.z - p.y - 150);
    }
  }

  private drawProjectile(pr: Projectile): void {
    const g = this.overlay;
    const x = fxToPixels(pr.x);
    const z = fxToPixels(pr.z);
    const y = fxToPixels(pr.y);
    const w = fxToPixels(pr.hw) * 2;
    const h = fxToPixels(pr.h);
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x, z, w, 16);
    g.fillStyle(PROJECTILE_COLOR, 0.9);
    g.fillEllipse(x, z - y - h / 2, w, h);
  }

  /**
   * Grab state words over a fighter: ESCAPE while the Grab escape window is open (the
   * telegraph), GRABBED or RESTRAINED otherwise, plus grab-outcome call-outs for heroes.
   */
  private grabCue(f: Fighter, p: Pos, top: number, time: number, escape: boolean): void {
    let c = this.cues.get(f.id);
    if (!c) {
      c = this.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      });
      c.setOrigin(0.5, 1);
      c.setDepth(14);
      this.cues.set(f.id, c);
    }
    let text = '';
    let color = '#ffffff';
    if (escape) {
      text = 'ESCAPE!';
      color = '#ffd166';
    } else if (f.state === MoveState.Grabbed) {
      text = 'GRABBED';
      color = '#c8a2ff';
    } else if (f.state === MoveState.Restrained) {
      text = `RESTRAINED ${Math.max(0, f.stun - f.stateFrame)}`;
      color = '#ff9a9a';
    }
    c.setText(text);
    c.setColor(color);
    c.setScale(escape ? 1.2 : 1);
    c.setPosition(p.x, top - 140);
    if (f.team !== 'hero') return;
    const key = `${f.grabEvent}/${f.grabFrame}`;
    if (this.lastGrab.get(f.id) === key) return;
    this.lastGrab.set(f.id, key);
    const call = GRAB_CALLOUTS[f.grabEvent];
    if (!call || f.grabFrame === 0) return;
    const t = this.add.text(p.x, top - 100, call.text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: call.color,
      stroke: '#000000',
      strokeThickness: 6,
    });
    t.setOrigin(0.5, 1);
    t.setDepth(13);
    this.popups.push({ text: t, born: time + (CALLOUT_MS - POPUP_MS) });
  }

  private updatePopups(time: number): void {
    this.popups = this.popups.filter((pop) => {
      const age = time - pop.born;
      if (age > POPUP_MS) {
        pop.text.destroy();
        return false;
      }
      pop.text.setY(pop.text.y - 1.2);
      pop.text.setAlpha(1 - age / POPUP_MS);
      return true;
    });
  }
}

interface Pos {
  x: number;
  z: number;
  y: number;
}

function interpolate(a: Fighter, b: Fighter, alpha: number): Pos {
  const lerp = (p: number, q: number) => fxToPixels(p + (q - p) * alpha);
  return { x: lerp(a.x, b.x), z: lerp(a.z, b.z), y: lerp(a.y, b.y) };
}
