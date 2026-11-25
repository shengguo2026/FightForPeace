import * as Phaser from 'phaser';
import {
  CaseState,
  ChannelPhase,
  HoldKind,
  OBJECTIVES,
  UnitPhase,
  caseOutcome,
  fxToPixels,
} from '@ffp/sim';
import type { AssetRegistry } from '@ffp/platform';
import { t, type TextId } from '../text/i18n';
import type { ObjectivesSnapshot } from '../game';
import { TextPool } from './pursuitView';

const px = fxToPixels;
/** Condition icons beside the text (never colour alone): full, half and empty shields. */
const CONDITION_ICON = ['◆', '◈', '◇'];
const CONDITION_COLOR = ['#9be8b0', '#ffd27a', '#ff9a8a'];
/**
 * M28: the Stage 3 rescued people's pose cells (npc.s3-<id>.sheet, 3 x 2): bound, freed,
 * then Secure / Strained / Critical once safe; walking uses their walk sheet. An Bo has no
 * Critical pose (his sheet calms the horses instead) and Wei Shan waves when safe.
 */
const S3_POSES: Record<string, { safe: [number, number, number] }> = {
  'gao-wen': { safe: [2, 3, 4] },
  'tao-min': { safe: [2, 3, 4] },
  'an-bo': { safe: [2, 3, 3] },
  'ren-xia': { safe: [2, 3, 4] },
  'wei-shan': { safe: [4, 4, 4] },
};

/** Objective events with a caption line (ObjEvent numbers). */
const EVENT_TEXT: readonly number[] = [1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13];

/**
 * M25 placeholder presentation of the objective framework: each protected unit as a
 * labelled figure box with its zone, route, hand-off point and shelter; its phase,
 * condition (text and icon) and hostile-action count with the lock; each evidence case
 * with its state; each hostile channel's spot with its action label and a tell bar while
 * an enemy works it (or "paused by the robot"); the hold prompt over a hero; and a screen
 * panel with the room's live 100-point grade. Reads the simulation only.
 */
