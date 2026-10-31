import * as Phaser from 'phaser';
import { type Body, fxToPixels } from '@ffp/sim';
import type { RenderSnapshot } from '../game';

export const VIEW_WIDTH = 1920;
export const VIEW_HEIGHT = 1080;
const FLOOR_TOP = 620;
const FLOOR_BOTTOM = 1000;
const BODY_W = 90;
const BODY_H = 300;
const NOTCH = 24;

/** Greybox stage: a floor band and one rectangle per body, drawn from snapshots only. */
export class StageScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;

  constructor(private readonly getSnapshot: () => RenderSnapshot) {
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
    const { previous, current, alpha } = this.getSnapshot();
    const byId = new Map(previous.map((b) => [b.id, b]));
    const drawn = current
      .map((b) => interpolate(byId.get(b.id) ?? b, b, alpha))
      .sort((a, b) => a.z - b.z);
    const g = this.gfx;
    g.clear();
    for (const b of drawn) {
      const left = b.x - BODY_W / 2;
      const top = b.z - b.y - BODY_H;
      // Shadow on the floor, then the body, then a notch showing which way it faces.
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(b.x, b.z, BODY_W * 1.2, 24);
      g.fillStyle(0xd8d8d8, 1);
      g.fillRect(left, top, BODY_W, BODY_H);
      g.fillStyle(0xe0503c, 1);
      const notchX = b.facing === 1 ? left + BODY_W - NOTCH : left;
      g.fillRect(notchX, top + 40, NOTCH, NOTCH);
    }
  }
}

interface DrawnBody {
  x: number;
  z: number;
  y: number;
  facing: Body['facing'];
}

function interpolate(a: Body, b: Body, alpha: number): DrawnBody {
  const lerp = (p: number, q: number) => fxToPixels(p + (q - p) * alpha);
  return { x: lerp(a.x, b.x), z: lerp(a.z, b.z), y: lerp(a.y, b.y), facing: b.facing };
}
