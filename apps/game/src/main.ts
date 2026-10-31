import * as Phaser from 'phaser';
import { render, h } from 'preact';
import { DEFAULT_KEYBOARD_P1, rebind } from '@ffp/platform';
import { GameSession } from './game';
import { StageScene, VIEW_HEIGHT, VIEW_WIDTH } from './scenes/StageScene';
import { LabOverlay, type LabActions } from './ui/LabOverlay';
import { PauseOverlay } from './ui/PauseOverlay';
import { createLabState } from './ui/labState';
import { heldKeys, refreshPlayers, refreshTarget } from './ui/views';
import { captureNextKey, installKeyboard, readPads } from './input/browserInput';
import { installDebugHook } from './debug';

const devBuild = import.meta.env.DEV || import.meta.env.MODE === 'e2e';
const session = new GameSession(1);
const lab = createLabState(devBuild);

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
};

const root = document.getElementById('lab')!;
render(
  h('div', null, h(LabOverlay, { state: lab, actions }), h(PauseOverlay, { state: lab })),
  root,
);

installKeyboard(session, (code) => {
  if (code === 'F1') lab.visible.value = !lab.visible.value;
  if (code === 'F2') lab.settingsOpen.value = !lab.settingsOpen.value;
  if (code === 'F3') actions.setShowCollision(!lab.showCollision.value);
  if (code === 'F4') actions.setDummiesChase(!lab.dummiesChase.value);
  if (code === 'F5') lab.moveListOpen.value = !lab.moveListOpen.value;
  if (code === 'F6') lab.slowMotion.value = !lab.slowMotion.value;
});

if (devBuild) installDebugHook(session, lab);

let last: number | undefined;
let fpsFrames = 0;
let fpsSince = 0;

function tick(now: number): void {
  const elapsed = last === undefined ? 0 : now - last;
  last = now;
  session.devices.pollPads(readPads());
  // Slow motion is render-side only: the simulation still steps 1/60 s at a time.
  const report = session.advance(lab.slowMotion.value ? elapsed / 4 : elapsed);

  lab.frame.value = report.frame;
  lab.hash.value = report.hash.toString(16).padStart(8, '0');
  lab.paused.value = report.paused;
  const waiting = session.devices.waitingSlots();
  if (waiting.join() !== lab.waiting.value.join()) lab.waiting.value = waiting;
  // Reading the label version here makes layout changes re-render the prompts.
  void session.labels.version;
  refreshPlayers(session, lab, report.inputs);
  refreshTarget(session, lab);
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
requestAnimationFrame(tick);