export class ObjectivesView {
  private g!: Phaser.GameObjects.Graphics;
  private words!: TextPool;
  private hud!: TextPool;
  private panel!: Phaser.GameObjects.Graphics;
  /** M28: the rescued people's sprites, by unit index. */
  private readonly people = new Map<number, Phaser.GameObjects.Sprite>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly assets?: AssetRegistry,
  ) {}

  /** M28: draws a Stage 3 person on their own sheet; false when there is no art for them. */
  private person(
    i: number,
    id: string,
    phase: number,
    cond: number,
    x: number,
    z: number,
    toLeft: boolean,
    frame: number,
  ): boolean {
    const poses = S3_POSES[id];
    if (!poses || !this.assets) return false;
    const base = `npc.s3-${id}.sheet`;
    const walkId = `npc.s3-${id}.walk`;
    const walking = phase === UnitPhase.Moving && this.scene.textures.exists(walkId);
    const sheet = walking ? walkId : base;
    const meta = this.assets.sheet(sheet)?.sheet;
    if (!meta || !this.scene.textures.exists(sheet)) return false;
    const cell = walking
      ? Math.floor(frame / 9) % meta.cells.length
      : phase === UnitPhase.Captive
        ? 0
        : phase === UnitPhase.Safe
          ? poses.safe[Math.min(cond, 2)]!
          : phase === UnitPhase.Moving
            ? 5
            : 1;
    let sp = this.people.get(i);
    if (!sp) {
      sp = this.scene.add.sprite(x, z, sheet, cell);
      this.people.set(i, sp);
    }
    sp.setVisible(true);
    sp.setTexture(sheet, cell);
    sp.setOrigin(0.5, meta.ground / meta.cell);
    sp.setScale(0.95 * (meta.scale ?? 1));
    sp.setPosition(x, z);
    sp.setDepth(1 + z / 2000);
    sp.setFlipX(phase === UnitPhase.Moving && toLeft);
    return true;
  }

  private dropPeople(keep: Set<number>): void {
    for (const [i, sp] of this.people) {
      if (keep.has(i)) continue;
      sp.destroy();
      this.people.delete(i);
    }
  }

  create(): void {
    this.g = this.scene.add.graphics().setDepth(2.4);
    this.panel = this.scene.add.graphics().setDepth(9).setScrollFactor(0);
    this.words = new TextPool(this.scene, false, 7);
    this.hud = new TextPool(this.scene, true, 9.1);
  }

  hide(): void {
    this.dropPeople(new Set());
    this.g.clear();
    this.panel.clear();
    for (const p of [this.words, this.hud]) {
      p.begin();
      p.end();
    }
  }

  draw(o: ObjectivesSnapshot | null, frame: number): void {
    if (!o) {
      this.hide();
      return;
    }
    const g = this.g;
    g.clear();
    this.words.begin();
    const say = (key: string, vars?: Record<string, string>) => t(key as TextId, vars);
    const label = (x: number, y: number, text: string, color = '#ffffff', size = 18) =>
      this.words.put(x, y, text, size, color);
    const { state, defs } = o;
    const drawn = new Set<number>();

    defs.units.forEach((d, i) => {
      const u = state.units[i]!;
      const cond = o.conditions[i] ?? 0;
      const ladder = OBJECTIVES.ladders.find((l) => l.id === d.ladder);
      const condName = say(`objective.ladder.${d.ladder}.${ladder?.states[cond]?.id ?? ''}`);
      // Zone around the enclosure (where the hostile actions happen), dashed by segments.
      g.lineStyle(2, 0xcfe0ff, 0.6);
      const [zx, zz, hw, hd] = [d.x, d.z, d.hw, d.hd];
      for (let s = -hw; s < hw; s += 40) {
        g.lineBetween(zx + s, zz - hd, zx + Math.min(s + 20, hw), zz - hd);
        g.lineBetween(zx + s, zz + hd, zx + Math.min(s + 20, hw), zz + hd);
      }
      for (let s = -hd; s < hd; s += 40) {
        g.lineBetween(zx - hw, zz + s, zx - hw, zz + Math.min(s + 20, hd));
        g.lineBetween(zx + hw, zz + s, zx + hw, zz + Math.min(s + 20, hd));
      }
      label(zx - hw + 90, zz - hd - 14, say('m25.zone'), '#cfe0ff', 16);
      // Route: hand-off points and the shelter.
      let [lx, lz] = [d.x, d.z];
      d.route.forEach((p, k) => {
        g.lineStyle(2, 0xffffff, 0.35);
        g.lineBetween(lx, lz, p.x, p.z);
        [lx, lz] = [p.x, p.z];
        const last = k === d.route.length - 1;
        g.lineStyle(3, last ? 0x9be8b0 : 0xffd27a, 0.9);
        g.strokeCircle(p.x, p.z, last ? 34 : 22);
        if (last) label(p.x, p.z + 50, say('m25.shelter'), '#9be8b0', 16);
        else if (p.wait) label(p.x, p.z + 40, say('m25.handoff'), '#ffd27a', 16);
      });
      // The person: their own pose sheet (M28), else a placeholder figure box, bound
      // (crossed) while captive.
      const [x, z] = [px(u.x), px(u.z)];
      const shelter = d.route[d.route.length - 1];
      if (this.person(i, d.id, u.phase, cond, x, z, !!shelter && shelter.x < x, frame)) {
        drawn.add(i);
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(x, z, 110, 20);
      } else {
        g.fillStyle(0x6b5b8a, 0.95);
        g.fillRect(x - 34, z - 230, 68, 230);
        g.lineStyle(3, 0x000000, 0.8);
        g.strokeRect(x - 34, z - 230, 68, 230);
        if (u.phase === UnitPhase.Captive) {
          g.lineStyle(5, 0xd8c7a0, 1);
          g.lineBetween(x - 34, z - 170, x + 34, z - 90);
          g.lineBetween(x + 34, z - 170, x - 34, z - 90);
        }
      }
      const color = CONDITION_COLOR[Math.min(cond, 2)]!;
      label(x, z - 320, say(`m25.unit.${d.id}`), '#ffffff', 20);
      label(x, z - 296, say(`m25.unit.phase.${u.phase}`), '#dddddd', 18);
      label(x, z - 270, `${CONDITION_ICON[Math.min(cond, 2)]} ${condName}`, color, 20);
      label(
        x,
        z - 246,
        say('m25.count', { n: String(u.count) }) + (u.locked ? ` · ${say('m25.locked')}` : ''),
        u.locked ? '#9be8b0' : '#ffffff',
        16,
      );
    });

    this.dropPeople(drawn);

    defs.cases.forEach((d, i) => {
      const c = state.cases[i]!;
      const disturbed = c.state === CaseState.Disturbed;
      g.fillStyle(disturbed ? 0x8a5a3a : 0x5a6a7a, 0.95);
      g.fillRect(d.x - 40, d.z - 50, 80, 50);
      g.lineStyle(3, c.state === CaseState.Sealed ? 0x9be8b0 : 0x000000, 0.9);
      g.strokeRect(d.x - 40, d.z - 50, 80, 50);
      if (disturbed) {
        // Scattered papers beside the case.
        g.fillStyle(0xf0e8d0, 0.9);
        for (const [ox, oz] of [
          [-70, 6],
          [60, 14],
          [-20, 22],
        ] as const)
          g.fillRect(d.x + ox, d.z + oz, 22, 10);
      }
      label(d.x, d.z - 104, say(`m25.case.${d.id}`), '#ffffff', 18);
      label(d.x, d.z - 82, say(`m25.case.state.${c.state}`), disturbed ? '#ffb3a3' : '#dddddd', 16);
      if (c.state !== CaseState.Present && !disturbed)
        label(d.x, d.z - 60, say(`objective.case.${caseOutcome(c)}`), '#cfe0ff', 16);
    });

    defs.channels.forEach((d, i) => {
      const c = state.channels[i]!;
      const working = c.phase === ChannelPhase.Working;
      g.lineStyle(3, working ? 0xff6b4a : 0xffb020, working ? 0.95 : 0.5);
      g.strokeEllipse(d.x, d.z, 70, 26);
      if (c.phase === ChannelPhase.Done || c.phase === ChannelPhase.Closed) {
        label(
          d.x,
          d.z + 26,
          say(c.phase === ChannelPhase.Done ? 'm25.channel.done' : 'm25.channel.closed'),
          '#999999',
          14,
        );
        return;
      }
      if (!working) {
        label(d.x, d.z + 26, say('m25.channel.wait'), '#ffd27a', 14);
        return;
      }
      // The tell: what the enemy is doing and how far along it is.
      const share = Math.min(1, c.progress / d.tell);
      const pulse = c.paused ? 0.9 : 0.6 + 0.4 * Math.abs(Math.sin(frame / 6));
      g.fillStyle(0x000000, 0.75);
      g.fillRect(d.x - 90, d.z + 22, 180, 14);
      g.fillStyle(c.paused ? 0x8fb8ff : 0xff6b4a, pulse);
      g.fillRect(d.x - 90, d.z + 22, 180 * share, 14);
      label(
        d.x,
        d.z + 52,
        say(c.paused ? 'm25.channel.paused' : `m25.channel.${d.kind}`),
        c.paused ? '#cfe0ff' : '#ffb3a3',
        18,
      );
    });

    for (const h of o.hints) {
      if (h.hint === HoldKind.None) continue;
      label(px(h.x), px(h.z) - 300, say(`m25.hold.${h.hint}`), '#ffe7a3', 18);
    }
    this.words.end();
    this.drawPanel(o, frame, say);
  }

  private drawPanel(
    o: ObjectivesSnapshot,
    frame: number,
    say: (key: string, vars?: Record<string, string>) => string,
  ): void {
    const p = this.panel;
    const hud = this.hud;
    p.clear();
    hud.begin();
    const lines: [string, string][] = [];
    const gr = o.grade;
    if (gr) {
      lines.push([say('m25.grade.title'), '#ffffff']);
      for (const l of gr.lines)
        lines.push([
          say('m25.grade.line', {
            name: say(`m25.grade.${l.id}`),
            points: String(l.points),
            weight: String(l.weight),
          }) + `  (${l.value})`,
          '#dddddd',
        ]);
      if (gr.overall === '-') lines.push([say('m25.grade.none'), '#ffb3a3']);
      else lines.push([say('m25.grade.total', { n: String(gr.points), r: gr.overall }), '#ffe7a3']);
      if (gr.capped) {
        const [ladder, state] = gr.capped.split('.');
        const reason = state
          ? say(`objective.ladder.${ladder}.${state}`)
          : say(`m25.grade.${gr.capped}`);
        lines.push([say('m25.grade.capped', { r: reason }), '#ffb3a3']);
      }
    }
    const ev = o.state.log;
    if (EVENT_TEXT.includes(ev.kind) && frame - ev.frame < 180)
      lines.push([say(`m25.event.${ev.kind}`), '#9be8b0']);
    // M28: nothing to say draws no panel (an empty one showed as a dark strip beside the
    // player HUD), and in a stage run the panel sits below the HUD and its notices.
    if (lines.length > 0) {
      const x = 24;
      const y = o.inRun ? 330 : 120;
      p.fillStyle(0x000000, 0.6);
      p.fillRect(x - 10, y - 18, 470, lines.length * 28 + 16);
      lines.forEach(([text, color], i) => hud.put(x, y + i * 28, text, 20, color, 0));
    }
    hud.end();
  }
}
