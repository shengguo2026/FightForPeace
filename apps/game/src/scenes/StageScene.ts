import * as Phaser from 'phaser';
import { BODY_HALF_D, BODY_HALF_W, type Fighter, MoveState, fxToPixels } from '@ffp/sim';
import type { RenderSnapshot } from '../game';

export const VIEW_WIDTH = 1920;
export const VIEW_HEIGHT = 1080;
const FLOOR_TOP = 620;
const FLOOR_BOTTOM = 1000;
const BODY_W = 90;
const BODY_H = 300;
const NOTCH = 24;
const HERO_COLORS = [0x4fa3ff, 0xff9a3c];
const DUMMY_COLOR = 0x9a9ea6;

export interface StageOptions {
  getSnapshot: () => RenderSnapshot;
  showCollision: () => boolean;
}

/**
 * Greybox stage drawn from simulation snapshots only: a floor band, placeholder heroes
 * in their player colours, training dummies, floor shadows (which stay on the floor while
 * a hero jumps), an attack-pose arm, and optional collision footprints.
 */
export class StageScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private labels = new Map<number, Phaser.GameObjects.Text>();

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

  override update(): void {
    const { previous, current, alpha } = this.opts.getSnapshot();
    const byId = new Map(previous.map((b) => [b.id, b]));
    const drawn = current
      .map((b) => interpolate(byId.get(b.id) ?? b, b, alpha))
      .sort((a, b) => a.z - b.z || a.id - b.id);
    const g = this.gfx;
    g.clear();
    const collision = this.opts.showCollision();
    for (const b of drawn) {
      // Shadow on the floor, smaller the higher the body is.
      const lift = Math.min(b.y / 200, 0.6);
      g.fillStyle(0x000000, 0.35 * (1 - lift));
      g.fillEllipse(b.x, b.z, BODY_W * 1.2 * (1 - lift / 2), 24 * (1 - lift / 2));
      if (collision) {
        g.lineStyle(2, b.passEnemies ? 0xff4040 : 0x40ff80, 0.9);
        const hw = fxToPixels(BODY_HALF_W);
        const hd = fxToPixels(BODY_HALF_D);
        g.strokeRect(b.x - hw, b.z - hd, hw * 2, hd * 2);
      }
      const left = b.x - BODY_W / 2;
      const top = b.z - b.y - BODY_H;
      const color = b.team === 'hero' ? (HERO_COLORS[b.slot] ?? 0xd8d8d8) : DUMMY_COLOR;
      g.fillStyle(color, b.state === MoveState.Dash ? 0.7 : 1);
      g.fillRect(left, top, BODY_W, BODY_H);
      // Facing notch.
      g.fillStyle(0xe0503c, 1);
      const notchX = b.facing === 1 ? left + BODY_W - NOTCH : left;
      g.fillRect(notchX, top + 40, NOTCH, NOTCH);
      if (b.state === MoveState.Attack) {
        // Placeholder attack pose: an arm out in the facing direction (no hitbox in M1).
        g.fillStyle(0xfff2a8, 1);
        const armX = b.facing === 1 ? left + BODY_W : left - 70;
        g.fillRect(armX, top + 110, 70, 22);
      }
      this.label(b, top);
    }
  }

  private label(b: DrawnBody, top: number): void {
    let t = this.labels.get(b.id);
    if (!t) {
      const text = b.team === 'hero' ? `P${b.slot + 1}` : `Dummy ${b.id - 100}`;
      t = this.add.text(0, 0, text, { fontFamily: 'system-ui, sans-serif', fontSize: '28px' });
      t.setOrigin(0.5, 1);
      this.labels.set(b.id, t);
    }
    t.setPosition(b.x, top - 8);
    t.setDepth(10);
  }
}

interface DrawnBody {
  id: number;
  team: Fighter['team'];
  slot: number;
  state: number;
  passEnemies: boolean;
  x: number;
  z: number;
  y: number;
  facing: Fighter['facing'];
}

function interpolate(a: Fighter, b: Fighter, alpha: number): DrawnBody {
  const lerp = (p: number, q: number) => fxToPixels(p + (q - p) * alpha);
  return {
    id: b.id,
    team: b.team,
    slot: b.slot,
    state: b.state,
    passEnemies: b.passEnemies,
    x: lerp(a.x, b.x),
    z: lerp(a.z, b.z),
    y: lerp(a.y, b.y),
    facing: b.facing,
  };
}
