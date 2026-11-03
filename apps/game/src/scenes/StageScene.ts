import * as Phaser from 'phaser';
import {
  BODY_HALF_D,
  BODY_HALF_W,
  DefEvent,
  type Fighter,
  HEROES,
  MoveState,
  activeHitbox,
  fxToPixels,
  groundFocus,
  hurtbox,
  kitOf,
  phaseOf,
} from '@ffp/sim';
import { profileText } from '../text/en';
import { AssetRegistry, type PlaceholderFamily } from '@ffp/platform';
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
};
const RECOVERY_COLOR = 0x8a8f99;
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
};

export interface StageOptions {
  getSnapshot: () => RenderSnapshot;
  showCollision: () => boolean;
  showLabels: () => boolean;
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
  private popups: Popup[] = [];
  private readonly assets = new AssetRegistry();

  constructor(private readonly opts: StageOptions) {
    super('stage');
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
  }

  override update(time: number): void {
    const { previous, current, alpha } = this.opts.getSnapshot();
    const byId = new Map(previous.map((b) => [b.id, b]));
    const drawn = current
      .map((b) => ({ f: b, p: interpolate(byId.get(b.id) ?? b, b, alpha) }))
      .sort((a, b) => a.p.z - b.p.z || a.f.id - b.f.id);
    const g = this.gfx;
    g.clear();
    const collision = this.opts.showCollision();
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
      const top = this.drawBody(f, p);
      this.label(f, p, top);
      this.feedback(f, p, top, time);
      this.defense(f, p, top, time);
    }
    // Boxes go on top of every body, so a hitbox inside a target stays visible.
    if (collision) for (const { f, p } of drawn) this.drawBoxes(f, p);
    this.updatePopups(time);
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
    const g = this.gfx;
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
