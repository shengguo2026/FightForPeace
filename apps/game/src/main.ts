import * as Phaser from 'phaser';
import { render, h } from 'preact';
import { DEFAULT_KEYBOARD_P1 } from '@ffp/platform';
import { GameSession } from './game';
import { StageScene, VIEW_HEIGHT, VIEW_WIDTH } from './scenes/StageScene';
import { LabOverlay, createLabState, labelInput, pushInput } from './ui/LabOverlay';
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
  // Keyboard input is read by our own KeyboardState from window events.
  input: { keyboard: false },
  banner: false,
  scene: new StageScene(() => session.snapshot()),
});

render(h(LabOverlay, { state: lab }), document.getElementById('lab')!);

const boundCodes = new Set(Object.values(DEFAULT_KEYBOARD_P1.codes).flat());

window.addEventListener('keydown', (e) => {
  if (e.code === 'F1') {
    e.preventDefault();
    if (!e.repeat) lab.visible.value = !lab.visible.value;
    return;
  }
  if (boundCodes.has(e.code)) e.preventDefault();
  session.keyboard.keyDown(e.code);
});
window.addEventListener('keyup', (e) => session.keyboard.keyUp(e.code));
// Lost focus means lost keyup events: release everything so nothing stays held.
window.addEventListener('blur', () => session.keyboard.blur());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) session.keyboard.blur();
});

if (devBuild) installDebugHook(session);

let last: number | undefined;
let fpsFrames = 0;
let fpsSince = 0;

function tick(now: number): void {
  const elapsed = last === undefined ? 0 : now - last;
  last = now;
  const report = session.advance(elapsed);

  lab.frame.value = report.frame;
  lab.hash.value = report.hash.toString(16).padStart(8, '0');
  report.inputs.forEach((input, i) => {
    const frame = report.frame - report.inputs.length + i + 1;
    pushInput(lab, frame, labelInput(DEFAULT_KEYBOARD_P1, input));
  });

  fpsFrames += 1;
  if (now - fpsSince >= 500) {
    lab.fps.value = Math.round((fpsFrames * 1000) / (now - fpsSince));
    fpsFrames = 0;
    fpsSince = now;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
