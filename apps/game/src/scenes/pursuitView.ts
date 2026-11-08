import * as Phaser from 'phaser';
import {
  CORRIDORS,
  DIFFICULTIES,
  EnemyState,
  type Fighter,
  HEROES,
  MOUNTED,
  MountedSlot,
  ObstacleKind,
  type Pursuit,
  PursuitPhase,
  RideEvent,
  RiderState,
  fxToPixels,
  mountedKit,
  responseRecord,
  roadAt,
} from '@ffp/sim';
import { difficultyName, dt, heroName, t, type TextId } from '../text/i18n';

const VIEW_W = 1920;
const VIEW_H = 1080;
const HERO_COLORS = [0x4fa3ff, 0xff9a3c];
const RIDER_COLOR = 0x7a4a2a;
const RIDER_MARK = 0xffb020;
const CALLOUT_FRAMES = 50;
const px = fxToPixels;

const EVENT_TEXT: Partial<Record<number, { key: string; color: string }>> = {
  [RideEvent.Critical]: { key: 'ride.critical', color: '#ff5050' },
  [RideEvent.Crash]: { key: 'ride.crash', color: '#ff8f6b' },
  [RideEvent.Rescue]: { key: 'ride.rescue', color: '#7ddc7d' },
  [RideEvent.RescueChance]: { key: 'ride.rescueChance', color: '#ffd166' },
  [RideEvent.Rewind]: { key: 'ride.rewind', color: '#ffd166' },
  [RideEvent.Rejoin]: { key: 'ride.rejoin', color: '#7ddc7d' },
  [RideEvent.Checkpoint]: { key: 'ride.checkpointReached', color: '#8fe3ff' },
  [RideEvent.Evade]: { key: 'ride.evade', color: '#7df9ff' },
  [RideEvent.Brace]: { key: 'ride.brace', color: '#ffb347' },
  [RideEvent.Dismount]: { key: 'ride.dismount', color: '#7ddc7d' },
  [RideEvent.EquipmentHit]: { key: 'ride.equipmentHit', color: '#ff6b6b' },
  [RideEvent.Intercept]: { key: 'ride.intercept', color: '#ffd166' },
  [RideEvent.Impact]: { key: 'ride.impact', color: '#ff8f6b' },
  [RideEvent.Clear]: { key: 'ride.clear', color: '#7df9ff' },
  [RideEvent.Ramp]: { key: 'ride.ramp', color: '#c3a6ff' },
  [RideEvent.Finish]: { key: 'ride.finish', color: '#7ddc7d' },
  [RideEvent.Breakaway]: { key: 'ride.breakaway', color: '#bbbbbb' },
  [RideEvent.Whiff]: { key: 'ride.whiff', color: '#bbbbbb' },
  [RideEvent.Missed]: { key: 'ride.missed', color: '#ff8f6b' },
};

const style = (size: number, color = '#ffffff'): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'system-ui, sans-serif',
  fontSize: `${size}px`,
  color,
  stroke: '#000000',
  strokeThickness: Math.max(3, Math.round(size / 6)),
});

/** A reusable pool of text objects (world or screen space). */
export class TextPool {
  private items: Phaser.GameObjects.Text[] = [];
  private used = 0;
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly screen: boolean,
    private readonly depth: number,
  ) {}
  begin(): void {
    this.used = 0;
  }
  put(x: number, y: number, text: string, size: number, color = '#ffffff', origin = 0.5): void {
    let t = this.items[this.used];
    if (!t) {
      t = this.scene.add.text(0, 0, '', style(size, color)).setDepth(this.depth);
      if (this.screen) t.setScrollFactor(0);
      this.items.push(t);
    }
    this.used += 1;
    t.setVisible(true);
    t.setText(text);
    t.setStyle(style(size, color));
    t.setOrigin(origin, 0.5);
    t.setPosition(Math.round(x), Math.round(y));
  }
  end(): void {
    for (let i = this.used; i < this.items.length; i += 1) this.items[i]!.setVisible(false);
  }
}

