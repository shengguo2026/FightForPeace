/**
 * M14 capability gates (spec §2): the game tests the browser it runs in. A missing
 * required capability stops the game with an explanation; a missing optional capability
 * switches off only the features that depend on it, each with its fallback.
 *
 * The evaluator is pure: the browser probe (apps/game/src/system/probe.ts) reads the real
 * browser once and passes plain booleans in.
 */
export interface CapabilityProbe {
  /** Hardware-accelerated drawing (WebGL 1 or 2). */
  webgl: boolean;
  /** Canvas 2D drawing (the renderer's fallback). */
  canvas: boolean;
  /** Physical key codes (`KeyboardEvent.code`): bindings and prompts use them. */
  keyCodes: boolean;
  /** IndexedDB, or the portable build's save folder. */
  storage: boolean;
  webAudio: boolean;
  /** Video the cinematics can play: WebM (VP9/Opus) or MP4 (H.264/AAC). */
  webm: boolean;
  mp4: boolean;
  /** The Gamepad API. */
  gamepads: boolean;
  /** WebSocket, which Wi-Fi co-op uses to reach the room server. */
  webSocket: boolean;
  fullscreen: boolean;
  /** Page Visibility events, which the focus pause listens to. */
  visibility: boolean;
}

export type CapabilityId =
  | 'renderer'
  | 'keyboard'
  | 'storage'
  | 'audio'
  | 'video'
  | 'gamepad'
  | 'network'
  | 'fullscreen'
  | 'visibility';

/** What a missing capability turns off. */
export type FeatureId =
  | 'game'
  | 'saves'
  | 'sound'
  | 'videoCinematics'
  | 'gamepadPlay'
  | 'wifiCoop'
  | 'fullscreen'
  | 'focusPause';

export interface CapabilityResult {
  id: CapabilityId;
  required: boolean;
  ok: boolean;
  /** Which variant is used, e.g. `webgl` / `canvas`, `webm` / `mp4`; null when missing. */
  via: string | null;
  /** Features switched off while it is missing (and the fallback the game uses). */
  affects: readonly FeatureId[];
}

export interface CapabilityReport {
  results: readonly CapabilityResult[];
  /** Required capabilities that are missing: the game cannot start. */
  blocking: readonly CapabilityId[];
  /** Features switched off by missing optional capabilities. */
  disabled: ReadonlySet<FeatureId>;
  renderer: 'webgl' | 'canvas' | null;
  video: 'webm' | 'mp4' | null;
}

/** Every capability in the order the System check lists them. */
export const CAPABILITIES: readonly {
  id: CapabilityId;
  required: boolean;
  affects: readonly FeatureId[];
}[] = [
  { id: 'renderer', required: true, affects: ['game'] },
  { id: 'keyboard', required: true, affects: ['game'] },
  { id: 'storage', required: false, affects: ['saves'] },
  { id: 'audio', required: false, affects: ['sound'] },
  { id: 'video', required: false, affects: ['videoCinematics'] },
  { id: 'gamepad', required: false, affects: ['gamepadPlay'] },
  { id: 'network', required: false, affects: ['wifiCoop'] },
  { id: 'fullscreen', required: false, affects: ['fullscreen'] },
  { id: 'visibility', required: false, affects: ['focusPause'] },
];

function via(id: CapabilityId, p: CapabilityProbe): string | null {
  switch (id) {
    case 'renderer':
      return p.webgl ? 'webgl' : p.canvas ? 'canvas' : null;
    case 'keyboard':
      return p.keyCodes ? 'codes' : null;
    case 'storage':
      return p.storage ? 'storage' : null;
    case 'audio':
      return p.webAudio ? 'webaudio' : null;
    case 'video':
      return p.webm ? 'webm' : p.mp4 ? 'mp4' : null;
    case 'gamepad':
      return p.gamepads ? 'gamepad' : null;
    case 'network':
      return p.webSocket ? 'websocket' : null;
    case 'fullscreen':
      return p.fullscreen ? 'fullscreen' : null;
    case 'visibility':
      return p.visibility ? 'visibility' : null;
  }
}

export function evaluateCapabilities(p: CapabilityProbe): CapabilityReport {
  const results = CAPABILITIES.map((c) => {
    const v = via(c.id, p);
    return { ...c, ok: v !== null, via: v };
  });
  const disabled = new Set<FeatureId>();
  for (const r of results) if (!r.ok && !r.required) for (const f of r.affects) disabled.add(f);
  return {
    results,
    blocking: results.filter((r) => r.required && !r.ok).map((r) => r.id),
    disabled,
    renderer: (results[0]!.via as 'webgl' | 'canvas' | null) ?? null,
    video: (results.find((r) => r.id === 'video')!.via as 'webm' | 'mp4' | null) ?? null,
  };
}

/** Probe fields each capability id switches off in a test override. */
const OVERRIDE: Record<CapabilityId, readonly (keyof CapabilityProbe)[]> = {
  renderer: ['webgl', 'canvas'],
  keyboard: ['keyCodes'],
  storage: ['storage'],
  audio: ['webAudio'],
  video: ['webm', 'mp4'],
  gamepad: ['gamepads'],
  network: ['webSocket'],
  fullscreen: ['fullscreen'],
  visibility: ['visibility'],
};

/**
 * Test builds only: `?caps=-video,-audio` simulates missing capabilities (also probe
 * fields such as `-webgl` or `-webm`). Unknown names are ignored.
 */
export function applyCapabilityOverride(p: CapabilityProbe, spec: string): CapabilityProbe {
  const out = { ...p };
  for (const raw of spec.split(',')) {
    const name = raw.trim().replace(/^-/, '');
    if (name in OVERRIDE) for (const k of OVERRIDE[name as CapabilityId]) out[k] = false;
    else if (name in out) out[name as keyof CapabilityProbe] = false;
  }
  return out;
}

/** A short browser name and major version from a user-agent string, for the System check. */
export function browserName(ua: string): string {
  const m =
    /Edg\/(\d+)/.exec(ua) ??
    /Firefox\/(\d+)/.exec(ua) ??
    /Chrome\/(\d+)/.exec(ua) ??
    /Version\/(\d+)[.\d]* .*Safari/.exec(ua);
  if (!m) return 'Unknown browser';
  const name = m[0].startsWith('Edg')
    ? 'Microsoft Edge'
    : m[0].startsWith('Firefox')
      ? 'Firefox'
      : m[0].startsWith('Chrome')
        ? /HeadlessChrome/.test(ua)
          ? 'Chromium (headless)'
          : 'Chrome'
        : 'Safari';
  return `${name} ${m[1]}`;
}
