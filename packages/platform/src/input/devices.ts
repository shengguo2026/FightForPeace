import type { FrameInput } from '@ffp/sim';
import { Action, type Bindings, type DeviceKind } from './actions';
import { GamepadState, type PadFamily, type PadSnapshot } from './gamepad';
import { KeyboardState } from './keyboard';

/** `kb:p1` is the left keyboard cluster, `kb:p2` the split-keyboard half, `pad:<n>` a gamepad. */
export type DeviceId = 'kb:p1' | 'kb:p2' | `pad:${number}`;

export interface SlotState {
  joined: boolean;
  device: DeviceId | null;
  /** The assigned controller was disconnected; gameplay waits for it or a replacement. */
  waiting: boolean;
  /** Device name of the lost pad, so plugging the same pad back reassigns it. */
  lostPadId: string | null;
}

interface Source {
  sample(): FrameInput;
  takeEvents(): { pressed: number; active: boolean };
}

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
export const MAX_SLOTS = 2;

export interface DeviceHubOptions {
  keyboardP1: Bindings;
  keyboardP2: Bindings;
  gamepad: Bindings;
}

/**
 * Player-to-device assignment (spec §10.1):
 * - Player 1 exists from the start. While nobody else has joined, Player 1 follows the
 *   last device that was used (P1 keyboard cluster or any gamepad): seamless switching.
 * - Player 2 joins explicitly: Attack on the split-keyboard half, or Start on a gamepad
 *   that Player 1 is not using. After that, assignments are fixed and a newly connected
 *   controller never takes control from anyone.
 * - Unplugging an assigned gamepad pauses gameplay until the same pad is plugged back in,
 *   or the waiting player presses Attack on any unassigned device.
 * - Pause on an assigned device toggles a user pause.
 */
export class DeviceHub {
  readonly keyboardP1: KeyboardState;
  readonly keyboardP2: KeyboardState;
  readonly pads = new Map<number, GamepadState>();
  readonly slots: SlotState[];
  userPaused = false;
  private padBindings: Bindings;

  constructor(opts: DeviceHubOptions) {
    this.keyboardP1 = new KeyboardState(opts.keyboardP1);
    this.keyboardP2 = new KeyboardState(opts.keyboardP2);
    this.padBindings = opts.gamepad;
    this.slots = [
      { joined: true, device: 'kb:p1', waiting: false, lostPadId: null },
      { joined: false, device: null, waiting: false, lostPadId: null },
    ];
  }

  get paused(): boolean {
    return this.userPaused || this.slots.some((s) => s.waiting);
  }

  /** Slots whose controller is missing. */
  waitingSlots(): number[] {
    return this.slots.flatMap((s, i) => (s.waiting ? [i] : []));
  }

  joinedCount(): number {
    return this.slots.filter((s) => s.joined).length;
  }

  setGamepadBindings(b: Bindings): void {
    this.padBindings = b;
    for (const pad of this.pads.values()) pad.setBindings(b);
  }

  /** Connects, updates and disconnects pads from one poll of navigator.getGamepads(). */
  pollPads(snapshots: readonly (PadSnapshot | null)[]): void {
    const seen = new Set<number>();
    for (const snap of snapshots) {
      if (!snap || !snap.connected) continue;
      seen.add(snap.index);
      let pad = this.pads.get(snap.index);
      if (!pad || pad.id !== snap.id) {
        if (pad) this.disconnectPad(snap.index);
        pad = this.connectPad(snap);
      }
      pad.update(snap);
    }
    for (const index of [...this.pads.keys()]) if (!seen.has(index)) this.disconnectPad(index);
  }

  connectPad(snap: Pick<PadSnapshot, 'id' | 'index'>): GamepadState {
    const pad = new GamepadState(this.padBindings, snap);
    this.pads.set(snap.index, pad);
    const lost = this.slots.find((s) => s.waiting && s.lostPadId === snap.id);
    if (lost) this.assign(lost, `pad:${snap.index}`);
    return pad;
  }

  disconnectPad(index: number): void {
    const pad = this.pads.get(index);
    this.pads.delete(index);
    for (const slot of this.slots) {
      if (slot.device === `pad:${index}`) {
        slot.device = null;
        slot.waiting = true;
        slot.lostPadId = pad?.id ?? null;
      }
    }
  }