/**
 * M17 greybox presentation of a Guided Pursuit Corridor: the road band with its soft
 * lanes, bends, obstacles, equipment, recovery gates and the greenhouse gate; the bikes
 * (hero colour and identification plate; Road Riders in rust with amber marks); Stability
 * bars, critical warnings, attack telegraphs and callouts; the HUD and the Response
 * Record. Hero figures are drawn by StageScene on top of their bikes. Reads the
 * simulation's pursuit only.
 */
export class PursuitView {
  private ground!: Phaser.GameObjects.Graphics;
  private back!: Phaser.GameObjects.Graphics;
  private front!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private words!: TextPool;
  private hudWords!: TextPool;

  constructor(private readonly scene: Phaser.Scene) {}

  create(): void {
    this.ground = this.scene.add.graphics().setDepth(0.2);
    this.back = this.scene.add.graphics().setDepth(0.9);
    this.front = this.scene.add.graphics().setDepth(3);
    this.hud = this.scene.add.graphics().setScrollFactor(0).setDepth(20);
    this.words = new TextPool(this.scene, false, 6);
    this.hudWords = new TextPool(this.scene, true, 21);
  }

  /** Nothing of the pursuit is drawn (Lab, arenas, stages). */
  hide(): void {
    for (const g of [this.ground, this.back, this.front, this.hud]) g.clear();
    this.words.begin();
    this.words.end();
    this.hudWords.begin();
    this.hudWords.end();
  }

  /** Camera scroll in pixels for this pursuit. */
  camX(p: Pursuit): number {
    return Math.round(px(p.camX));
  }

