import {
  type Axis,
  type FacingMode,
  type FrameInput,
  type LoadoutChange,
  type WorldSnapshot,
  xxh32,
} from '@ffp/sim';
import manifest from '../assets/manifest.json';

/**
 * M12 LAN co-op wire protocol (JSON messages over the Transport). The gameplay messages
 * (`in`, `hash`, `snap`) are frame-stamped inputs, frame-stamped hashes and full world
 * snapshots: the format M15's prediction and rollback reuses, so phase 2 adds prediction
 * without changing the wire format. Bump NET_PROTOCOL whenever a message changes.
 */
export const NET_PROTOCOL = 1;

/** What two copies of the game compare before readiness (spec §18.2). */
export interface Compat {
  game: string;
  protocol: number;
  /** Deterministic-rules hash (rules version, state format, every gameplay table). */
  rules: number;
  /** Content manifest hash (the asset manifest). */
  content: number;
  /** Elder's Secrets cheat registry hash. */
  cheats: number;
}

/** xxHash of a value's JSON text (UTF-16 code units, two bytes each). */
function jsonHash(value: unknown): number {
  const s = JSON.stringify(value);
  const b = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    b[2 * i] = c & 0xff;
    b[2 * i + 1] = c >>> 8;
  }
  return xxh32(b);
}

/** The content manifest hash: which approved art and media this copy of the game has. */
export function contentHash(): number {
  return jsonHash(manifest);
}

/** Why the host refused a guest: each has its own explanation on the guest's screen. */
export type RejectReason = 'protocol' | 'game' | 'rules' | 'content' | 'cheats' | 'busy';

/** The first difference between two copies, in the order a player can act on, or null. */
export function checkCompat(host: Compat, guest: Compat): RejectReason | null {
  if (host.protocol !== guest.protocol) return 'protocol';
  if (host.game !== guest.game) return 'game';
  if (host.rules !== guest.rules) return 'rules';
  if (host.content !== guest.content) return 'content';
  if (host.cheats !== guest.cheats) return 'cheats';
  return null;
}

/** FrameInput on the wire: [moveX, moveZ, pressed, held, dirPressed]. */
export type WireInput = [number, number, number, number, number];

export function toWire(i: FrameInput): WireInput {
  return [i.moveX, i.moveZ, i.pressed, i.held, i.dirPressed];
}

export function fromWire(w: WireInput): FrameInput {
  const axis = (v: number): Axis => (v > 0 ? 1 : v < 0 ? -1 : 0);
  return { moveX: axis(w[0]), moveZ: axis(w[1]), pressed: w[2], held: w[3], dirPressed: w[4] };
}

/** One lobby player as both games show it (slot 0 is always the host). */
export interface LobbyPlayer {
  name: string;
  hero: string | null;
  ready: boolean;
}

export interface LobbyState {
  stage: string;
  difficulty: string;
  players: LobbyPlayer[];
}

/** Everything both games need to build the same first frame. */
export interface StartInfo {
  seed: number;
  stage: string;
  difficulty: string;
  heroes: string[];
  loadouts: LoadoutChange[][];
  facing: FacingMode[];
  /** Input delay in frames (2–4, from the measured round trip). */
  delay: number;
}

export type HoldKind = 'focus' | 'pause';

/** Why a session ended (both screens explain it; nothing continuable is kept). */
export type EndReason = 'left' | 'finished' | 'away' | 'lost' | 'desync';

export type NetMessage =
  // Lobby (guest → host unless noted).
  | {
      t: 'hello';
      compat: Compat;
      name: string;
      loadouts: Record<string, LoadoutChange[]>;
      facing: FacingMode;
    }
  | { t: 'welcome'; lobby: LobbyState } // host → guest
  | { t: 'reject'; reason: RejectReason } // host → guest
  | { t: 'lobby'; lobby: LobbyState } // host → guest
  | { t: 'pick'; hero: string | null; ready: boolean }
  | { t: 'start'; start: StartInfo } // host → guest
  // Lockstep (both ways).
  | { t: 'in'; f: number; i: WireInput }
  | { t: 'hash'; f: number; h: number }
  | { t: 'resync'; f: number } // guest → host: please send a snapshot
  | { t: 'snap'; s: WorldSnapshot } // host → guest
  | { t: 'hold'; kind: HoldKind }
  | { t: 'ready' }
  | { t: 'go'; ms: number } // host → guest: synchronized countdown
  | { t: 'ping'; n: number; at: number }
  | { t: 'pong'; n: number; at: number }
  | { t: 'bye'; reason: EndReason }
  // Room server notices.
  | {
      t: 'sys';
      ev: 'hosting' | 'joined' | 'peer-joined' | 'peer-left' | 'error';
      reason?: string;
      code?: string;
    };

/** Frames of input delay for a measured round trip (ms): 2 on a quiet LAN, at most 4. */
export function chooseDelay(rttMs: number): number {
  const frame = 1000 / 60;
  return Math.min(4, Math.max(2, 1 + Math.ceil((Math.max(0, rttMs) / 2 + 8) / frame)));
}