  /**
   * Once per render frame, before the simulation steps: device switching, joining,
   * reassignment and pause. Presses used here are removed from the step latches of
   * devices that do not drive a player, so they never leak into gameplay.
   */
  poll(): void {
    const ids = this.deviceIds();
    const events = new Map(ids.map((id) => [id, this.source(id)!.takeEvents()] as const));
    const assigned = (id: DeviceId) => this.slots.some((s) => s.device === id);
    const consumed = new Set<DeviceId>();
    const pressed = (id: DeviceId, action: number) =>
      !consumed.has(id) && ((events.get(id)?.pressed ?? 0) & action) !== 0;

    // Reassign a waiting player to the first unassigned device where Attack was pressed.
    for (const slot of this.slots) {
      if (!slot.waiting) continue;
      const pick = ids.find((id) => !assigned(id) && pressed(id, Action.Attack));
      if (pick) {
        this.assign(slot, pick);
        consumed.add(pick);
        this.source(pick)!.sample(); // the reassign press is not an attack
      }
    }

    const p1 = this.slots[0]!;
    const p2 = this.slots[1]!;
    if (!p2.joined && !p1.waiting) {
      // Join Player 2: Attack on the split keyboard, or Start on a pad P1 is not using.
      const join = ids.find(
        (id) =>
          id !== p1.device &&
          ((id === 'kb:p2' && pressed(id, Action.Attack)) ||
            (id.startsWith('pad:') && pressed(id, Action.Pause))),
      );
      if (join) {
        p2.joined = true;
        this.assign(p2, join);
        consumed.add(join);
        this.source(join)!.sample(); // the join press is not an attack
      }
    }

    if (!p2.joined && !p1.waiting) {
      // Single-player: Player 1 follows the device used last.
      const candidates = ids.filter((id) => id !== 'kb:p2' && events.get(id)?.active);
      if (candidates.length > 0 && !candidates.includes(p1.device!)) {
        this.assign(p1, candidates[0]!);
      }
    }

    if (!this.slots.some((s) => s.waiting)) {
      for (const slot of this.slots) {
        if (slot.device && pressed(slot.device, Action.Pause)) {
          this.userPaused = !this.userPaused;
          break;
        }
      }
    }

    // Drop step latches nobody will read: unassigned devices, and everything while paused.
    for (const id of ids) if (this.paused || !assigned(id)) this.source(id)!.sample();
  }

  /** One FrameInput per joined player, for one simulation step. */
  sampleFrame(): FrameInput[] {
    const out: FrameInput[] = [];
    this.slots.forEach((slot, i) => {
      if (!slot.joined) return;
      const src = slot.device ? this.source(slot.device) : undefined;
      out[i] = src ? src.sample() : IDLE;
    });
    return out;
  }

  deviceKind(slot: number): DeviceKind {
    return this.slots[slot]?.device?.startsWith('pad:') ? 'gamepad' : 'keyboard';
  }

  /** The bindings that currently drive a player (for prompts and the input history). */
  bindingsFor(slot: number): Bindings {
    const id = this.slots[slot]?.device;
    if (id === 'kb:p2') return this.keyboardP2.bindings;
    if (id?.startsWith('pad:')) return this.padBindings;
    if (id === 'kb:p1') return this.keyboardP1.bindings;
    return slot === 1 ? this.keyboardP2.bindings : this.keyboardP1.bindings;
  }

  padFamilyFor(slot: number): PadFamily | null {
    const id = this.slots[slot]?.device;
    if (!id?.startsWith('pad:')) return null;
    return this.pads.get(Number(id.slice(4)))?.family ?? null;
  }

  source(id: DeviceId): Source | undefined {
    if (id === 'kb:p1') return this.keyboardP1;
    if (id === 'kb:p2') return this.keyboardP2;
    return this.pads.get(Number(id.slice(4)));
  }

  private deviceIds(): DeviceId[] {
    const pads = [...this.pads.keys()].sort((a, b) => a - b).map((i) => `pad:${i}` as const);
    return ['kb:p1', 'kb:p2', ...pads];
  }

  private assign(slot: SlotState, id: DeviceId): void {
    for (const other of this.slots) if (other !== slot && other.device === id) return;
    slot.device = id;
    slot.waiting = false;
    slot.lostPadId = null;
  }
}