  draw(
    p: Pursuit,
    heroes: readonly Fighter[],
    frame: number,
    cheatAssisted: boolean,
    infiniteMeter: boolean,
  ): void {
    for (const g of [this.ground, this.back, this.front, this.hud]) g.clear();
    this.words.begin();
    this.hudWords.begin();
    const c = CORRIDORS[p.corridor]!;
    const cam = px(p.camX);
    this.drawRoad(p, cam, frame);
    const blink = Math.floor(frame / 8) % 2 === 0;
    // Road Riders.
    for (const e of p.enemies) {
      const x = px(e.x);
      const z = px(e.z);
      const down = e.state === EnemyState.Crash || e.state === EnemyState.Down;
      this.bike(x, z, 0, RIDER_COLOR, RIDER_MARK, down);
      if (e.state === EnemyState.Down) {
        // Dismounted at the road edge: the rider stands beside the settled bike.
        this.front.fillStyle(0x5a3a22, 1);
        this.front.fillRect(x - 70, z - 110, 26, 100);
      } else if (!down) {
        const wobble = e.critical ? (blink ? -6 : 6) : 0;
        this.front.fillStyle(0x4a2e1a, 1);
        this.front.fillRect(x - 18 + wobble, z - 120, 36, 72);
        this.front.fillStyle(RIDER_MARK, 1);
        this.front.fillRect(x - 18 + wobble, z - 108, 36, 6);
      }
      const top = z - 150;
      this.words.put(
        x,
        top - 34,
        dt(`rider.${MOUNTED.rider.id}.name`, MOUNTED.rider.name),
        20,
        '#ffd8a8',
      );
      if (!down) {
        this.bar(
          this.front,
          x - 60,
          top - 16,
          120,
          10,
          e.stability,
          e.maxStability,
          e.critical ? 0xff5050 : 0xffb020,
        );
        this.bar(this.front, x - 60, top - 4, 120, 6, e.health, e.maxHealth, 0xd04040);
      }
      if (e.state === EnemyState.Enter) {
        this.front.lineStyle(4, RIDER_MARK, blink ? 1 : 0.4);
        this.front.strokeEllipse(x, z, 220, 60);
      }
      if (e.state === EnemyState.Windup || e.state === EnemyState.Strike) {
        const target = e.target >= 0 ? p.riders.find((r) => r.slot === e.target) : undefined;
        const eq = e.equipment >= 0 && e.target < 0 ? c.equipment[e.equipment] : undefined;
        const tx = target ? px(target.x) : eq ? px(eq.at) : x;
        const tz = target ? px(target.z) : eq ? this.equipmentZ(c, eq) : z;
        this.front.lineStyle(
          e.state === EnemyState.Strike ? 10 : 5,
          0xff4040,
          blink || e.state === EnemyState.Strike ? 1 : 0.5,
        );
        this.front.lineBetween(x, z - 60, tx, tz - 60);
        const name = MOUNTED.rider.actions[e.attack];
        this.words.put(
          x,
          top - 64,
          `! ${name ? dt(`rider.${name.id}`, name.name) : ''}`,
          24,
          '#ff6b6b',
        );
      }
      if (e.state === EnemyState.Cutoff) {
        this.front.lineStyle(5, RIDER_MARK, blink ? 1 : 0.5);
        this.front.strokeTriangle(x + 70, z - 40, x + 70, z + 10, x + 110, z - 15);
        this.words.put(x, top - 64, t('ride.cutoff' as TextId), 24, '#ffb020');
      }
      if (e.critical && !down)
        this.words.put(x, top - 92, t('ride.critical' as TextId), 24, '#ff5050');
      this.callout(e.event, e.eventFrame, frame, x, top - 120);
    }
    // Hero bikes (the hero figure is drawn by the scene between `back` and `front`).
    for (const r of p.riders) {
      if (r.state === RiderState.Out) continue;
      const f = heroes.find((h) => h.slot === r.slot);
      const x = px(r.x);
      const z = px(r.z);
      const y = px(r.y);
      const color = HERO_COLORS[r.slot] ?? 0xffffff;
      const down = r.state === RiderState.Crash || r.state === RiderState.Downed;
      this.bike(x, z, y, color, 0xffffff, down);
      this.words.put(x, z + 30, MOUNTED.bike.plates[r.slot] ?? '', 16, '#e8e8e8');
      if (r.protectUntil > frame && blink) {
        this.back.lineStyle(3, 0xffffff, 0.6);
        this.back.strokeEllipse(x, z, 260, 70);
      }
      if (r.guardUntil > frame) {
        this.back.lineStyle(4, 0x7df9ff, 0.8);
        this.back.strokeEllipse(x, z, 240, 64);
      }
      if (r.critical && blink) {
        this.back.fillStyle(0xff2020, 0.35);
        this.back.fillEllipse(x, z, 260, 70);
      }
      const top = z - y - 220;
      if (f) {
        this.words.put(
          x,
          top - 50,
          `P${r.slot + 1} ${heroName(HEROES[f.hero]?.id ?? '')}`,
          22,
          '#ffffff',
        );
        this.bar(
          this.front,
          x - 70,
          top - 28,
          140,
          12,
          r.stability,
          MOUNTED.bike.stability,
          r.critical ? 0xff5050 : 0x7df9ff,
        );
        if (r.critical) this.words.put(x, top - 80, t('ride.critical' as TextId), 28, '#ff5050');
        if (r.action >= 0) this.strike(r, f, x, z - y, frame, color);
      }
      if (r.state === RiderState.Downed) {
        const left = Math.max(0, r.rescueUntil - frame);
        this.back.lineStyle(6, 0xffd166, blink ? 1 : 0.5);
        this.back.strokeEllipse(x, z, px(MOUNTED.bike.rescue.x) * 2, px(MOUNTED.bike.rescue.z) * 2);
        this.bar(
          this.front,
          x - 90,
          top - 110,
          180,
          10,
          left,
          MOUNTED.bike.rescue.window,
          0xffd166,
        );
        this.words.put(x, top - 134, t('ride.rescueHint' as TextId), 22, '#ffd166');
      }
      this.callout(r.event, r.eventFrame, frame, x, top - 160);
    }
    this.drawHud(p, heroes, frame, cheatAssisted, infiniteMeter);
    this.words.end();
    this.hudWords.end();
  }

