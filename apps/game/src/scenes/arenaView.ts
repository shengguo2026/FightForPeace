import * as Phaser from 'phaser';
import {
  ARENAS,
  AiMode,
  DIFFICULTIES,
  ENEMIES,
  type Encounter,
  type Fighter,
  MoveState,
  PROFILES,
  Threat,
  fxToPixels,
  nonCombatant,
  RunEvent,
  RunPhase,
  STAGES,
  type StageRun,
} from '@ffp/sim';
import type { AssetRegistry, BossView, QualityLevel } from '@ffp/platform';
import { ARENA_TEXT, STAGE_TEXT } from '../text/en';

const VIEW_W = 1920;
const VIEW_H = 1080;
const FLOOR_TOP = 620;
/** Parallax factors of the Stage 1 layers (far sky, landmark band, floor, foreground). */
const PARALLAX = { far: 0.25, mid: 0.55, floor: 1, fg: 1.2 } as const;
/** Bottom of a middle layer's landmark sits this far below the floor's top edge. */
const MID_BASE = FLOOR_TOP + 40;
/** The plate's walkable floor begins at about this share of its height. */
const PLATE_FLOOR = 0.62;

interface Layer {
  obj: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Image;
  factor: number;
  /** Which Stage 1 layer this is (Auto Quality drops or freezes decorative ones). */
  name: 'far' | 'mid' | 'floor' | 'fg' | 'plate';
}

/** The exit is open (the beat's locks are done and another beat follows). */
function exitOpenRun(run: StageRun): boolean {
  const beat = STAGES[run.stage]!.beats[run.beat]!;
  return beat.next.length > 0 && run.locksDone >= beat.locks.length;
}
/**
 * M7 arena presentation: the Stage 1 area backdrop drawn through the asset manifest (four
 * parallax layers, or the full plate for the boss), the camera following the
 * simulation's visibility zone, and the arena HUD (waves, boss bar, off-screen warnings,
 * group-attack telegraphs, device progress and the result). Reads snapshots only.
 */
