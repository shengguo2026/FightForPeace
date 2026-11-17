import * as Phaser from 'phaser';
import {
  type Breakable,
  ENEMIES,
  type Fighter,
  type Item,
  MoverPhase,
  PassPhase,
  RobotState,
  type SharedState,
  WEAPONS,
  fxToPixels,
  profileOf,
} from '@ffp/sim';
import { t, type TextId } from '../text/i18n';
import { TextPool } from './pursuitView';

const px = fxToPixels;
const ROBOT_COLOR = [0x8fb8ff, 0xffd166, 0xff6b4a, 0x999999, 0x6fd18a, 0x555555];

/**
 * M24 placeholder presentation of the shared systems: labelled boxes for movers (amber
 * marker during the warning, red sweep), platforms, robot stations with their state, lane
 * markers and Stability bars of mounted fighters, gear pips, heat, disguise and
 * noncombatant tags, fused blast areas and the property-incident counter. Every state is
 * written out, never colour alone. Reads the simulation only.
 */
export class SharedView {
  private g!: Phaser.GameObjects.Graphics;
  private words!: TextPool;

  constructor(private readonly scene: Phaser.Scene) {}

  create(): void {
    this.g = this.scene.add.graphics().setDepth(2.5);
    this.words = new TextPool(this.scene, false, 7);
  }

  hide(): void {
    this.g.clear();
    this.words.begin();
    this.words.end();
  }