  private equipmentZ(c: (typeof CORRIDORS)[number], e: { at: number; side: number }): number {
    const road = roadAt(c, e.at);
    return e.side === 0 ? px(road.top) - 40 : px(road.bottom) + 40;
  }

  private drawRoad(p: Pursuit, cam: number, frame: number): void {
    const c = CORRIDORS[p.corridor]!;
    const g = this.ground;
    g.fillStyle(0x1d2a20, 1);
    g.fillRect(cam - 20, 0, VIEW_W + 40, VIEW_H);
    g.fillStyle(0x23331f, 1);
    g.fillRect(cam - 20, 520, VIEW_W + 40, VIEW_H - 520);
    const step = 40;
    const from = Math.floor(cam / step) * step - step;
    const to = cam + VIEW_W + step;
    const top: Phaser.Math.Vector2[] = [];
    const bottom: Phaser.Math.Vector2[] = [];
    for (let x = from; x <= to; x += step) {
      const r = roadAt(c, x * 256);
      top.push(new Phaser.Math.Vector2(x, px(r.top)));
      bottom.push(new Phaser.Math.Vector2(x, px(r.bottom)));
    }
    g.fillStyle(0x464a52, 1);
    g.fillPoints([...top, ...bottom.reverse()], true);
    bottom.reverse();
    g.lineStyle(4, 0xe8e8e8, 0.9);
    g.strokePoints(top, false);
    g.strokePoints(bottom, false);
    // Soft lane guides (dashed): readable lanes, not rails.
    g.lineStyle(3, 0xd8d8d8, 0.45);
    for (let x = from; x <= to; x += 80) {
      if (Math.floor(x / 80) % 2 !== 0) continue;
      for (const k of [1, 2]) {
        const r1 = roadAt(c, x * 256);
        const r2 = roadAt(c, (x + 40) * 256);
        const y1 = px(r1.top) + ((px(r1.bottom) - px(r1.top)) * k) / 3;
        const y2 = px(r2.top) + ((px(r2.bottom) - px(r2.top)) * k) / 3;
        g.lineBetween(x, y1, x + 40, y2);
      }
    }
    // Recovery gates and the greenhouse gate.
    c.checkpoints.forEach((cp, i) => {
      const x = px(cp);
      if (x < cam - 100 || x > cam + VIEW_W + 100) return;
      const r = roadAt(c, cp);
      g.lineStyle(6, i <= p.checkpoint ? 0x7ddc7d : 0x8fe3ff, 0.8);
      g.lineBetween(x, px(r.top) - 30, x, px(r.bottom) + 10);
      this.words.put(
        x,
        px(r.top) - 50,
        `${t('ride.checkpoint' as TextId)} ${i + 1}`,
        20,
        '#8fe3ff',
      );
    });
    {
      const x = px(c.finish);
      if (x > cam - 200 && x < cam + VIEW_W + 200) {
        const r = roadAt(c, c.finish);
        g.fillStyle(0x7ddc7d, 0.35);
        g.fillRect(x, px(r.top) - 60, 40, px(r.bottom) - px(r.top) + 70);
        g.lineStyle(8, 0x7ddc7d, 1);
        g.strokeRect(x, px(r.top) - 60, 40, px(r.bottom) - px(r.top) + 70);
        this.words.put(x + 20, px(r.top) - 90, t('ride.finishLine' as TextId), 26, '#7ddc7d');
      }
    }
    // Obstacles.
    for (const o of c.obstacles) {
      const x = px(o.at);
      if (x < cam - 200 || x > cam + VIEW_W + 200) continue;
      const z = px(o.z);
      const hw = px(o.hw);
      const hd = px(o.hd);
      if (o.kind === ObstacleKind.Ramp) {
        g.fillStyle(0x8a6a3a, 1);
        g.fillTriangle(x - hw, z + hd, x + hw, z + hd, x + hw, z - hd);
        g.lineStyle(3, 0xffe0a0, 1);
        g.strokeTriangle(x - hw, z + hd, x + hw, z + hd, x + hw, z - hd);
      } else if (o.kind === ObstacleKind.Gate) {
        g.fillStyle(0x9aa0aa, 1);
        g.fillRect(x - hw, z - hd - 110, hw * 2, hd * 2 + 110);
        g.fillStyle(0xffd166, 1);
        g.fillRect(x - hw, z - hd - 110, hw * 2, 12);
      } else {
        g.fillStyle(0xe06a20, 1);
        g.fillRect(x - hw, z - hd - 36, hw * 2, hd * 2 + 36);
        g.fillStyle(0xffffff, 1);
        for (let k = 0; k < 3; k += 1) g.fillRect(x - hw, z - hd - 30 + k * 22, hw * 2, 8);
      }
    }
    // Equipment at the road edge.
    c.equipment.forEach((e, i) => {
      const x = px(e.at);
      if (x < cam - 200 || x > cam + VIEW_W + 200) return;
      const z = this.equipmentZ(c, e);
      const state = p.equipment[i] ?? 0;
      const blink = Math.floor(frame / 8) % 2 === 0;
      const color = state === 2 ? 0xd04040 : state === 1 && blink ? 0xffd166 : 0x5ec26a;
      g.fillStyle(color, 1);
      g.fillRect(x - 40, z - 70, 80, 70);
      g.lineStyle(3, 0x101010, 1);
      g.strokeRect(x - 40, z - 70, 80, 70);
      const name = dt(`corridor.${c.id}.equipment.${e.id}`, e.name);
      const suffix =
        state === 2
          ? ` (${t('ride.damaged' as TextId)})`
          : state === 1
            ? ` · ${t('ride.threat' as TextId)}!`
            : '';
      this.words.put(x, z - 92, `${name}${suffix}`, 20, state === 2 ? '#ff8f8f' : '#d8ffd8');
    });
  }

