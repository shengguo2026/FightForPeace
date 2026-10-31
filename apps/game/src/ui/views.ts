import { ActionBit, type FrameInput, MoveState, fxToPixels, heroOf } from '@ffp/sim';
import {
  ACTION_NAMES,
  type Prompt,
  type PromptContext,
  promptText,
  resolvePrompt,
} from '@ffp/platform';
import type { GameSession } from '../game';
import { HISTORY_LENGTH, type HistoryEntry, type LabState, type PlayerView } from './labState';

const STATE_NAMES: Record<number, string> = {
  [MoveState.Idle]: 'idle',
  [MoveState.Walk]: 'walk',
  [MoveState.Dash]: 'dash',
  [MoveState.Air]: 'air',
  [MoveState.Attack]: 'attack',
};

const ACTION_BY_BIT = new Map<number, string>(
  Object.entries(ActionBit).map(([name, bit]) => [bit, name]),
);

/** The prompt context for a player right now: device, bindings, glyph family, facing. */
export function promptContext(session: GameSession, lab: LabState, slot: number): PromptContext {
  const hub = session.devices;
  const style = lab.promptStyle.value;
  const detected = hub.padFamilyFor(slot) ?? 'generic';
  return {
    bindings: hub.bindingsFor(slot),
    labels: session.labels,
    family: style === 'auto' ? detected : style,
    facing: heroOf(session.world, slot)?.facing ?? 1,
  };
}

/** The prompts for one frame's input: held directions, then newly pressed actions. */
export function inputPrompts(ctx: PromptContext, input: FrameInput): Prompt[] {
  const out: Prompt[] = [];
  if (input.moveZ === -1) out.push(resolvePrompt(ctx, { dir: 'up' }));
  if (input.moveZ === 1) out.push(resolvePrompt(ctx, { dir: 'down' }));
  if (input.moveX === -1) out.push(resolvePrompt(ctx, { dir: 'left' }));
  if (input.moveX === 1) out.push(resolvePrompt(ctx, { dir: 'right' }));
  for (const name of ACTION_NAMES) {
    if (input.pressed & ActionBit[name]) out.push(resolvePrompt(ctx, { action: name }));
  }
  return out;
}

function deviceLabel(session: GameSession, slot: number): string {
  const s = session.devices.slots[slot];
  if (!s?.joined) return 'not joined';
  if (s.waiting) return 'controller lost';
  if (s.device === 'kb:p1') return 'keyboard';
  if (s.device === 'kb:p2')
    return `split keyboard (${session.devices.keyboardP2.bindings.codes.Attack[0]?.startsWith('Numpad') ? 'numpad' : 'laptop'})`;
  const fam = session.devices.padFamilyFor(slot) ?? 'generic';
  return `gamepad ${s.device?.slice(4)} (${fam})`;
}

const speed = (vx: number, vz: number, vy: number) =>
  `${fxToPixels(vx).toFixed(2)}, ${fxToPixels(vz).toFixed(2)}, ${fxToPixels(vy).toFixed(2)} px/f`;

/** Refreshes the Lab's per-player panels from the session and this frame's inputs. */
export function refreshPlayers(session: GameSession, lab: LabState, steps: FrameInput[][]): void {
  const prev = lab.players.value;
  const next: PlayerView[] = [0, 1].map((slot) => {
    const ctx = promptContext(session, lab, slot);
    const hero = heroOf(session.world, slot);
    const slotState = session.devices.slots[slot]!;
    let history: HistoryEntry[] = prev[slot]?.history ?? [];
    // A rebinding, device or layout change re-resolves the whole visible history.
    const keyOf = (ps: Prompt[]) => (ps.length === 0 ? '·' : ps.map(promptText).join('+'));
    steps.forEach((frameInputs, i) => {
      const input = frameInputs[slot];
      if (!input) return;
      const prompts = inputPrompts(ctx, input);
      const key = keyOf(prompts);
      if (history[0]?.key === key) return;
      const frame = session.world.frame - steps.length + i + 1;
      history = [{ frame, prompts, key }, ...history].slice(0, HISTORY_LENGTH);
    });
    const buffered = hero && hero.bufAction ? (ACTION_BY_BIT.get(hero.bufAction) ?? '?') : '—';
    const target = hero && hero.targetId ? `dummy ${hero.targetId - 100}` : '—';
    return {
      slot,
      joined: slotState.joined,
      device: deviceLabel(session, slot),
      waiting: slotState.waiting,
      state: hero
        ? `${STATE_NAMES[hero.state]} ${hero.state === MoveState.Idle || hero.state === MoveState.Walk ? '' : hero.stateFrame}`.trim()
        : '—',
      speed: hero ? speed(hero.vx, hero.vz, hero.vy) : '—',
      facing: hero ? (hero.facing === 1 ? 'right' : 'left') : '—',
      facingMode: session.world.playerFacing[slot] ?? 'manual',
      target,
      buffered,
      ctx,
      history,
    };
  });
  // Only publish when something visible changed, so Preact does not re-render every frame.
  const signature = JSON.stringify(
    next.map((v) => ({
      ...v,
      ctx: [v.ctx.bindings.codes, v.ctx.family, v.ctx.facing, v.ctx.labels.version],
      history: v.history.map((h) => [h.frame, h.key]),
    })),
  );
  if (signature !== lastSignature) {
    lastSignature = signature;
    lab.players.value = next;
  }
}

let lastSignature = '';

/** Held keys and pad buttons across all devices, for the keyboard-ghosting check. */
export function heldKeys(session: GameSession): string[] {
  const hub = session.devices;
  const keys = new Set([...hub.keyboardP1.held(), ...hub.keyboardP2.held()]);
  const out = [...keys].map((c) => session.labels.label(c));
  for (const pad of hub.pads.values())
    out.push(...pad.heldButtons().map((b) => `pad${pad.index}:${b}`));
  return out;
}
