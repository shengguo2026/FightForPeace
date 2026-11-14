import * as Phaser from 'phaser';
import {
  CoopEvent,
  type CoopState,
  TEAM_FINISHERS,
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
  ENEMIES,
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
  type StageRun,
  STAGES,
  WorkerState,
  RunPhase,
  ChannelKind,
  groundFocus,
  hurtbox,
  kitOf,
  phaseOf,
  RiderState,
  MOUNTED,
  mountedKit,
  riderActionLength,
  runningAction,
  CORRIDORS,
  ROOMS,
  type Encounter,
  type Greenhouse,
} from '@ffp/sim';
import {
  AssetRegistry,
  type PlaceholderFamily,
  RENDER_SCALE,
  STAGE2_ROOM_AREA,
  enemyMountCell,
  heroMountCell,
  type MountPick,
  type QualityLevel,
  SpritePicker,
  workerFlip,
} from '@ffp/platform';
import type { RenderSnapshot } from '../game';
import { ArenaView } from './arenaView';
import { PursuitView } from './pursuitView';
import { GreenhouseView } from './greenhouseView';
import { EffectsLayer } from './effects';
import { PresentationTracker } from '@ffp/platform';
import { playEventSounds } from '../media/sounds';
import { callout, dt, heroName, locale, t as tr, type TextId } from '../text/i18n';
import { presentation } from '../shell/presentation';

/**
 * Loose and flying weapon props, drawn at the size the heroes' weapon sheets show them in
 * hand (the handwheel about 100 px across, the workstaff about a hero's height).
 */
/** Frames between two hit flashes on the same fighter. */
const FLASH_GAP = 12;

/**
 * M22 Stage 2 villagers per beat: the cells while bound (in a fight, otherwise), just freed
 * and after, and leaving. NPC-S2-WORKER: 0 wrench, 1 trapped, 2 waving, 3 helped up,
 * 4 walking to safety, 5 bow. NPC-S2-RESEARCHER: 0 working, 1 hiding, 2 relieved,
 * 3 following, 4 handing over the ledger, 5 walking to safety.
 */
const S2_WORKERS: Partial<
  Record<
    string,
    {
      sheet: string;
      bound: [number, number];
      freed: [number, number];
      leaving: number;
      /** M22: the walk-to-safety cycle, drawn while leaving. */
      walk: string;
    }
  >
> = {
  'aeration-annex': {
    sheet: 'npc.s2-worker.sheet',
    bound: [1, 2],
    freed: [3, 5],
    leaving: 4,
    walk: 'npc.s2-worker.walk',
  },
  'prep-room': {
    sheet: 'npc.s2-researcher.sheet',
    bound: [1, 1],
    freed: [2, 4],
    leaving: 5,
    walk: 'npc.s2-researcher.walk',
  },
};