  /** A bike: wheels, frame and seat, lying flat after a crash. Height `y` lifts a hop. */
  private bike(x: number, z: number, y: number, color: number, mark: number, down: boolean): void {
    const b = this.back;
    const f = this.front;
    b.fillStyle(0x000000, 0.35);
    b.fillEllipse(x, z, 170, 30);
    if (down) {
      f.fillStyle(color, 1);
      f.fillRect(x - 70, z - 30, 140, 22);
      f.fillStyle(0x202020, 1);
      f.fillCircle(x - 60, z - 12, 14);
      f.fillCircle(x + 60, z - 12, 14);
      return;
    }
    const base = z - y;
    f.fillStyle(0x202020, 1);
    f.fillCircle(x - 55, base - 20, 20);
    f.fillCircle(x + 55, base - 20, 20);
    f.fillStyle(0x9a9a9a, 1);
    f.fillCircle(x - 55, base - 20, 7);
    f.fillCircle(x + 55, base - 20, 7);
    f.fillStyle(color, 1);
    f.fillRect(x - 50, base - 58, 100, 26);
    f.fillStyle(mark, 1);
    f.fillRect(x + 30, base - 66, 26, 10);
    f.fillStyle(0x303030, 1);
    f.fillRect(x - 40, base - 64, 50, 8);
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
    g.fillStyle(0x000000, 0.7);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(color, 1);
    g.fillRect(x, y, Math.round((w * Math.max(0, value)) / Math.max(1, max)), h);
  }

  private callout(kind: number, at: number, frame: number, x: number, y: number): void {
    const e = EVENT_TEXT[kind];
    if (!e || frame - at > CALLOUT_FRAMES) return;
    this.words.put(x, y - (frame - at) * 0.6, t(e.key as TextId), 26, e.color);
  }

