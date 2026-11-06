import { describe, expect, test } from 'vitest';
import {
  CAPABILITIES,
  PerfProbe,
  applyCapabilityOverride,
  browserName,
  evaluateCapabilities,
  type CapabilityProbe,
} from '../src/index';

const FULL: CapabilityProbe = {
  webgl: true,
  canvas: true,
  keyCodes: true,
  storage: true,
  webAudio: true,
  webm: true,
  mp4: true,
  gamepads: true,
  webSocket: true,
  fullscreen: true,
  visibility: true,
};

describe('capability gates (spec §2)', () => {
  test('a Tier 1 browser has everything: nothing blocks, nothing is switched off', () => {
    const r = evaluateCapabilities(FULL);
    expect(r.blocking).toEqual([]);
    expect([...r.disabled]).toEqual([]);
    expect(r.renderer).toBe('webgl');
    expect(r.video).toBe('webm');
    expect(r.results.map((x) => x.id)).toEqual(CAPABILITIES.map((c) => c.id));
  });

  test('without WebGL the game draws with Canvas 2D; without WebM it plays MP4', () => {
    const r = evaluateCapabilities({ ...FULL, webgl: false, webm: false });
    expect(r.renderer).toBe('canvas');
    expect(r.video).toBe('mp4');
    expect(r.blocking).toEqual([]);
  });

  test('a missing optional capability switches off only its own features', () => {
    for (const c of CAPABILITIES.filter((x) => !x.required)) {
      const r = evaluateCapabilities(applyCapabilityOverride(FULL, `-${c.id}`));
      expect(r.blocking, c.id).toEqual([]);
      expect([...r.disabled].sort(), c.id).toEqual([...c.affects].sort());
    }
  });

  test('no renderer or no key codes stops the game', () => {
    expect(evaluateCapabilities({ ...FULL, webgl: false, canvas: false }).blocking).toEqual([
      'renderer',
    ]);
    expect(evaluateCapabilities({ ...FULL, keyCodes: false }).blocking).toEqual(['keyboard']);
  });

  test('test overrides take capability ids or probe fields; unknown names are ignored', () => {
    const p = applyCapabilityOverride(FULL, '-video, -webgl,-nonsense');
    expect(p.webm).toBe(false);
    expect(p.mp4).toBe(false);
    expect(p.webgl).toBe(false);
    expect(p.canvas).toBe(true);
    expect(FULL.webm).toBe(true);
  });

  test('browser names for the Tier 1 matrix', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    expect(browserName(chrome)).toBe('Chrome 131');
    expect(browserName(`${chrome} Edg/131.0.2903.70`)).toBe('Microsoft Edge 131');
    expect(
      browserName('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'),
    ).toBe('Firefox 133');
    expect(
      browserName(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      ),
    ).toBe('Safari 18');
    expect(browserName('curl/8')).toBe('Unknown browser');
  });
});

describe('performance probe', () => {
  test('real time at 60 FPS: 60 steps per second, short frames', () => {
    const p = new PerfProbe();
    for (let i = 0; i < 120; i += 1) p.frame(1000 / 60, 1, 0.2, false);
    const s = p.snapshot();
    expect(s.simHz).toBeCloseTo(60, 0);
    expect(s.meanMs).toBeCloseTo(16.67, 1);
    expect(s.stepMs).toBeCloseTo(0.2, 5);
    expect(s.histogram[1]).toBe(120);
    expect(s.capped).toBe(0);
  });

  test('a slow 30 FPS machine still steps twice per frame (real time), p95 sees spikes', () => {
    const p = new PerfProbe();
    for (let i = 0; i < 100; i += 1) p.frame(i % 20 === 0 ? 90 : 1000 / 30, i % 20 === 0 ? 5 : 2, 1, i % 20 === 0);
    const s = p.snapshot();
    expect(s.simHz).toBeGreaterThan(55);
    expect(s.p95Ms).toBe(90);
    expect(s.capped).toBe(5);
  });

  test('stalls do not count as real time, and reset clears everything', () => {
    const p = new PerfProbe();
    p.frame(1000, 5, 1, true);
    expect(p.snapshot().simHz).toBe(0);
    p.reset();
    expect(p.snapshot().frames).toBe(0);
  });
});
