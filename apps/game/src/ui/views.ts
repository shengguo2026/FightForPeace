import {
  ActionBit,
  type Fighter,
  type FrameInput,
  HEROES,
  MoveState,
  REJECT_TEXT,
  Reject,
  VerdictTo,
  fxToPixels,
  heroOf,
  phaseOf,
  stunBand,
} from '@ffp/sim';
import {
  ACTION_NAMES,
  type Prompt,
  type PromptContext,
  promptText,
  resolvePrompt,
} from '@ffp/platform';
import type { GameSession } from '../game';
import {
  HISTORY_LENGTH,
  type HistoryEntry,
  type LabState,
  type PlayerView,
  type TargetView,
} from './labState';

function stateName(state: number, attackKind: number, action = -1): string {
  if (state !== MoveState.Attack) return STATE_NAMES[state] ?? '?';
  if (action >= 0) return 'action';
  if (attackKind === ActionBit.LowAttack) return 'low attack';
  if (attackKind === ActionBit.Special) return 'special (stub)';
  if (attackKind === ActionBit.Ultimate) return 'ultimate (stub)';
  return 'attack';
}

const STATE_NAMES: Record<number, string> = {
  [MoveState.Idle]: 'idle',
  [MoveState.Walk]: 'walk',
  [MoveState.Dash]: 'dash',
  [MoveState.Air]: 'air',
  [MoveState.Attack]: 'attack',
  [MoveState.Hitstun]: 'hit-stun',
  [MoveState.Launched]: 'airborne',
  [MoveState.Down]: 'down',
  [MoveState.GetUp]: 'getting up',
  [MoveState.Landing]: 'landing recovery',
};

/** Name of a cancel destination code (action index or VerdictTo). */
function destName(f: Fighter, to: number): string {
  if (to >= 0) return HEROES[f.hero]?.actions[to]?.name ?? '?';
  if (to === VerdictTo.Jump) return 'jump';
  if (to === VerdictTo.Dash) return 'dash bridge';
  if (to === VerdictTo.Special) return 'Special';
  if (to === VerdictTo.Ultimate) return 'Ultimate';
  return 'press';
}

function verdictText(f: Fighter): string {
  if (f.verdictFrame === 0 && f.verdictTo === VerdictTo.None) return '—';
  const what = destName(f, f.verdictTo);
  return f.verdictReject === Reject.None
    ? `✓ ${what} (frame ${f.verdictFrame})`
    : `✗ ${what}: ${REJECT_TEXT[f.verdictReject]} (frame ${f.verdictFrame})`;
}

function phaseText(f: Fighter): string {
  const a = f.action >= 0 ? HEROES[f.hero]?.actions[f.action] : undefined;
  if (!a || f.state !== MoveState.Attack) return '—';
  const ph = phaseOf(a, f.stateFrame + 1);
  return `${ph.phase} ${ph.at}/${ph.of}`;
}

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
        ? `${stateName(hero.state, hero.attackKind, hero.action)} ${hero.state === MoveState.Idle || hero.state === MoveState.Walk ? '' : hero.stateFrame}`.trim()
        : '—',
      hero: HEROES[session.world.playerHero[slot] ?? 0]?.name ?? '—',
      heroId: HEROES[session.world.playerHero[slot] ?? 0]?.id ?? 'mountain',
      action:
        hero && hero.action >= 0 ? (HEROES[hero.hero]?.actions[hero.action]?.name ?? '—') : '—',
      phase: hero ? phaseText(hero) : '—',
      verdict: hero ? verdictText(hero) : '—',
      meter: hero ? hero.meter : 0,
      bridge: hero ? (hero.bridged ? 'bridged dash' : '—') : '—',
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

let followed = 0;
let lastTargetSig = '';

/** Follows the last dummy that was hit and publishes its combo context. */
export function refreshTarget(session: GameSession, lab: LabState): void {
  const dummies = session.world.bodies.filter((b) => b.team === 'enemy');
  const hitNow = dummies.find((d) => d.ctx.open && d.ctx.hits > 0 && d.id !== followed);
  const current = dummies.find((d) => d.id === followed);
  if (hitNow && !(current && current.ctx.open)) followed = hitNow.id;
  const d = dummies.find((x) => x.id === followed);
  if (!d) return;
  const prev = lab.target.value;
  const c = d.ctx;
  // When the combo ends, keep showing its final numbers until the next hit.
  const view: TargetView =
    !c.open && prev && prev.name === `Dummy ${d.id - 100}`
      ? {
          ...prev,
          open: false,
          health: `${d.health}/${d.maxHealth}`,
          reaction: stateName(d.state, 0),
        }
      : {
          name: `Dummy ${d.id - 100}`,
          open: c.open,
          health: `${d.health}/${d.maxHealth}`,
          hits: c.hits,
          damage: c.damage,
          scale: c.scale,
          stunBudget: c.stunBudget,
          stunBand: stunBand(c.stunBudget),
          meterBudget: c.meterBudget,
          juggleBudget: c.juggleBudget,
          bridge: c.bridgeUsed,
          exhausted: c.exhausted,
          reaction: stateName(d.state, 0),
          ground:
            c.groundTag === 1
              ? 'opens ground window'
              : c.groundTag === 2
                ? 'terminal knockdown'
                : '—',
        };
  const sig = JSON.stringify(view);
  if (sig !== lastTargetSig) {
    lastTargetSig = sig;
    lab.target.value = view;
  }
}