  /** The rider-delivered strike: its reach in the hero's colour during the active frames. */
  private strike(
    r: Pursuit['riders'][number],
    f: Fighter,
    x: number,
    z: number,
    frame: number,
    color: number,
  ): void {
    const a = mountedKit(f.hero)[r.action];
    if (!a) return;
    const tt = frame - r.actionAt;
    const g = this.back;
    if (a.slot === MountedSlot.Lean) {
      const on = tt >= a.evadeFrom && tt <= a.evadeTo;
      g.lineStyle(5, 0x7df9ff, on ? 1 : 0.3);
      g.strokeEllipse(x, z - 60, 180, 150);
      return;
    }
    if (a.slot === MountedSlot.Hop) return;
    const active = tt >= a.startup && tt < a.startup + a.active;
    g.fillStyle(color, active ? 0.45 : 0.15);
    if (a.slot === MountedSlot.Ultimate) {
      g.fillRect(x - px(a.radius), z - 80, px(a.radius) * 2, 90);
    } else if (a.slot === MountedSlot.Directional) {
      const dir = r.actionDir === 0 ? 1 : r.actionDir;
      const z1 = z + dir * px(a.near);
      const z2 = z + dir * px(a.far);
      g.fillRect(x - px(a.reachX), Math.min(z1, z2) - 40, px(a.reachX) * 2, Math.abs(z2 - z1));
    } else if (a.seek === 3) {
      g.fillRect(x - 40, z - px(a.reachZ) - 40, px(a.reachX) + 40, px(a.reachZ) * 2);
    } else {
      g.fillRect(x - px(a.reachX), z - px(a.reachZ) - 40, px(a.reachX) * 2, px(a.reachZ) * 2);
    }
  }

