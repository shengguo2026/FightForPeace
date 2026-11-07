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
 * LAN co-op wire protocol (JSON messages over the Transport). The gameplay messages
 * (`in`, `hash`, `snap`) are frame-stamped inputs, frame-stamped hashes and full world
 * snapshots (M12); M15 keeps them unchanged and adds the recovery messages: a missing
 * player (`absent`), authority migration (`promoted`), and the way back (`rejoin`,
 * `back`). Bump NET_PROTOCOL whenever a message changes.
 */
export const NET_PROTOCOL = 2;

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
  /** Local input delay in frames (0 on a home network; raised up to MAX_DELAY if needed). */
  delay: number;
  /** M15: this session's id (a rejoining game names it in its hello). */
  session: string;
}

export type HoldKind = 'focus' | 'pause';

/** Why a session ended (both screens explain it; nothing continuable is kept). */
export type EndReason = 'left' | 'finished' | 'away' | 'lost' | 'desync';

/** M15: what the authority sends a returning player (see RollbackSession). */
export interface BackInfo {
  /** The authority's world at frame `snap.frame` (= `from` of the hand-back). */
  snap: WorldSnapshot;
  /** The returning player's slot, and the frame they went missing. */
  slot: number;
  absentFrom: number;
  /** First frame the returning player's own input counts again. */
  control: number;
  /** The authority's own inputs already stamped from `snap.frame` on: [frame, input]. */
  inputs: [number, WireInput][];
  /** How the session started (a fresh tab rebuilds the stage from it). */
  start: StartInfo;
  /** The authority's compatibility data: a returning game must match it exactly. */
  compat: Compat;
}

export type NetMessage =
  // Lobby (guest → host unless noted).
  | {
      t: 'hello';
      compat: Compat;
      name: string;
      loadouts: Record<string, LoadoutChange[]>;
      facing: FacingMode;
      /** M15: the session this game was part of (a reconnect), if any. */
      session?: string;
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
  // M15 recovery (both ways).
  | { t: 'absent'; from: number } // authority → partner: you are out from frame `from`
  | { t: 'promoted'; from: number } // sender took authority; the receiver is out from `from`
  | { t: 'rejoin'; from?: number } // a missing player asks to come back (from: its absence)
  | { t: 'back'; back: BackInfo } // authority → returning player
  // Room server notices.
  | {
      t: 'sys';
      ev: 'hosting' | 'joined' | 'peer-joined' | 'peer-left' | 'error';
      reason?: string;
      code?: string;
      /** `joined`: the guest's token, to take its place again after a lost connection. */
      token?: string;
    };

/** The largest local input delay (frames) quality monitoring may raise to. */
export const MAX_DELAY = 3;

/**
 * M15: frames of local input delay for a measured round trip (ms). Prediction and
 * rollback cover the partner's late input, so a home network plays with no delay; a slow
 * link starts with a little (at most MAX_DELAY) to keep rollbacks short.
 */
export function chooseDelay(rttMs: number): number {
  const frame = 1000 / 60;
  const oneWay = Math.max(0, rttMs) / 2;
  return Math.min(MAX_DELAY, Math.max(0, Math.ceil((oneWay - 3 * frame) / frame)));
}