  draw(
    shared: SharedState | null,
    bodies: readonly Fighter[],
    items: readonly Item[],
    frame: number,
    breakables: readonly Breakable[] = [],
  ): void {
    const g = this.g;
    g.clear();
    this.words.begin();
    const label = (x: number, y: number, key: string, color = '#ffffff', n?: number) =>
      this.words.put(
        x,
        y,
        t(key as TextId, n === undefined ? undefined : { n: String(n) }),
        18,
        color,
      );
    // M27: quarry scenery states are written out beside the prop, never by colour alone.
    for (const b of breakables) {
      const key = b.tags?.includes('scaffold')
        ? `m27.scaffold.${b.state}`
        : b.tags?.includes('timber') && b.state < 3
          ? 'm27.timber'
          : b.tags?.includes('stone') && b.state < 3
            ? 'm27.stone'
            : null;
      if (key) label(px(b.x), px(b.z) - px(b.h) - 30, key, '#f0e0c0');
    }
    if (shared) {
      for (const m of shared.movers) {
        const [x0, z0, x1, z1, hw, hd, h] = [m.x0, m.z0, m.x1, m.z1, m.hw, m.hd, m.h].map(
          px,
        ) as number[];
        if (m.phase === MoverPhase.Warn) {
          const pulse = 0.25 + 0.25 * Math.abs(Math.sin(m.phaseFrame / 4));
          g.fillStyle(0xffb020, pulse);
          g.fillRect(
            Math.min(x0!, x1!) - hw!,
            Math.min(z0!, z1!) - hd!,
            Math.abs(x1! - x0!) + hw! * 2,
            Math.abs(z1! - z0!) + hd! * 2,
          );
          label(
            (x0! + x1!) / 2,
            Math.min(z0!, z1!) - hd! - 16,
            m.redirectedBy ? 'm24.mover.redirected' : 'm24.mover.warn',
            '#ffd27a',
          );
        }
        if (m.phase === MoverPhase.Done) continue;
        const [x, z] = [px(m.x), px(m.z)];
        const active = m.phase === MoverPhase.Active;
        // M27: the quarry movers have prop art (drawn by the stage); outline them only.
        const drawn =
          ['cart', 'cargo', 'cover'].some((k) => m.tags.includes(k)) &&
          this.scene.textures.exists('prop.s3-quarry');
        if (!drawn) {
          g.fillStyle(
            active ? (m.redirectedBy ? 0x6fd18a : 0xff3b30) : 0x8a7a66,
            active ? 0.9 : 0.6,
          );
          g.fillRect(x - hw!, z - h!, hw! * 2, h!);
        }
        g.lineStyle(3, active ? (m.redirectedBy ? 0x6fd18a : 0xff3b30) : 0x000000, 0.8);
        g.strokeRect(x - hw!, z - h!, hw! * 2, h!);
        // M27: the quarry movers are named (mine cart, winch cargo, sliding cover).
        const tag = ['cart', 'cargo', 'cover'].find((k) => m.tags?.includes(k));
        label(x, z - h! - 14, tag ? `m27.${tag}` : 'm24.mover');
      }
      for (const p of shared.platforms) {
        const [x, z, hw, hd] = [p.x, p.z, p.hw, p.hd].map(px) as number[];
        g.fillStyle(0x7a6a50, 0.55);
        g.fillRect(x! - hw!, z! - hd!, hw! * 2, hd! * 2);
        g.lineStyle(3, 0xd8c7a0, 0.9);
        g.strokeRect(x! - hw!, z! - hd!, hw! * 2, hd! * 2);
        label(x!, z! - hd! - 14, 'm24.platform', '#f0e0c0');
      }
      for (const st of shared.stations) {
        const [x, z] = [px(st.x), px(st.z)];
        g.lineStyle(4, ROBOT_COLOR[st.state] ?? 0xffffff, 0.9);
        g.strokeEllipse(x, z, 90, 30);
        label(x, z - 40, `m24.station.${st.kind}`);
        label(
          x,
          z + 30,
          `m24.robot.${st.state}`,
          st.state === RobotState.Active ? '#9be8b0' : '#dddddd',
        );
      }
      if (shared.incidents.length > 0) {
        const cam = this.scene.cameras.main;
        this.words.put(
          cam.scrollX + 960,
          cam.scrollY + 150,
          t('m24.incidents' as TextId, { n: String(shared.incidents.length) }),
          22,
          '#ffb3a3',
        );
      }
      if (frame < shared.delayUntil) {
        const cam = this.scene.cameras.main;
        this.words.put(
          cam.scrollX + 960,
          cam.scrollY + 180,
          t('m24.waveHeld' as TextId),
          22,
          '#cfe0ff',
        );
      }
    }
    for (const f of bodies) {
      const e = f.ext;
      const prof = profileOf(f);
      const [x, z] = [px(f.x), px(f.z)];
      if (prof?.noncombatant) label(x, z - 300, 'm24.noncombatant', '#cccccc');
      if (!e) continue;
      if (e.disguised) label(x, z - 300, 'm24.disguised', '#cccccc');
      if (e.floorAt > 0) label(x, z - 320, 'm24.withdraw', '#ffe7a3');
      const r = e.rider;
      if (r && r.phase !== PassPhase.Dismounted) {
        const lane = profileOf(f)?.mount?.lane ?? 0;
        if (r.phase === PassPhase.Warn || r.phase === PassPhase.Pass) {
          g.fillStyle(r.phase === PassPhase.Warn ? 0xffb020 : 0xff3b30, 0.25);
          const left = this.scene.cameras.main.scrollX;
          g.fillRect(left, px(r.lane - lane), 1920, px(lane * 2));
          label(x, px(r.lane) - px(lane) - 14, 'm24.lane', '#ffd27a');
        }
        // A horse or bike body under the rider (placeholder box, unless the rider has its
        // mounted sheets: the M27 Mounted Raider) and the Stability bar.
        const art = ENEMIES[f.hero]?.art ?? ENEMIES[f.hero]?.id ?? '';
        if (!this.scene.textures.exists(`enemy.${art}.sheet.mount-ride`)) {
          g.fillStyle(0x6b4a2b, 0.9);
          g.fillRect(x - 90, z - 110, 180, 70);
        }
        const w = 120;
        g.fillStyle(0x000000, 0.7);
        g.fillRect(x - w / 2, z - 340, w, 10);
        g.fillStyle(0x8fb8ff, 1);
        g.fillRect(x - w / 2, z - 340, (w * r.stability) / Math.max(1, r.max), 10);
        label(x, z - 356, 'm24.stability', '#cfe0ff');
      }
      const gear = profileOf(f)?.gear ?? [];
      gear.forEach((piece, i) => {
        const left = e.gear[i] ?? 0;
        const gx = x - 40 + i * 30;
        g.fillStyle(left > 0 ? 0xd8c7a0 : 0x444444, 1);
        g.fillRect(gx, z - 320, 22, 14);
        g.fillStyle(0x6fd18a, 1);
        g.fillRect(gx, z - 324, (22 * left) / Math.max(1, piece.guard), 3);
      });
      if (gear.length > 0) label(x - 70, z - 313, 'm24.gear', '#f0e0c0');
      if (e.heat > 0 || e.heatLock > 0) {
        const held = items.find((i) => i.id === f.item);
        const max = held ? (WEAPONS[held.def]?.heat?.max ?? 100) : 100;
        g.fillStyle(0x000000, 0.7);
        g.fillRect(x - 60, z - 300, 120, 8);
        g.fillStyle(e.heatLock ? 0xff3b30 : 0xffb020, 1);
        g.fillRect(x - 60, z - 300, (120 * e.heat) / Math.max(1, max), 8);
        label(
          x,
          z - 312,
          e.heatLock ? 'm24.overheated' : 'm24.heat',
          e.heatLock ? '#ffb3a3' : '#ffe7a3',
        );
      }
      if (e.support) {
        let n = 0;
        for (let i = 0; i < e.support.count; i += 1) if ((e.support.used & (1 << i)) === 0) n += 1;
        label(x, z - 300, 'm24.supporter', '#9be8b0', n);
      }
    }
    for (const it of items) {
      if (it.fuseAt === undefined) continue;
      const b = WEAPONS[it.def]?.blast;
      if (!b) continue;
      const [x, z, hw, hd] = [it.x, it.z, b.hw, b.hd].map(px) as number[];
      const left = Math.max(0, it.fuseAt - frame);
      g.fillStyle(0xffb020, 0.2 + 0.25 * Math.abs(Math.sin(left / 3)));
      g.fillEllipse(x!, z!, hw! * 2, hd! * 2);
      label(x!, z! - hd! - 14, 'm24.blast', '#ffd27a');
    }
    this.words.end();
  }
}