  private drawHud(
    p: Pursuit,
    heroes: readonly Fighter[],
    frame: number,
    cheatAssisted: boolean,
    infiniteMeter: boolean,
  ): void {
    const c = CORRIDORS[p.corridor]!;
    const h = this.hud;
    const w = this.hudWords;
    const diff = DIFFICULTIES[p.difficulty];
    w.put(
      VIEW_W / 2,
      30,
      `${dt(`corridor.${c.id}.name`, c.name)} · ${diff ? difficultyName(diff.id) : ''}`,
      28,
    );
    w.put(VIEW_W / 2, 64, dt(`corridor.${c.id}.goal`, c.goal), 20, '#d8ffd8');
    // Progress to the gate with the recovery gates and each rider.
    const bx = 460;
    const bw = 1000;
    const span = c.finish - c.start;
    const at = (x: number) =>
      bx + Math.max(0, Math.min(bw, Math.round((bw * (x - c.start)) / span)));
    h.fillStyle(0x000000, 0.6);
    h.fillRect(bx - 4, 88, bw + 8, 18);
    h.fillStyle(0x3a3e46, 1);
    h.fillRect(bx, 92, bw, 10);
    c.checkpoints.forEach((cp, i) => {
      h.fillStyle(i <= p.checkpoint ? 0x7ddc7d : 0x8fe3ff, 1);
      h.fillRect(at(cp) - 2, 86, 4, 22);
    });
    h.fillStyle(0x7ddc7d, 1);
    h.fillRect(bx + bw - 4, 82, 8, 30);
    for (const r of p.riders) {
      if (r.state === RiderState.Out) continue;
      h.fillStyle(HERO_COLORS[r.slot] ?? 0xffffff, 1);
      h.fillCircle(at(r.x), 97, 9);
    }
    const lead = Math.max(...p.riders.map((r) => r.x), c.start);
    const left = Math.max(0, Math.min(100, Math.round((100 * (c.finish - lead)) / span)));
    w.put(bx + bw + 20, 97, `${left}% ${t('ride.progress' as TextId)}`, 18, '#ffffff', 0);
    // Per-hero panels: Health, Stability, Attack Bar, the mounted kit.
    p.riders.forEach((r) => {
      const f = heroes.find((x) => x.slot === r.slot);
      if (!f) return;
      const x0 = r.slot === 0 ? 24 : VIEW_W - 444;
      const y0 = 130;
      h.fillStyle(0x000000, 0.55);
      h.fillRect(x0, y0, 420, 150);
      w.put(
        x0 + 12,
        y0 + 18,
        `P${r.slot + 1} ${heroName(HEROES[f.hero]?.id ?? '')} · ${MOUNTED.bike.plates[r.slot] ?? ''}`,
        20,
        '#ffffff',
        0,
      );
      const row = (y: number, label: string, v: number, max: number, color: number, extra = '') => {
        w.put(x0 + 12, y, label, 16, '#dddddd', 0);
        this.bar(h, x0 + 150, y - 6, 200, 12, v, max, color);
        w.put(
          x0 + 360,
          y,
          extra || `${Math.round((100 * v) / Math.max(1, max))}`,
          16,
          '#ffffff',
          0,
        );
      };
      row(y0 + 48, t('ride.health' as TextId), f.health, f.maxHealth, 0x5ec26a);
      const critical = r.critical && Math.floor(frame / 8) % 2 === 0;
      row(
        y0 + 72,
        t('ride.stability' as TextId),
        r.stability,
        MOUNTED.bike.stability,
        r.critical ? 0xff5050 : 0x7df9ff,
        critical ? '!!' : '',
      );
      row(y0 + 96, t('ride.attackBar' as TextId), infiniteMeter ? 1000 : f.meter, 1000, 0xffd166);
      const kit = mountedKit(f.hero);
      const state =
        r.state === RiderState.Out
          ? t('ride.out' as TextId)
          : r.protectUntil > frame
            ? t('ride.protected' as TextId)
            : '';
      w.put(
        x0 + 12,
        y0 + 124,
        `${t('ride.speed' as TextId)} ${Math.round(px(r.speed) * 10) / 10} · ${kit
          .filter((a) => a.slot === MountedSlot.Special || a.slot === MountedSlot.Ultimate)
          .map((a) => dt(`mounted.${HEROES[f.hero]?.id}.${a.id}`, a.name))
          .join(' · ')}${state ? ` · ${state}` : ''}`,
        15,
        '#cfe8ff',
        0,
      );
    });
    if (p.phase === PursuitPhase.Complete) this.drawRecord(p, cheatAssisted);
  }

  private drawRecord(p: Pursuit, cheatAssisted: boolean): void {
    const rec = responseRecord(p);
    const h = this.hud;
    const w = this.hudWords;
    const x0 = VIEW_W / 2 - 360;
    const y0 = 300;
    h.fillStyle(0x0b0f14, 0.88);
    h.fillRect(x0, y0, 720, 420);
    h.lineStyle(4, 0x7ddc7d, 1);
    h.strokeRect(x0, y0, 720, 420);
    w.put(VIEW_W / 2, y0 + 40, t('ride.recordTitle' as TextId), 32, '#7ddc7d');
    rec.lines.forEach((l, i) => {
      const y = y0 + 100 + i * 46;
      w.put(x0 + 60, y, t(`ride.record.${l.id}` as TextId), 26, '#ffffff', 0);
      w.put(x0 + 470, y, `${l.score}`, 26, '#cfe8ff', 1);
      w.put(x0 + 600, y, l.grade, 32, l.grade === 'S' ? '#ffd166' : '#ffffff');
    });
    w.put(
      VIEW_W / 2,
      y0 + 345,
      `${t('ride.mastery' as TextId)}: ${t((rec.mastery ? 'ride.masteryYes' : 'ride.masteryNo') as TextId)}`,
      22,
      rec.mastery ? '#ffd166' : '#bbbbbb',
    );
    if (cheatAssisted) w.put(VIEW_W / 2, y0 + 380, t('ride.cheat' as TextId), 20, '#ffb347');
    w.put(VIEW_W / 2, y0 + 450, t('ride.again' as TextId), 20, '#dddddd');
  }
}
