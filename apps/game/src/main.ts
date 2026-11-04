import * as Phaser from 'phaser';
import { render, h } from 'preact';
import { DEFAULT_KEYBOARD_P1, QualityGovernor, rebind } from '@ffp/platform';
import { HEROES, STAGES, equip, heroOf, stageResults } from '@ffp/sim';
import { GameSession } from './game';
import { EQUIP_TEXT } from './text/en';
import { StageScene, VIEW_HEIGHT, VIEW_WIDTH } from './scenes/StageScene';
import { LabOverlay, type LabActions } from './ui/LabOverlay';
import { PauseOverlay } from './ui/PauseOverlay';
import { ResultsOverlay, StageHud, VersionTag } from './ui/StageOverlay';
import { createLabState } from './ui/labState';
import {
  heldKeys,
  refreshDefense,
  refreshGrab,
  refreshWeapons,
  refreshPlayers,
  refreshRecipes,
  refreshTarget,
  refreshArena,
  refreshCoop,
  refreshStage,
} from './ui/views';
import { captureNextKey, installKeyboard, readPads } from './input/browserInput';
import { installDebugHook } from './debug';
import { Shell, applyUiScale } from './shell/shell';
import { ShellRoot, menuPaused } from './shell/ShellRoot';
import { refreshHud } from './shell/screens/Hud';
import { injectShellStyles } from './shell/ui';
import { PadNav, dispatchNav, keyNav } from './shell/nav';
import { setLocale } from './text/i18n';

const devBuild = import.meta.env.DEV || import.meta.env.MODE === 'e2e';
// M4: the Lab is the playable build, so it is visible everywhere and Dummy 1 attacks with
// the Straight Jab. Automated tests start with still dummies and arm them when needed.
const lab = createLabState(true);
if (import.meta.env.MODE === 'e2e') lab.trainer.value = { ...lab.trainer.value, attackers: 0 };
const session = new GameSession(1, lab.trainer.value);
// Browsers driven by automated tests send focus events of their own; the M8 focus test
// turns the focus pause back on. Players' browsers never set navigator.webdriver.
if (devBuild && navigator.webdriver) session.devices.pauseOnFocusLoss = false;
// M8 Fixed Simulation with Independent Adaptive Presentation: only drawing adapts.
const quality = new QualityGovernor();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // Keyboard and gamepad input are read by @ffp/platform, not by Phaser.
  input: { keyboard: false, gamepad: false },
  banner: false,
  scene: new StageScene({
    getSnapshot: () => session.snapshot(),
    showCollision: () => lab.showCollision.value,
    showLabels: () => lab.visible.value,
    quality: () => quality.level,
    // The simulation starts once the art has loaded, so decoding sheets never stalls play.
    onReady: () => requestAnimationFrame(tick),
  }),
});