const PROP_SCALE: Partial<Record<string, number>> = {
  handwheel: 0.3,
  workstaff: 0.9,
  // M22: the Stage 2 weapon props at their in-hand size.
  'service-lance': 0.9,
  'six-round-sidearm': 0.3,
  'support-gun': 0.55,
  'breaching-grenade': 0.22,
  'support-rail': 0.9,
};

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
  team: 0x7dffb0,
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
  /** M8 Auto Quality: the presentation level to draw with (decorative layers only). */
  quality?: () => QualityLevel;
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
  /** Placeholder weapons in the hands of heroes without weapon sheets (by fighter id). */
  private heldSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private heldKeep = new Set<number>();
  /** World frame of each fighter's latest hit flash (by fighter id). */
  private flashAt = new Map<number, number>();
  /** M9 stage objects: workers, their pen, food, the cache, the clue and the evidence. */
  private runSprites = new Map<number, Phaser.GameObjects.Sprite>();
  /** M19 story NPCs of a greenhouse room (Tomas Rell in Marek's yard). */
  private npcSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private weaponTags = new Map<number, Phaser.GameObjects.Text>();
  private lastWeapon = new Map<number, string>();
  private lastEnv = '';
  private lastCoop = '';
  private teamWord: Phaser.GameObjects.Text | undefined;
  private boss: ReturnType<ArenaView['bossView']>;
  private worldKey = '';
  private inArena = false;
  private readonly arena = new ArenaView(this, this.assets);
  private readonly pursuit = new PursuitView(this);
  private readonly greenhouse = new GreenhouseView(this);
  /** M13: presentation events (stable ids) for sound and the effect layers. */
  private readonly tracker = new PresentationTracker();
  private readonly effects = new EffectsLayer(this, this.assets);
  private lastTime = 0;
  private labFloor!: Phaser.GameObjects.Graphics;
  /** M18: the greenhouse shutter's impact surface (drawn by GreenhouseView). */
  private shutterId = 0;

  constructor(private readonly opts: StageOptions) {
    super('stage');
  }

  /** Approved sprite sheets from the asset manifest (M6: the first real art). */
  preload(): void {
    for (const s of this.assets.sheets())
      this.load.spritesheet(s.id, s.url, {
        frameWidth: s.sheet.w ?? s.sheet.cell,
        frameHeight: s.sheet.cell,
      });
    this.arena.preload();
  }

  create(): void {
    const bg = this.add.graphics();
    this.labFloor = bg;
    bg.fillStyle(0x1b1d22, 1);
    bg.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    bg.fillStyle(0x4a4d55, 1);
    bg.fillRect(0, FLOOR_TOP, VIEW_WIDTH, FLOOR_BOTTOM - FLOOR_TOP);
    bg.lineStyle(2, 0x6b6f78, 1);
    for (let x = 0; x <= VIEW_WIDTH; x += 120) bg.lineBetween(x, FLOOR_TOP, x, FLOOR_BOTTOM);
    this.gfx = this.add.graphics();
    this.overlay = this.add.graphics();
    this.overlay.setDepth(8);
    this.arena.create();
    this.pursuit.create();
    this.greenhouse.create();
    this.effects.create();
    this.opts.onReady?.();
  }

  /** M14 Auto Quality: the internal resolution in use (1 = 1920 × 1080). */
  private renderScale = 1;

  /** Draws at a lower internal resolution on the lowest quality level (spec §18.3). */
  private applyRenderScale(level: QualityLevel): void {
    const scale = RENDER_SCALE[level];
    if (scale === this.renderScale) return;
    this.renderScale = scale;
    this.scale.resize(Math.round(VIEW_WIDTH * scale), Math.round(VIEW_HEIGHT * scale));
    // Zoom from the top-left corner, so screen-fixed HUD text keeps its place.
    this.cameras.main.setOrigin(scale === 1 ? 0.5 : 0, scale === 1 ? 0.5 : 0).setZoom(scale);
  }

  override update(time: number): void {
    this.applyRenderScale(this.opts.quality?.() ?? 'high');
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
    const worldKey = `${snap.generation}`;
    if (worldKey !== this.worldKey) {
      this.worldKey = worldKey;
      this.forgetWorld();
    }
    this.arena.update(
      snap.encounter,
      current,
      snap.frame,
      snap.stageWidth,
      this.opts.quality?.() ?? 'high',
      snap.run,
      stage2AreaOf(snap.greenhouse?.room, snap.pursuit?.corridor),
    );
    const art = this.arena.hasStage2Backdrop();
    this.labFloor.setVisible(
      snap.encounter === null && snap.pursuit === null && snap.greenhouse === null,
    );
    this.shutterId = snap.greenhouse?.shutterId ?? 0;
    this.arena.setBackdropVisible(snap.greenhouse === null || art);
    // M18: a greenhouse room draws its own greybox room over the hidden arena's backdrop
    // (M22: over the Stage 2 area's art, it draws only its interactive pieces).
    if (snap.greenhouse) {
      this.greenhouse.draw(
        snap.greenhouse,
        current,
        snap.items,
        snap.frame,
        snap.greenhouseHints,
        art,
      );
    } else this.greenhouse.hide();
    if (snap.pursuit) {
      this.drawPursuit(snap, time);
      return;
    }
    this.pursuit.hide();
    this.boss = this.arena.bossView(snap.encounter, current, snap.frame);
    this.inArena = snap.encounter !== null;
    this.drawScenery(snap.environment, snap.frame, collision);
    this.drawItems(snap.items, snap.frame);
    this.drawRun(snap.run, current, snap.frame);
    this.drawNpcs(snap.greenhouse, snap.encounter, snap.frame);
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
      this.drawHeldProp(f, p, snap.frame);
      this.label(f, p, top);
      this.weapon(f, p, top, time, snap.items);
      this.feedback(f, p, top, time);
      this.defense(f, p, top, time);
      this.grabCue(f, p, top, time, snap.escapeOpen.has(f.id));
    }
    // M18: a warned line ahead of a firearm shot while it winds up (spec §9.2).
    for (const { f, p } of drawn) {
      const a = runningAction(f);
      if (!a || !a.tags.includes('warnedLine') || f.stateFrame >= a.startup) continue;
      const blink = Math.floor(snap.frame / 6) % 2 === 0;
      this.overlay.lineStyle(4, 0xff4040, blink ? 0.95 : 0.45);
      this.overlay.lineBetween(p.x, p.z - 120, p.x + f.facing * 860, p.z - 120);
    }
    this.drawTethers(drawn);
    this.coopCues(snap.coop, drawn, snap.frame, time);
    for (const pr of snap.projectiles) this.drawProjectile(pr);
    // Boxes go on top of every body, so a hitbox inside a target stays visible.
    if (collision) for (const { f, p } of drawn) this.drawBoxes(f, p);
    const live = new Set(current.map((b) => b.id));
    this.dropStale(this.sprites, live);
    // Names, move names and cues of fighters who left (fled, cleared) go with them.
    for (const map of [
      this.labels,
      this.moveLabels,
      this.comboLabels,
      this.cues,
      this.weaponTags,
      this.ready,
    ])
      for (const [id, t] of map)
        if (!live.has(id)) {
          t.destroy();
          map.delete(id);
        }
    this.dropStale(this.heldSprites, this.heldKeep);
    this.heldKeep = new Set();
    this.environmentCallout(snap.environment, time);
    const events = this.tracker.update({
      frame: snap.frame,
      fighters: current,
      run: snap.run,
      coop: snap.coop,
      bossPhase: snap.encounter?.boss?.phase ?? -1,
      bossId: snap.encounter?.boss?.id ?? 0,
      generation: snap.generation,
    });
    this.effects.play(events, time, this.opts.quality?.() ?? 'high');
    playEventSounds(events);
    for (const e of events)
      if (e.kind === 'firearm')
        this.arena.soundCaption(tr(`m22.cap.${e.what === 'aim' ? 'aim' : e.what}`), this.time.now);
    this.effects.update(time, Math.min(50, time - this.lastTime));
    this.lastTime = time;
    this.updatePopups(time);
  }

  /**
   * M17 mounted pursuit: the corridor, bikes and HUD from PursuitView, the camera on the
   * pursuit's shared view, and each hero's figure seated on its bike.
   */
  private drawPursuit(snap: RenderSnapshot, time: number): void {
    const p = snap.pursuit!;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, Math.max(VIEW_WIDTH, snap.stageWidth), VIEW_HEIGHT);
    cam.setScroll(this.pursuit.camX(p), 0);
    this.pursuit.draw(
      p,
      snap.current,
      snap.frame,
      snap.cheatAssisted,
      snap.infiniteMeter,
      !!snap.run,
      this.arena.hasStage2Backdrop(),
    );
    const keep = new Set<number>();
    const mountKeep = new Set<number>();
    const art = new Set<string>();
    const scale = 0.62;
    for (const f of snap.current) {
      if (f.team !== 'hero') continue;
      const r = p.riders.find((x) => x.slot === f.slot);
      if (!r || r.state === RiderState.Out) continue;
      // M22: the hero on the Stage 2 mounted sheets when the hero has them.
      const kit = mountedKit(f.hero);
      const a = r.action >= 0 ? kit[r.action] : undefined;
      const pick = heroMountCell(HEROES[f.hero]?.id ?? '', {
        state: r.state,
        critical: r.critical,
        slot: a?.slot ?? -1,
        actionAge: snap.frame - r.actionAt,
        actionLength: a ? riderActionLength(r, a) : 0,
        steer: fxToPixels(r.targetZ - r.z),
        braking: r.speed < MOUNTED.bike.base * 0.85,
        stateAge: snap.frame - r.since,
      });
      if (
        pick &&
        this.mountSprite(
          1000 + f.id,
          pick,
          fxToPixels(r.x),
          fxToPixels(r.z) - fxToPixels(r.y),
          scale,
        )
      ) {
        mountKeep.add(1000 + f.id);
        art.add(`h${r.slot}`);
        continue;
      }
      const down = r.state === RiderState.Crash || r.state === RiderState.Downed;
      const pos = {
        x: fxToPixels(r.x) - (r.state === RiderState.Done || down ? 110 : 0),
        z: fxToPixels(r.z) - (r.state === RiderState.Done || down ? 0 : 46),
        y: fxToPixels(r.y),
      };
      if (this.drawSprite(f, pos, snap.frame) !== null) {
        keep.add(f.id);
        const sp = this.sprites.get(f.id);
        sp?.setScale(0.62);
        sp?.setDepth(2);
      }
    }
    for (const e of p.enemies) {
      const pick = enemyMountCell(e);
      if (this.mountSprite(-1 - e.id, pick, fxToPixels(e.x), fxToPixels(e.z), scale)) {
        mountKeep.add(-1 - e.id);
        art.add(`e${e.id}`);
      }
    }
    this.dropStale(this.mountSprites, mountKeep);
    this.pursuit.mountArt = art;
    this.dropStale(this.sprites, keep);
    this.updatePopups(time);
  }

  /** M22: mounted sprites (riders on their bikes), keyed apart from the fighters'. */
  private mountSprites = new Map<number, Phaser.GameObjects.Sprite>();

  /** Draws one mounted cell at a rider's road position; false when the sheet is missing. */
  private mountSprite(key: number, pick: MountPick, x: number, z: number, scale: number): boolean {
    const meta = this.assets.sheet(pick.sheet)?.sheet;
    if (!meta || !this.textures.exists(pick.sheet)) return false;
    const sp = this.sprite(this.mountSprites, key, pick.sheet);
    sp.setVisible(true);
    sp.setTexture(pick.sheet, pick.cell);
    sp.setOrigin(0.5, meta.ground / meta.cell);
    sp.setScale(scale);
    sp.setFlipX(false);
    sp.setPosition(x, z);
    sp.setDepth(2);
    return true;
  }

  /**
   * M8 co-op cues: a handoff ring in the receiving partner's colour under an open target,
   * a TEAM? ring and word over the invitation's target, and callouts for the team
   * finisher, grab assists and rescues.
   */
  private coopCues(
    coop: CoopState,
    drawn: readonly { f: Fighter; p: Pos }[],
    frame: number,
    time: number,
  ): void {
    const g = this.overlay;
    const byId = new Map(drawn.map((d) => [d.f.id, d]));
    const partnerColor = (sender: number) => {
      const s = byId.get(sender)?.f;
      return HERO_COLORS[s ? 1 - s.slot : 0] ?? 0xffffff;
    };
    for (const { f, p } of drawn) {
      if (f.handoff === 0 || frame < f.handoffAt) continue;
      const left = Math.max(0, f.handoffUntil - frame);
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(frame / 5));
      g.lineStyle(5, partnerColor(f.handoffFrom), pulse);
      g.strokeEllipse(p.x, p.z - 6, 220 + left, 40 + left / 4);
    }
    const inv = coop.invite;
    const target = inv ? byId.get(inv.target) : undefined;
    if (inv && target) {
      g.lineStyle(6, partnerColor(inv.from), 0.95);
      g.strokeEllipse(target.p.x, target.p.z - 6, 320, 58);
      if (!this.teamWord) {
        this.teamWord = this.add.text(0, 0, 'TEAM?', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '34px',
          fontStyle: 'bold',
          color: '#7dffb0',
          stroke: '#000000',
          strokeThickness: 6,
        });
        this.teamWord.setOrigin(0.5, 1).setDepth(13);
      }
      const top = target.p.z - fxToPixels(BODY_HALF_D) - 300;
      this.teamWord.setPosition(target.p.x, top).setVisible(true);
      this.teamWord.setText(`${callout('TEAM?')} ${Math.max(0, inv.until - frame + 1)}`);
    } else this.teamWord?.setVisible(false);
    const l = coop.log;
    const key = `${l.kind}/${l.frame}`;
    if (key === this.lastCoop) return;
    this.lastCoop = key;
    if (l.frame === 0) return;
    const fin = TEAM_FINISHERS[0];
    const finisher = fin ? dt(`coop.finisher.${fin.id}`, fin.name).toUpperCase() : 'TEAM FINISHER';
    const words: Partial<Record<number, [string, string, number]>> = {
      [CoopEvent.Finisher]: [finisher, '#7dffb0', l.target],
      [CoopEvent.Assist]: ['ASSIST', '#7ddc7d', l.target],
      [CoopEvent.Release]: ['RESCUE', '#7ddc7d', l.partner || l.actor],
      [CoopEvent.Interrupt]: ['RESCUE', '#7ddc7d', l.partner || l.target],
      [CoopEvent.HandoffClaim]: ['HANDOFF', '#7dffb0', l.target],
    };
    const word = words[l.kind];
    const at = word ? byId.get(word[2]) : undefined;
    if (!word || !at) return;
    const t = this.add.text(at.p.x, at.p.z - 340, callout(word[0]), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: l.kind === CoopEvent.Finisher ? '52px' : '38px',
      fontStyle: 'bold',
      color: word[1],
      stroke: '#000000',
      strokeThickness: 6,
    });
    t.setOrigin(0.5, 1).setDepth(13);
    this.popups.push({ text: t, born: time + (CALLOUT_MS - POPUP_MS) });
  }

  /** A new world (arena start, restart, back to the Lab): drop every per-id object. */
  private forgetWorld(): void {
    this.effects.clear();
    for (const map of [
      this.sprites,
      this.itemSprites,
      this.heldSprites,
      this.propSprites,
      this.runSprites,
      this.npcSprites,
    ]) {
      for (const sp of map.values()) sp.destroy();
      map.clear();
    }
    for (const map of [
      this.labels,
      this.moveLabels,
      this.comboLabels,
      this.cues,
      this.weaponTags,
      this.ready,
    ]) {
      for (const t of map.values()) t.destroy();
      map.clear();
    }
    this.lastHits.clear();
    this.lastDefense.clear();
    this.lastGrab.clear();
    this.lastWeapon.clear();
    this.flashAt.clear();
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
   * A hero without weapon pose art (Wind and Fire with the Stage 1 workstaff or handwheel)
   * holds the prop sprite in front of the chest, so the pickup stays visible. Heroes with
   * the weapon sheets carry the weapon in their pose art and draw nothing here.
   */
  private drawHeldProp(f: Fighter, p: Pos, frame: number): void {
    const hold = this.picker.heldProp(f);
    const body = this.sprites.get(f.id);
    if (!hold || !body?.visible || !this.textures.exists(hold.sheet)) return;
    const meta = this.assets.sheet(hold.sheet)?.sheet;
    if (!meta) return;
    this.heldKeep.add(f.id);
    const sp = this.sprite(this.heldSprites, f.id, hold.sheet);
    sp.setTexture(hold.sheet, hold.cell);
    sp.setOrigin(0.5, 0.5);
    sp.setScale(hold.scale * body.scaleX);
    sp.setRotation(f.facing * hold.angle);
    sp.setFlipX((f.facing === -1) !== (hold.mirror ?? false));
    // Small bob while walking so the carried prop moves with the stride.
    const bob = f.state === MoveState.Walk ? Math.abs(((frame % 20) - 10) / 10) * 6 : 0;
    sp.setPosition(p.x + f.facing * hold.dx * body.scaleX, p.z - p.y - hold.dy * body.scaleX + bob);
    sp.setAlpha(body.alpha);
    sp.setDepth(body.depth + 0.0001);
  }

  /**
   * The fighter's sprite-sheet pose: cell chosen from simulation state, mirrored for
   * facing left, feet on the ground line. Returns the top of the drawn figure, or null
   * when this fighter has no art yet (the greybox body is drawn instead).
   */
  private drawSprite(f: Fighter, p: Pos, frame: number): number | null {
    const pick = this.picker.fighter(f, frame, this.boss);
    const meta = pick ? this.assets.sheet(pick.sheet)?.sheet : undefined;
    if (!pick || !meta || !this.textures.exists(pick.sheet)) {
      this.sprites.get(f.id)?.setVisible(false);
      return null;
    }
    const sp = this.sprite(this.sprites, f.id, pick.sheet);
    sp.setVisible(true);
    sp.setTexture(pick.sheet, pick.cell);
    sp.setFlipX(pick.drawnLeft ? f.facing === 1 : f.facing === -1);
    sp.setOrigin(0.5, meta.ground / meta.cell);
    // Sheets drawn at another figure size are corrected so the hero keeps one size.
    const scale = meta.scale ?? 1;
    sp.setScale(scale);
    sp.setPosition(p.x, p.z - p.y);
    sp.setDepth(this.depthAt(p.z));
    sp.setAlpha(f.protectedRecovery ? 0.55 : f.state === MoveState.Dash ? 0.85 : 1);
    // Hit flash: the first frames of hit-stun draw the figure solid white. A new flash
    // starts at most every FLASH_GAP frames, so a target hit again and again (two heroes
    // in co-op) blinks instead of staying a white silhouette.
    if (f.state === MoveState.Hitstun && f.stateFrame < 4) {
      const start = frame - f.stateFrame;
      const last = this.flashAt.get(f.id);
      if (last === undefined || start - last >= FLASH_GAP || start < last)
        this.flashAt.set(f.id, start);
    }
    const flashStart = this.flashAt.get(f.id);
    const flashing =
      f.state === MoveState.Hitstun &&
      flashStart !== undefined &&
      frame - flashStart < 4 &&
      frame >= flashStart;
    if (flashing) {
      // Reduced flashing (M10): a soft red tint instead of the solid white flash.
      sp.setTint(presentation.reducedFlashing ? 0xffb0b0 : 0xffffff);
      sp.setTintMode(
        presentation.reducedFlashing ? Phaser.TintModes.MULTIPLY : Phaser.TintModes.FILL,
      );
    } else {
      sp.setTintMode(Phaser.TintModes.MULTIPLY);
      // M11: a worn outfit (placeholder treatment) tints the hero's sprite.
      const outfit = f.team === 'hero' ? presentation.outfitTint[f.slot] : null;
      if (outfit !== null && outfit !== undefined) sp.setTint(outfit);
      else if (f.team === 'hero' && f.slot === 1) sp.setTint(0xffe2c4);
      else sp.clearTint();
    }
    const cell = meta.cells[pick.cell];
    const head = cell ? (meta.ground - cell.y0) * scale : BODY_H;
    if (f.state === MoveState.Down) return p.z - 90;
    return p.z - p.y - Math.max(head, 140);
  }

  /**
   * M9 stage objects, drawn with the delivered art where it exists (worker pose sheets,
   * PROP-FOOD, PROP-BARRICADE) and as labelled shapes otherwise: the coerced workers and
   * their rope pen, food, the recovery cache, the clue, the sponsor evidence, and a hold
   * ring over every hero who is holding Interact.
   */
  /**
   * M19 story NPCs: Tomas Rell, exposed and under guard by the cargo bay. He is not a
   * body (nothing can hit him or path through him); his pose follows the fight.
   */
  private drawNpcs(gh: Greenhouse | null, enc: Encounter | null, frame: number): void {
    const keep = new Set<number>();
    const npcs = gh ? (ROOMS[gh.room]?.npcs ?? []) : [];
    npcs.forEach((n, i) => {
      const x = fxToPixels(n.x);
      const z = fxToPixels(n.z);
      const b = enc?.boss;
      // Poses (exposed sheet): 0 watchful, 2 caught, 3 lowering the lantern, 5 looking back.
      const cell = !b ? 0 : b.capture > 0 ? 5 : b.scorch === 1 ? 3 : b.stagger > 0 ? 2 : 0;
      const sheet = 'npc.tomas-exposed.sheet';
      const meta = this.assets.sheet(sheet)?.sheet;
      const g = this.gfx;
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(x, z, 110, 20);
      if (!meta || !this.textures.exists(sheet)) {
        g.fillStyle(0xc9b8a0, 1);
        g.fillRect(x - 30, z - 250, 60, 250);
        return;
      }
      keep.add(990 + i);
      const sp = this.sprite(this.npcSprites, 990 + i, sheet);
      sp.setVisible(true);
      sp.setTexture(sheet, cell);
      sp.setOrigin(0.5, meta.ground / meta.cell);
      sp.setScale(0.95);
      sp.setPosition(x, z);
      sp.setDepth(this.depthAt(z));
      // He faces the yard (left of the cargo bay) unless he looks back after the capture.
      sp.setFlipX(cell !== 5);
      void frame;
    });
    this.dropStale(this.npcSprites, keep);
  }

  private drawRun(run: StageRun | null, bodies: readonly Fighter[], frame: number): void {
    const keep = new Set<number>();
    if (!run) {
      this.dropStale(this.runSprites, keep);
      return;
    }
    const beat = STAGES[run.stage]!.beats[run.beat]!;
    const g = this.gfx;
    const prop = (key: number, sheet: string, cell: number, x: number, z: number, h: number) => {
      const meta = this.assets.sheet(sheet)?.sheet;
      const c = meta?.cells[cell];
      keep.add(key);
      if (!meta || !c || !this.textures.exists(sheet)) {
        g.fillStyle(0x9a7b4f, 1);
        g.fillRect(x - 40, z - h, 80, h);
        return null;
      }
      const sp = this.sprite(this.runSprites, key, sheet);
      sp.setVisible(true);
      sp.setTexture(sheet, cell);
      sp.setOrigin(0.5, c.foot / meta.cell);
      sp.setScale(Math.max(0.1, h / Math.max(1, c.foot - c.y0)));
      sp.setPosition(x, z);
      sp.setDepth(this.depthAt(z));
      sp.setFlipX(false);
      return sp;
    };
    const anyBound = run.workers.some((w) => w.state === WorkerState.Bound);
    if (beat.pen && anyBound) prop(900, 'prop.barricade', 2, beat.pen.x, beat.pen.z, 150);
    run.workers.forEach((w, i) => {
      const x = fxToPixels(w.x);
      const z = fxToPixels(w.z);
      if (w.state === WorkerState.Safe) return;
      const age = frame - w.since;
      // Poses: 0 carrying, 1 burdened walk, 2 cowering, 3 freed, 4 cheering, 5 running home.
      const fighting = run.phase === RunPhase.Locked;
      const cell =
        w.state === WorkerState.Bound
          ? fighting
            ? 2
            : Math.floor(frame / 40) % 2 === 0
              ? 0
              : 1
          : w.state === WorkerState.Freed
            ? age < 20
              ? 3
              : 4
            : 5;
      // M22: Stage 2's villagers (the annex's maintenance worker, the prep room's
      // researcher) on their own sheets.
      const s2 = S2_WORKERS[beat.id];
      const s2cell = s2
        ? w.state === WorkerState.Bound
          ? fighting
            ? s2.bound[0]
            : s2.bound[1]
          : w.state === WorkerState.Freed
            ? age < 20
              ? s2.freed[0]
              : s2.freed[1]
            : s2.leaving
        : -1;
      // M22: leaving walks (Stage 2) or runs home (Stage 1) through the villager's own
      // cycle where it was delivered; those sheets face right like every other cell.
      const cycle = s2 ? s2.walk : w.look === 1 ? 'npc.worker-b.run' : 'npc.worker-a.run';
      const walking =
        w.state === WorkerState.Leaving &&
        this.textures.exists(cycle) &&
        this.assets.sheet(cycle) !== undefined;
      const sheet = walking
        ? cycle
        : s2
          ? s2.sheet
          : w.look === 1
            ? 'npc.worker-b.sheet'
            : 'npc.worker-a.sheet';
      const meta = this.assets.sheet(sheet)?.sheet;
      keep.add(910 + i);
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(x, z, 110, 20);
      if (!meta || !this.textures.exists(sheet)) {
        g.fillStyle(0xd8cfb8, 1);
        g.fillRect(x - 30, z - 250, 60, 250);
        return;
      }
      const sp = this.sprite(this.runSprites, 910 + i, sheet);
      sp.setVisible(true);
      sp.setTexture(
        sheet,
        walking ? Math.floor(frame / (s2 ? 9 : 6)) % meta.cells.length : s2 ? s2cell : cell,
      );
      sp.setOrigin(0.5, meta.ground / meta.cell);
      sp.setScale(0.95 * (meta.scale ?? 1));
      sp.setPosition(x, z);
      sp.setDepth(this.depthAt(z));
      // A worker running home moves left; the sheet is mirrored only where needed.
      sp.setFlipX(
        s2 || walking
          ? w.state === WorkerState.Leaving
          : workerFlip(cell, w.state === WorkerState.Leaving ? -1 : 0),
      );
    });
    if (beat.cache) prop(920, 'prop.barricade', 3, beat.cache.x, beat.cache.z, 120);
    run.pickups.forEach((p, i) => {
      if (p.taken) return;
      const x = fxToPixels(p.x);
      const z = fxToPixels(p.z);
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(x, z, 80, 14);
      const bob = Math.sin(frame / 12) * 4;
      prop(930 + i, 'prop.food', p.look, x, z - 6 + bob, 64);
    });
    if (beat.clue) prop(960, 'prop.barricade', 5, beat.clue.x, beat.clue.z, 130);
    if (beat.evidence && run.evidence >= 1)
      prop(961, 'prop.barricade', 4, beat.evidence.x, beat.evidence.z, 120);
    // Interactable spots glow softly until they are done.
    const glow = 0.35 + 0.25 * Math.abs(Math.sin(frame / 10));
    g.lineStyle(4, 0xffd166, glow);
    if (beat.clue && run.clue === 1) g.strokeEllipse(beat.clue.x, beat.clue.z, 200, 44);
    if (beat.evidence && run.evidence === 1)
      g.strokeEllipse(beat.evidence.x, beat.evidence.z, 200, 44);
    for (const w of run.workers)
      if (w.state === WorkerState.Bound) g.strokeEllipse(fxToPixels(w.x), fxToPixels(w.z), 160, 36);
    // Hold rings over heroes holding Interact, and a marker over downed heroes.
    for (const f of bodies) {
      if (f.team !== 'hero') continue;
      const x = fxToPixels(f.x);
      const z = fxToPixels(f.z);
      const c = run.channel[f.slot];
      if (f.state === MoveState.Channel && c && c.kind !== ChannelKind.None) {
        const t = Math.min(1, c.progress / Math.max(1, c.need));
        const top = z - 340;
        this.overlay.lineStyle(8, 0x333333, 0.8);
        this.overlay.strokeCircle(x, top, 26);
        this.overlay.lineStyle(8, HERO_COLORS[f.slot] ?? 0xffffff, 1);
        this.overlay.beginPath();
        this.overlay.arc(x, top, 26, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
        this.overlay.strokePath();
      }
      if (f.ko && f.state === MoveState.Defeated) {
        this.overlay.lineStyle(4, HERO_COLORS[f.slot] ?? 0xffffff, 0.6 + 0.4 * glow);
        this.overlay.strokeEllipse(x, z - 6, 240, 50);
      }
    }
    this.dropStale(this.runSprites, keep);
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
      // Each prop is drawn at the size the heroes' weapon poses show it in hand.
      sp.setScale(PROP_SCALE[WEAPONS[item.def]?.id ?? ''] ?? 0.6);
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
      // M18: the loading shutter's surface is drawn as its Ledger asset.
      if (s.id === this.shutterId) continue;
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
      // A triggered hazard (rest 0) is the boss arena's sluice surge: a water band.
      if (hz.rest === 0) {
        if (hz.phase === HazardPhase.Active) {
          g.fillStyle(0x6fc3ff, 0.55);
          g.fillRect(x! - hw!, z! - hd!, hw! * 2, hd! * 2);
        }
        continue;
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
      const name = dt(`weapon.${def.id}.name`, def.name);
      tag.setText(`${name} · ${tr(`over.condition.${cond}` as TextId)}${ammo}`);
      tag.setPosition(p.x, y - 2);
      tag.setVisible(true);
    } else tag.setVisible(false);
    const key = `${f.weaponEvent}/${f.weaponFrame}`;
    if (this.lastWeapon.get(f.id) === key) return;
    this.lastWeapon.set(f.id, key);
    const c = WEAPON_CALLOUTS[f.weaponEvent];
    if (!c || f.weaponFrame === 0) return;
    const t = this.add.text(p.x, top - 150, callout(c.text), {
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
      t = this.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '26px' });
      t.setOrigin(0.5, 1);
      t.setDepth(10);
      this.labels.set(f.id, t);
    }
    t.setText(this.nameOf(f));
    t.setPosition(p.x, top - 8);
    // An enemy out of the fight (fleeing, kneeling, defeated) no longer carries its name.
    t.setVisible(
      f.team !== 'enemy' ||
        (f.state !== MoveState.Flee &&
          f.state !== MoveState.Surrender &&
          f.state !== MoveState.Defeated),
    );
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
    const profile = f.team === 'enemy' && a ? overProfile(a.tags) : '';
    const text = a && (f.team === 'enemy' || this.opts.showLabels()) ? this.moveName(f, a) : '';
    m.setText(profile ? `${text}\n${profile}` : text);
    m.setColor(a?.tags.includes('unblockable') ? '#ff8080' : '#ffe9a8');
    m.setPosition(p.x, top - 38);
  }

  /** The name over a fighter in the chosen language: P1 · River, an enemy's name. */
  private nameOf(f: Fighter): string {
    if (f.team === 'hero') {
      const id = HEROES[f.hero]?.id ?? '';
      const full = heroName(id);
      // English and German keep the short form (Mountain, River); Chinese the full name.
      const name = locale.value === 'zh-CN' ? full : full.split(' ')[0];
      return `P${f.slot + 1} · ${name}`;
    }
    if (!this.inArena) return `Dummy ${f.id - 100}`;
    const e = ENEMIES[f.hero];
    return e ? dt(`enemy.${e.id}.name`, e.name) : '';
  }

  /** A running move's name in the chosen language (data name as the fallback). */
  private moveName(f: Fighter, a: { id: string; name: string }): string {
    const owner = f.team === 'hero' ? HEROES[f.hero] : ENEMIES[f.hero];
    const key =
      f.team === 'hero' ? `hero.${owner?.id}.action.${a.id}` : `enemy.${owner?.id}.action.${a.id}`;
    return dt(key, a.name);
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
    const t = this.add.text(p.x, top - 100, callout(c.text), {
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
      t = this.add.text(0, 0, '', {
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
    t.setText(tr('hud.ready'));
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
      text = tr('over.escape');
      color = '#ffd166';
    } else if (f.state === MoveState.Grabbed) {
      text = tr('over.grabbed');
      color = '#c8a2ff';
    } else if (f.state === MoveState.Restrained) {
      text = tr('over.restrained', { n: Math.max(0, f.stun - f.stateFrame) });
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
    const t = this.add.text(p.x, top - 100, callout(call.text), {
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

/** An enemy attack's defense profile in words, in the chosen language. */
function overProfile(tags: readonly string[]): string {
  const parts: string[] = [];
  if (tags.includes('unblockable')) parts.push(tr('over.unblockable'));
  else if (tags.includes('guardPiercing')) parts.push(tr('over.piercesGuard'));
  else if (tags.includes('guardPressure')) parts.push(tr('over.guardPressure'));
  if (tags.includes('counterable') && !tags.includes('uncounterable'))
    parts.push(tr('over.counterable'));
  return parts.join(' · ');
}

/** M22: the Stage 2 area (backdrop art) of a greenhouse room or a pursuit corridor. */
function stage2AreaOf(room: number | undefined, corridor: number | undefined): string | null {
  const id =
    room !== undefined
      ? ROOMS[room]?.id
      : corridor !== undefined
        ? CORRIDORS[corridor]?.id
        : undefined;
  return id ? (STAGE2_ROOM_AREA[id] ?? null) : null;
}
