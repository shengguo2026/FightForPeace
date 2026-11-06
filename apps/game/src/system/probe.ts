import {
  PerfProbe,
  applyCapabilityOverride,
  browserName,
  evaluateCapabilities,
  type CapabilityProbe,
  type CapabilityReport,
} from '@ffp/platform';

/** M14: reads this browser's capabilities once (spec §2 capability gates). */
export function probeBrowser(): CapabilityProbe {
  const canvas = document.createElement('canvas');
  const has = (fn: () => unknown) => {
    try {
      return !!fn();
    } catch {
      return false;
    }
  };
  const video = document.createElement('video');
  const plays = (type: string) => has(() => video.canPlayType(type) !== '');
  return {
    webgl: has(() => canvas.getContext('webgl2') ?? canvas.getContext('webgl')),
    canvas: has(() => document.createElement('canvas').getContext('2d')),
    keyCodes: has(() => 'code' in KeyboardEvent.prototype),
    storage: has(() => typeof indexedDB !== 'undefined' && indexedDB),
    webAudio: has(() => window.AudioContext),
    webm: plays('video/webm; codecs="vp9, opus"'),
    mp4: plays('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
    gamepads: has(() => typeof navigator.getGamepads === 'function'),
    webSocket: has(() => typeof WebSocket === 'function'),
    fullscreen: has(() => document.fullscreenEnabled),
    visibility: has(() => 'visibilityState' in document),
  };
}

const testBuild = import.meta.env.DEV || import.meta.env.MODE === 'e2e';
const override = testBuild ? new URLSearchParams(location.search).get('caps') : null;

/** This browser's capability report; test builds accept `?caps=-video,-audio`. */
export const capabilities: CapabilityReport = evaluateCapabilities(
  override ? applyCapabilityOverride(probeBrowser(), override) : probeBrowser(),
);

export const BROWSER = browserName(navigator.userAgent);

/** Is a feature available in this browser? */
export const can = (feature: Parameters<CapabilityReport['disabled']['has']>[0]) =>
  !capabilities.disabled.has(feature);

/** M14: render frame times and simulation cost, for the System check and the tests. */
export const perf = new PerfProbe();