const actions: LabActions = {
  setFacing: (slot, mode) => session.setFacingMode(slot, mode),
  setPromptStyle: (style) => (lab.promptStyle.value = style),
  setLayout: (layout) => {
    lab.layout.value = layout;
    session.labels.setPickedLayout(layout);
  },
  setP2Preset: (preset) => {
    lab.p2Preset.value = preset;
    session.setKeyboardP2Preset(preset);
  },
  rebindAttack: () => {
    lab.rebinding.value = true;
    captureNextKey((code) => {
      lab.rebinding.value = false;
      const kb = session.devices.keyboardP1;
      kb.setBindings(rebind(kb.bindings, 'Attack', [code]));
    });
  },
  resetBindings: () => session.devices.keyboardP1.setBindings(DEFAULT_KEYBOARD_P1),
  setDummiesChase: (on) => {
    lab.dummiesChase.value = on;
    session.world.dummiesChase = on;
  },
  setShowCollision: (on) => (lab.showCollision.value = on),
  setHero: (slot, heroId) => session.setHero(slot, heroId),
  setInfiniteMeter: (on) => {
    lab.infiniteMeter.value = on;
    session.world.infiniteMeter = on;
  },
  setCounterHit: (on) => {
    lab.counterHit.value = on;
    session.world.dummy.counterHit = on;
  },
  setRefill: (on) => {
    lab.refill.value = on;
    session.world.dummy.refill = on;
  },
  dummyToWall: () => session.dummyToWall(),
  setInfiniteDefense: (on) => {
    lab.infiniteDefense.value = on;
    session.world.infiniteDefense = on;
  },
  setTrainer: (settings) => {
    lab.trainer.value = { ...lab.trainer.value, ...settings };
    session.setTrainer(lab.trainer.value);
  },
  equip: (slot, kind, dir, action) => {
    const result = equip(session.world, slot, kind, dir, action);
    lab.equipNote.value = EQUIP_TEXT[result] ?? '';
    refreshGrab(session, lab);
  },
  armDummy: (weapon) => {
    lab.trainer.value = { ...lab.trainer.value, arm: weapon };
    session.armDummy(weapon);
  },
  resetArmory: () => session.resetArmory(),
  resetEnvironment: () => session.resetEnvironment(),
  dummyToPillar: () => session.dummyToPillar(),
  startArena: (arena) => {
    session.startArena(arena, lab.arenaPick.value.difficulty, lab.arenaPick.value.beat);
    // Arena play needs the screen: the Defense panel closes (F8 opens it again).
    if (arena) lab.defenseOpen.value = false;
  },
  pickArena: (pick) => (lab.arenaPick.value = { ...lab.arenaPick.value, ...pick }),
  setQuality: (setting) => quality.set(setting),
  practise: (slot, recipeId) => {
    const hero = heroOf(session.world, slot);
    const recipe = hero ? HEROES[hero.hero]?.recipes.find((r) => r.id === recipeId) : undefined;
    if (recipe) lab.counterHit.value = session.practise(slot, recipe);
  },
};

// M10: the game shell (first launch, the village, the play flow, settings and saves).
// Automated tests of earlier milestones open the Lab directly, as do `?lab` and
// `?stage=`; `?shell` always opens the shell.
const params = new URLSearchParams(location.search);
const stageParam = params.get('stage');
const useShell =
  params.has('shell') || !((devBuild && navigator.webdriver) || params.has('lab') || stageParam);
const shell = new Shell(session, lab, __FFP_VERSION__);
shell.onQuality = (setting) => quality.set(setting);
injectShellStyles();
if (useShell) {
  session.held = true;
  lab.visible.value = false;
} else shell.go('lab');

const root = document.getElementById('lab')!;
render(
  h(
    'div',
    null,
    h(StageHud, { state: lab }),
    h(LabOverlay, { state: lab, actions }),
    h(PauseOverlay, { state: lab, menu: () => useShell }),
    h(ResultsOverlay, {
      state: lab,
      village: () => useShell && shell.fromShell.value,
      continuedFrom: () => shell.continued.value?.beat ?? null,
      onAgain: () => {
        if (useShell && shell.fromShell.value) shell.startStage();
        else actions.startArena(lab.arenaPick.value.arena);
      },
      onLab: () => {
        if (useShell && shell.fromShell.value) shell.returnToVillage();
        else actions.startArena(null);
      },
    }),
    useShell ? h(ShellRoot, { shell, state: lab }) : null,
    h(VersionTag, { version: __FFP_VERSION__ }),
  ),
  root,
);

// M9: `?stage=stage1` (optionally `&difficulty=easy&beat=3`) opens the stage journey at once.
const stageId = stageParam && /^\d+$/.test(stageParam) ? `stage${stageParam}` : stageParam;
if (stageId && STAGES.some((s) => s.id === stageId)) {
  const id = stageId;
  const beat = Math.max(0, Number(params.get('beat') ?? '1') - 1) || 0;
  lab.arenaPick.value = {
    arena: id,
    difficulty: params.get('difficulty') ?? lab.arenaPick.value.difficulty,
    beat,
  };
  actions.startArena(id);
  lab.visible.value = false;
  shell.go('game');
}

/** The shell wants menu input: a menu screen, or the pause menu or results over play. */
const shellInput = () => useShell && (!shell.live || menuPaused(lab) || lab.results.value !== null);
const padNav = new PadNav();
const TYPING_KEYS = new Set(['Escape', 'Enter', 'NumpadEnter', 'ArrowUp', 'ArrowDown', 'Tab']);

