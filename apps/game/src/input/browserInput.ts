import type { PadSnapshot } from '@ffp/platform';
import type { GameSession } from '../game';

/** Keys the Lab uses itself; they never reach gameplay. */
export const LAB_KEYS = new Set([
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'Home',
  'End',
]);

let fakePads: (PadSnapshot | null)[] = [];

/** Test hook: replaces real pads with virtual ones (dev and e2e builds only). */
export function setFakePads(pads: (PadSnapshot | null)[]): void {
  fakePads = pads;
}

let usingFake = false;
export function useFakePads(on: boolean): void {
  usingFake = on;
}

/** Copies navigator.getGamepads() into plain snapshots, once per render frame. */
export function readPads(): (PadSnapshot | null)[] {
  if (usingFake) return fakePads;
  const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  return Array.from(pads, (p) =>
    p
      ? {
          id: p.id,
          index: p.index,
          connected: p.connected,
          mapping: p.mapping,
          buttons: p.buttons.map((b) => b.pressed),
          axes: [...p.axes],
        }
      : null,
  );
}

/** A key the player is binding: the next press is captured instead of played. */
let captureNext: ((code: string) => void) | null = null;
export function captureNextKey(cb: ((code: string) => void) | null): void {
  captureNext = cb;
}

/**
 * Wires window keyboard events to both keyboard binding sets and the label source.
 * `onLabKey` receives F1–F10. `intercept` (M10 menus) sees key events before gameplay and
 * returns true when it used them.
 */
export function installKeyboard(
  session: GameSession,
  onLabKey: (code: string) => void,
  intercept: (e: KeyboardEvent) => boolean = () => false,
): void {
  const { keyboardP1, keyboardP2 } = session.devices;
  window.addEventListener('keydown', (e) => {
    session.labels.observe(e.code, e.key);
    if (LAB_KEYS.has(e.code)) {
      e.preventDefault();
      if (!e.repeat) onLabKey(e.code);
      return;
    }
    if (captureNext) {
      e.preventDefault();
      const cb = captureNext;
      captureNext = null;
      cb(e.code);
      return;
    }
    if (intercept(e)) return;
    if (keyboardP1.binds(e.code) || keyboardP2.binds(e.code)) e.preventDefault();
    keyboardP1.keyDown(e.code);
    keyboardP2.keyDown(e.code);
  });
  window.addEventListener('keyup', (e) => {
    if (intercept(e)) {
      keyboardP1.keyUp(e.code);
      keyboardP2.keyUp(e.code);
      return;
    }
    keyboardP1.keyUp(e.code);
    keyboardP2.keyUp(e.code);
  });
  // Lost focus means lost keyup events: release everything so nothing stays held, and
  // (M8) pause while anyone is playing, until a player presses Pause.
  const release = () => session.devices.loseFocus();
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });

  // Printed key labels from the browser where available (Chrome, Edge).
  const kb = (
    navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }
  ).keyboard;
  kb?.getLayoutMap?.()
    .then((map) => session.labels.setLayoutMap(map.entries()))
    .catch(() => undefined);
}