export class ArenaView {
  private key = '';
  private layers: Layer[] = [];
  private hud!: Phaser.GameObjects.Graphics;
  private world!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private objective!: Phaser.GameObjects.Text;
  private go!: Phaser.GameObjects.Text;
  /** Full-screen black for the fade between two beats. */
  private fade!: Phaser.GameObjects.Graphics;
  private warnTexts: Phaser.GameObjects.Text[] = [];
  private tags = new Map<number, Phaser.GameObjects.Text>();
  private beeped = new Set<number>();
  private audio: AudioContext | null = null;
  private camX = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly assets: AssetRegistry,
  ) {}

  preload(): void {
    for (const l of this.assets.layers()) this.scene.load.image(l.id, l.url);
  }

  create(): void {
    this.world = this.scene.add.graphics().setDepth(7);
    this.hud = this.scene.add.graphics().setScrollFactor(0).setDepth(20);
    const style = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    };
    this.title = this.scene.add.text(VIEW_W / 2, 14, '', style).setOrigin(0.5, 0);
    this.title.setScrollFactor(0).setDepth(21);
    this.bossName = this.scene.add.text(VIEW_W / 2, 64, '', { ...style, fontSize: '26px' });
    this.bossName.setOrigin(0.5, 0).setScrollFactor(0).setDepth(21);
    this.banner = this.scene.add
      .text(VIEW_W / 2, 420, '', {
        ...style,
        fontSize: '72px',
        fontStyle: 'bold',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22);
    this.objective = this.scene.add.text(VIEW_W / 2, 54, '', { ...style, fontSize: '22px' });
    this.objective.setOrigin(0.5, 0).setScrollFactor(0).setDepth(21);
    this.go = this.scene.add.text(VIEW_W - 40, 470, '', {
      ...style,
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffd166',
      strokeThickness: 8,
    });
    this.go.setOrigin(1, 0.5).setScrollFactor(0).setDepth(21);
    this.fade = this.scene.add.graphics().setScrollFactor(0).setDepth(30);
    for (let i = 0; i < 2; i += 1) {
      const t = this.scene.add.text(0, 0, '', { ...style, fontSize: '30px', color: '#ffb020' });
      t.setScrollFactor(0).setDepth(21);
      this.warnTexts.push(t);
    }
  }

  /** Boss state for the sprite picker (null outside a boss arena). */
  bossView(enc: Encounter | null): BossView | undefined {
    const b = enc?.boss;
    if (!b) return undefined;
    const prof = this.bossProfile(enc);
    return {
      id: b.id,
      phase: b.phase,
      stagger: b.stagger,
      shift: b.shift,
      shiftFrames: prof?.transition.shift ?? 90,
    };
  }

  private bossProfile(enc: Encounter | null) {
    const b = enc?.boss;
    if (!b) return undefined;
    return PROFILES.find((p) => p?.boss)?.boss;
  }

  /** Per render frame: backdrop for this arena, camera, HUD. */
  update(
    enc: Encounter | null,
    bodies: readonly Fighter[],
    frame: number,
    stageWidth: number,
    quality: QualityLevel = 'high',
    run: StageRun | null = null,
  ): void {
    const arena = enc ? ARENAS[enc.arena] : undefined;
    // Keyed by what is drawn, so the camera locks of one stage beat share one backdrop.
    const key = arena ? `${arena.area}/${arena.backdrop}/${arena.width}` : 'lab';
    if (key !== this.key) this.rebuild(arena, stageWidth);
    const cam = this.scene.cameras.main;
    if (enc) {
      const target = fxToPixels(enc.viewMin);
      // Ease toward the simulation's view so a wave change never snaps the screen.
      this.camX +=
        Math.abs(target - this.camX) < 2 ? target - this.camX : (target - this.camX) * 0.2;
      cam.setScroll(Math.round(this.camX), 0);
    } else {
      this.camX = 0;
      cam.setScroll(0, 0);
    }
    // M8 Auto Quality: medium drops the decorative foreground; low also holds the far and
    // middle backdrops still. The floor, bodies, telegraphs and HUD are never reduced.
    const still = quality === 'low';
    for (const l of this.layers) {
      if (l.name === 'fg') l.obj.setVisible(quality === 'high');
      const frozen = still && (l.name === 'far' || l.name === 'mid');
      if (l.obj instanceof Phaser.GameObjects.TileSprite) {
        // Tiled layers stay on screen and scroll their texture at the layer's rate.
        // (Scroll factor 0 on x: the tile sprite stays on screen; only its texture moves.)
        if (!frozen) l.obj.tilePositionX = (cam.scrollX * l.factor) / l.obj.tileScaleX;
      } else if (l.name === 'far' || l.name === 'mid') {
        l.obj.setScrollFactor(frozen ? 0 : l.factor, 1);
      }
    }
    this.drawHud(enc, bodies, frame);
    this.drawStage(run, frame);
  }

  /**
   * M9 stage HUD on the canvas: stage, beat and continues, the objective, banners for the
   * beat title, a cleared lock, defeat and the river, the GO arrow and the beat fade.
   */
  private drawStage(run: StageRun | null, frame: number): void {
    this.fade.clear();
    if (!run) {
      this.objective.setText('');
      this.go.setText('');
      return;
    }
    const def = STAGES[run.stage]!;
    const beat = def.beats[run.beat]!;
    const diff = DIFFICULTIES[run.difficulty]!;
    this.title.setText(
      `${STAGE_TEXT.stage} ${run.stage + 1} · ${STAGE_TEXT.beat} ${run.beat + 1}/${def.beats.length}: ${beat.name} · ${diff.name} · ${STAGE_TEXT.continues} ${run.continues}`,
    );
    const workers = run.workers.length
      ? ` · ${STAGE_TEXT.workers} ${run.workers.filter((w) => w.state !== 0).length}/${run.workers.length}`
      : '';
    this.objective.setText(run.phase === RunPhase.Complete ? '' : `${beat.objective}${workers}`);
    // The boss bar takes the line under the title while the Commander fights.
    this.objective.setVisible(this.bossName.text === '');
    const e = run.event;
    const age = frame - e.frame;
    let banner = '';
    let color = '#ffffff';
    if (run.phase === RunPhase.Defeat) {
      banner = `${STAGE_TEXT.defeated}
${
  run.continues > 0
    ? STAGE_TEXT.continueLeft.replace('{n}', String(run.continues))
    : STAGE_TEXT.noContinues
}`;
      color = '#ff6b6b';
    } else if (run.phase === RunPhase.Complete) {
      banner = STAGE_TEXT.complete;
      color = '#7ddc7d';
    } else if (e.kind === RunEvent.RiverRestored && age < 180) {
      banner = STAGE_TEXT.riverRestored;
      color = '#8fe3ff';
    } else if (e.kind === RunEvent.BeatStart && age < 120 && run.phase !== RunPhase.Transition) {
      banner = `${STAGE_TEXT.beat} ${run.beat + 1} · ${beat.name}`;
    } else if (e.kind === RunEvent.LockClear && age < 60) {
      banner = STAGE_TEXT.lockClear;
      color = '#7ddc7d';
    }
    this.banner.setText(banner);
    this.banner.setColor(color);
    this.banner.setAlign('center');
    // GO: the way on to the right is free (the next lock or the exit).
    const ahead =
      run.phase === RunPhase.Walk &&
      run.workers.every((w) => w.state !== 0) &&
      (run.locksDone < beat.locks.length || exitOpenRun(run));
    const blink = Math.floor(frame / 20) % 2 === 0;
    this.go.setText(ahead && blink && banner === '' ? `${STAGE_TEXT.go} →` : '');
    // The river runs again (placeholder until the ending clips arrive in M13): water
    // flows back into the dry bed on the plate's left side once the Commander yields.
    if (beat.evidence && run.evidence >= 1) {
      const since = e.kind === RunEvent.RiverRestored ? frame - e.frame : 600;
      const fill = Math.min(1, since / 180);
      const w = this.world;
      const top = 350;
      const bottom = 612;
      const right = 120 + 560 * fill;
      w.fillStyle(0x4aa8e8, 0.42 * fill);
      w.fillTriangle(0, top, right, bottom, 0, bottom);
      w.fillStyle(0xbfe8ff, 0.5 * fill);
      for (let i = 0; i < 7; i += 1) {
        const t = ((frame * 2 + i * 90) % 600) / 600;
        const x = t * right * 0.9;
        const y = top + (bottom - top) * (0.35 + 0.6 * t) - (i % 3) * 18;
        if (x < right - 40) w.fillRect(x, y, 46, 4);
      }
    }
    if (run.phase === RunPhase.Transition) {
      const t = frame - run.phaseFrame;
      const half = def.rules.transition / 2;
      const a = t < half ? t / half : Math.max(0, 1 - (t - half) / half);
      this.fade.fillStyle(0x000000, Math.min(1, a));
      this.fade.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private rebuild(arena: (typeof ARENAS)[number] | undefined, stageWidth: number): void {
    for (const l of this.layers) l.obj.destroy();
    this.layers = [];
    this.key = arena ? arena.id : 'lab';
    this.beeped.clear();
    const cam = this.scene.cameras.main;
    cam.setBounds(0, 0, Math.max(VIEW_W, stageWidth), VIEW_H);
    if (!arena) return;
    const id = (layer: string) => `bg.stage1.${arena.area}.${layer}`;
    const has = (layer: string) =>
      this.assets.layer(id(layer)) !== undefined && this.scene.textures.exists(id(layer));
    if (arena.backdrop === 'plate' && has('plate')) {
      const meta = this.assets.layer(id('plate'))!.layer;
      const scale = Math.max(VIEW_W / meta.w, VIEW_H / meta.h);
      // The plate's floor line meets the walkable band's top edge.
      const y = FLOOR_TOP - meta.h * PLATE_FLOOR * scale;
      const img = this.scene.add.image(0, Math.min(0, y), id('plate')).setOrigin(0, 0);
      img.setScale(Math.max(scale, stageWidth / meta.w));
      img.setScrollFactor(1).setDepth(0.05);
      this.layers.push({ obj: img, factor: 1, name: 'plate' });
      return;
    }
    const range = Math.max(0, stageWidth - VIEW_W);
    /**
     * A layer: seamless (`_tiled`) art repeats across the arena at its parallax rate; a
     * single image is scaled to cover the view, and scrolls only as far as it reaches.
     */
    const layer = (
      name: 'far' | 'mid' | 'floor' | 'fg',
      y: number,
      h: number,
      scale: number,
      depth: number,
    ) => {
      const meta = this.assets.layer(id(name))?.layer;
      if (!meta || !has(name)) return;
      if (meta.tiled) {
        const t = this.scene.add.tileSprite(0, y, VIEW_W, h, id(name));
        t.setOrigin(0, 0).setScrollFactor(0, 1).setDepth(depth);
        t.setTileScale(scale, scale);
        this.layers.push({ obj: t, factor: PARALLAX[name], name });
        return;
      }
      const s = Math.max(scale, VIEW_W / meta.w);
      const spare = meta.w * s - VIEW_W;
      const factor = range > 0 ? Math.min(PARALLAX[name], spare / range) : 0;
      const img = this.scene.add.image(0, y, id(name)).setOrigin(0, 0).setScale(s);
      img.setScrollFactor(factor, 1).setDepth(depth);
      if (name === 'floor') img.setCrop(0, 0, meta.w, h / s);
      this.layers.push({ obj: img, factor, name });
    };
    const far = this.assets.layer(id('far'))?.layer;
    if (far) layer('far', 0, VIEW_H, VIEW_H / far.h, 0.01);
    const mid = this.assets.layer(id('mid'))?.layer;
    if (mid) {
      const s = mid.tiled ? 1.15 : Math.max(1.15, VIEW_W / mid.w);
      layer('mid', MID_BASE - mid.bottom * s, VIEW_H, s, 0.02);
    }
    if (this.assets.layer(id('floor'))) layer('floor', FLOOR_TOP, VIEW_H - FLOOR_TOP, 0.55, 0.03);
    const fg = this.assets.layer(id('fg'))?.layer;
    if (fg) layer('fg', VIEW_H - fg.h, fg.h, 1, 15);
  }

  private drawHud(enc: Encounter | null, bodies: readonly Fighter[], frame: number): void {
    const g = this.hud;
    const w = this.world;
    g.clear();
    w.clear();
    if (!enc) {
      this.title.setText('');
      this.bossName.setText('');
      this.banner.setText('');
      for (const t of this.warnTexts) t.setVisible(false);
      for (const t of this.tags.values()) t.setVisible(false);
      return;
    }
    const arena = ARENAS[enc.arena]!;
    const diff = DIFFICULTIES[enc.difficulty]!;
    const waves = arena.waves.length;
    const left = bodies.filter((b) => b.team === 'enemy' && !b.ko && !nonCombatant(b)).length;
    this.title.setText(
      `${arena.name} · ${diff.name} · ${ARENA_TEXT.wave} ${Math.max(1, enc.wave + 1)}/${waves} · ${left} ${ARENA_TEXT.left}`,
    );
    // A stage lock's boss bar goes once the lock is cleared (the Commander has surrendered).
    if (arena.stage && enc.result !== 0) this.bossName.setText('');
    else this.drawBoss(enc, bodies);
    this.drawDevices(enc);
    this.drawWarnings(enc, bodies, frame);
    this.drawTags(enc, bodies);
    const result =
      enc.result === 1 ? ARENA_TEXT.cleared : enc.result === 2 ? ARENA_TEXT.defeated : '';
    // Stage beats (M9) draw their own banners in drawStage.
    if (arena.stage) {
      this.banner.setText('');
      return;
    }
    this.banner.setText(result ? `${result}\n${ARENA_TEXT.restart}` : '');
    this.banner.setColor(enc.result === 1 ? '#7ddc7d' : '#ff6b6b');
    this.banner.setAlign('center');
  }

  /** Boss bar: Health with phase ticks, Resolve below it, carryover and STAGGER. */
  private drawBoss(enc: Encounter, bodies: readonly Fighter[]): void {
    const b = enc.boss;
    const f = b ? bodies.find((x) => x.id === b.id) : undefined;
    const prof = this.bossProfile(enc);
    if (!b || !f || !prof) {
      this.bossName.setText('');
      return;
    }
    const g = this.hud;
    const x = 360;
    const y = 104;
    const width = 1200;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(x - 4, y - 4, width + 8, 46);
    g.fillStyle(0x3a1d1d, 1);
    g.fillRect(x, y, width, 22);
    g.fillStyle(0xd94b4b, 1);
    g.fillRect(x, y, (width * f.health) / f.maxHealth, 22);
    // Stored carryover (damage past the phase floor, applied when the next phase starts).
    if (b.carry > 0) {
      g.fillStyle(0xffb3b3, 0.8);
      const at = (width * f.health) / f.maxHealth;
      g.fillRect(x + at - (width * b.carry) / f.maxHealth, y, (width * b.carry) / f.maxHealth, 22);
    }
    g.fillStyle(0xffffff, 1);
    for (const ph of prof.phases)
      if (ph.from < 100) g.fillRect(x + (width * ph.from) / 100 - 2, y - 6, 4, 34);
    const resolveW = b.resolveMax > 0 ? (width * b.resolve) / b.resolveMax : 0;
    g.fillStyle(0x223344, 1);
    g.fillRect(x, y + 28, width, 10);
    g.fillStyle(b.stagger > 0 ? 0xffd166 : 0x7df9ff, 1);
    g.fillRect(
      x,
      y + 28,
      b.stagger > 0 ? (width * b.stagger) / prof.stagger.duration : resolveW,
      10,
    );
    const phase = prof.phases[b.phase]!;
    const state =
      b.stagger > 0
        ? ` · ${ARENA_TEXT.stagger}`
        : b.shift > 0
          ? ` · ${ARENA_TEXT.phaseShift}`
          : b.pending
            ? ` · ${ARENA_TEXT.phaseQueued}`
            : '';
    const kit = ENEMIES[f.hero]!;
    this.bossName.setText(
      `${kit.name} · ${ARENA_TEXT.phase} ${b.phase + 1}: ${phase.name} · ${ARENA_TEXT.resolve} ${b.resolve}/${b.resolveMax}${state}`,
    );
    this.bossName.setColor(b.stagger > 0 ? '#ffd166' : '#ffffff');
  }

  /** Device progress pips at the device (the winch), counted cranks, never time. */
  private drawDevices(enc: Encounter): void {
    const w = this.world;
    for (const d of enc.devices) {
      if (!d.active) continue;
      const x = fxToPixels(d.x);
      const z = fxToPixels(d.z);
      // The winch spot on the floor (the plate draws the winch itself) and its cranks.
      w.lineStyle(6, 0xffb020, 0.9);
      w.strokeEllipse(x, z, 220, 50);
      for (let i = 0; i < d.count; i += 1) {
        w.fillStyle(i < d.progress ? 0xffb020 : 0x333333, 1);
        w.lineStyle(3, 0x000000, 1);
        w.fillCircle(x - (d.count - 1) * 22 + i * 44, z - 330, 15);
        w.strokeCircle(x - (d.count - 1) * 22 + i * 44, z - 330, 15);
      }
    }
  }

  /**
   * Off-screen warnings: an arrow and a word at the screen edge, and a short beep, while
   * an off-screen-capable attack shows its warning (visual and audio, never colour alone).
   */
  private drawWarnings(enc: Encounter, bodies: readonly Fighter[], frame: number): void {
    const g = this.hud;
    let n = 0;
    const viewMin = fxToPixels(enc.viewMin);
    const viewMax = fxToPixels(enc.viewMax);
    for (const e of bodies) {
      if (e.team !== 'enemy' || e.warnUntil <= frame) {
        this.beeped.delete(e.id);
        continue;
      }
      const x = fxToPixels(e.x);
      const side = x < viewMin + 80 ? -1 : x > viewMax - 80 ? 1 : 0;
      const ex = side === -1 ? 30 : side === 1 ? VIEW_W - 30 : x - viewMin;
      const ey = fxToPixels(e.z) - 150;
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(frame / 5));
      g.fillStyle(0xffb020, pulse);
      const dir = side === 0 ? 1 : side;
      g.fillTriangle(ex + dir * 26, ey, ex - dir * 18, ey - 30, ex - dir * 18, ey + 30);
      const t = this.warnTexts[n];
      if (t) {
        t.setText(`⚠ ${ARENA_TEXT.incoming}`);
        t.setOrigin(side === 1 ? 1 : 0, 0.5);
        t.setPosition(side === 1 ? ex - 40 : ex + 40, ey);
        t.setVisible(true);
      }
      n += 1;
      if (!this.beeped.has(e.id)) {
        this.beeped.add(e.id);
        this.beep(side);
      }
    }
    for (let i = n; i < this.warnTexts.length; i += 1) this.warnTexts[i]!.setVisible(false);
  }

  /** Above each enemy: a Health bar, and the group telegraph or the defense it plans. */
  private drawTags(enc: Encounter, bodies: readonly Fighter[]): void {
    const w = this.world;
    const keep = new Set<number>();
    for (const e of bodies) {
      if (e.team !== 'enemy' || !PROFILES[e.hero]) continue;
      if (enc.boss?.id === e.id) continue;
      keep.add(e.id);
      const x = fxToPixels(e.x);
      const top = fxToPixels(e.z) - 375;
      if (!e.ko && !nonCombatant(e)) {
        w.fillStyle(0x222222, 0.85);
        w.fillRect(x - 50, top, 100, 8);
        w.fillStyle(0xd94b4b, 1);
        w.fillRect(x - 50, top, (100 * e.health) / e.maxHealth, 8);
      }
      let t = this.tags.get(e.id);
      if (!t) {
        t = this.scene.add.text(0, 0, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 5,
        });
        t.setOrigin(0.5, 1).setDepth(13);
        this.tags.set(e.id, t);
      }
      const group = e.aiMode === AiMode.Group || (e.threatFlags & Threat.Group) !== 0;
      const text = group
        ? ARENA_TEXT.teamAttack
        : e.state === MoveState.Flee
          ? ARENA_TEXT.flee
          : e.state === MoveState.Surrender
            ? ARENA_TEXT.surrender
            : '';
      t.setText(text);
      t.setColor(group ? '#ff9a3c' : '#dddddd');
      t.setPosition(x, top - 6);
      t.setVisible(text !== '');
    }
    for (const [id, t] of this.tags) {
      if (keep.has(id)) continue;
      t.destroy();
      this.tags.delete(id);
    }
  }

  /** A short two-tone beep panned toward the warning's side. */
  private beep(side: number): void {
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner();
      pan.pan.value = side * 0.8;
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain).connect(pan).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } catch {
      // No audio device: the arrow and the word still warn.
    }
  }
}