installKeyboard(
  session,
  (code) => {
    // The Lab's function keys work only in the Lab (and in the earlier milestones' tests).
    if (useShell && shell.screen.value !== 'lab') return;
    if (code === 'F1') lab.visible.value = !lab.visible.value;
    if (code === 'F2') lab.settingsOpen.value = !lab.settingsOpen.value;
    if (code === 'F3') actions.setShowCollision(!lab.showCollision.value);
    if (code === 'F4') actions.setDummiesChase(!lab.dummiesChase.value);
    if (code === 'F5') lab.moveListOpen.value = !lab.moveListOpen.value;
    if (code === 'F6') lab.slowMotion.value = !lab.slowMotion.value;
    if (code === 'F7') lab.recipesOpen.value = !lab.recipesOpen.value;
    if (code === 'F8') lab.defenseOpen.value = !lab.defenseOpen.value;
    if (code === 'F9') lab.grabOpen.value = !lab.grabOpen.value;
    if (code === 'F10') lab.weaponOpen.value = !lab.weaponOpen.value;
    // M7 arena mode: Home restarts the picked arena, End goes back to the Lab.
    if (code === 'Home') actions.startArena(lab.arenaPick.value.arena);
    if (code === 'End') actions.startArena(null);
  },
  (e) => {
    if (!shellInput()) return false;
    const target = e.target as HTMLElement | null;
    // Text fields keep their keys (names); only leaving them navigates.
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
      !TYPING_KEYS.has(e.code)
    )
      return true;
    if (e.code === 'Tab') return false;
    e.preventDefault();
    if (e.type !== 'keydown' || e.repeat) return true;
    const p2 = session.devices.keyboardP2.bindings;
    const ev = keyNav(e.code, session.devices.keyboardP1.bindings, p2);
    if (ev) dispatchNav(ev);
    return true;
  },
);

if (useShell) {
  const d = new URLSearchParams(location.search);
  if (d.has('lang')) setLocale(d.get('lang') as 'en');
  void shell.boot().then(() => applyUiScale(shell.device.value?.uiScale ?? 100));
  window.addEventListener('beforeunload', () => void shell.flushSave());
}

if (devBuild) installDebugHook(session, lab, quality, shell);

let last: number | undefined;
let fpsFrames = 0;
let fpsSince = 0;

function tick(now: number): void {
  const elapsed = last === undefined ? 0 : now - last;
  last = now;
  const pads = readPads();
  if (shellInput()) {
    for (const ev of padNav.poll(pads)) dispatchNav(ev);
  } else padNav.reset(pads);
  session.devices.pollPads(pads);
  // Slow motion is render-side only: the simulation still steps 1/60 s at a time.
  const report = session.advance(lab.slowMotion.value ? elapsed / 4 : elapsed);

  lab.frame.value = report.frame;
  lab.hash.value = report.hash.toString(16).padStart(8, '0');
  lab.paused.value = report.paused;
  lab.focusPaused.value = session.devices.focusPaused;
  quality.sample(report.paused ? 0 : elapsed);
  const q = lab.quality.value;
  const ms = Math.round(quality.average * 10) / 10;
  if (q.setting !== quality.setting || q.level !== quality.level || Math.abs(q.ms - ms) >= 0.5)
    lab.quality.value = { setting: quality.setting, level: quality.level, ms };
  const waiting = session.devices.waitingSlots();
  if (waiting.join() !== lab.waiting.value.join()) lab.waiting.value = waiting;
  // Reading the label version here makes layout changes re-render the prompts.
  void session.labels.version;
  refreshPlayers(session, lab, report.inputs);
  refreshTarget(session, lab);
  refreshRecipes(session, lab);
  refreshDefense(session, lab);
  refreshGrab(session, lab);
  refreshWeapons(session, lab);
  refreshArena(session, lab);
  refreshCoop(session, lab);
  refreshStage(session, lab);
  if (useShell && shell.screen.value === 'game') {
    refreshHud(session);
    shell.watchRun(lab.results.value ? stageResults(session.world) : null);
  }
  const held = heldKeys(session);
  if (held.join(' ') !== lab.heldKeys.value.join(' ')) lab.heldKeys.value = held;

  fpsFrames += 1;
  if (now - fpsSince >= 500) {
    lab.fps.value = Math.round((fpsFrames * 1000) / (now - fpsSince));
    fpsFrames = 0;
    fpsSince = now;
  }
  requestAnimationFrame(tick);
}
