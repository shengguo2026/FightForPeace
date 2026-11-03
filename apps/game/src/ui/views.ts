import {
  ActionBit,
  type ComboContext,
  DEFENSE,
  DefEvent,
  kitOf,
  routeAction,
  type Fighter,
  type FrameInput,
  HEROES,
  MoveState,
  REJECT_TEXT,
  Reject,
  VerdictTo,
  fxToPixels,
  heroOf,
  Protect,
  juggleBand,
  phaseOf,
  recipeAttackSteps,
  recipeDone,
  recipeProgress,
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
import { BREAKER_DENIED, DEFENSE_TEXT, moveInputText } from '../text/en';
import {
  type DefenseView,
  HISTORY_LENGTH,
  type HistoryEntry,
  type LabState,
  type PlayerView,
  type RecipePlayerView,
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
  [MoveState.Recover]: 'protected landing',
  [MoveState.Guard]: 'guard',
  [MoveState.Blockstun]: 'block-stun',
  [MoveState.GuardCrush]: 'GUARD CRUSH',
  [MoveState.Counter]: 'counter window',
  [MoveState.CounterMiss]: 'counter missed',
  [MoveState.Breaker]: 'COMBO BREAKER',
  [MoveState.Recoil]: 'recoil',
};

const PROTECT_TEXT: Record<number, string> = {
  [Protect.GetUp]: 'protected get-up',
  [Protect.AirRecovery]: 'air recovery (juggle budget exhausted)',
  [Protect.SoftReset]: 'soft reset (hit-stun budget exhausted)',
  [Protect.MissedWindow]: 'ground window missed',
  [Protect.Breaker]: 'combo breaker',
};

function groundRouteText(d: Fighter): string {
  const c = d.ctx;
  if (!c.groundOpened) return '—';
  const window = d.groundWindow > 0 ? `window ${d.groundWindow} f` : 'window closed';
  const ext = c.groundExtUsed ? 'extension used' : 'extension available';
  const fin = c.groundFinUsed ? 'finisher used' : 'finisher available';
  return `${window} · ${ext} · ${fin}`;
}

function routeNames(route: readonly number[]): string[] {
  return route.map((code) => routeAction(code)?.name ?? '?');
}

/** Name of a cancel destination code (action index or VerdictTo). */
function destName(f: Fighter, to: number): string {
  if (to >= 0) return kitOf(f)?.actions[to]?.name ?? '?';
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
  const a = f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
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
      action: hero && hero.action >= 0 ? (kitOf(hero)?.actions[hero.action]?.name ?? '—') : '—',
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
  const c = d.ctx;
  // A closed combo keeps its final numbers (the simulation leaves them) until the next hit.
  const view: TargetView = {
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
    juggleBand: juggleBand(c.juggleBudget),
    bridge: c.bridgeUsed,
    exhausted: c.exhausted,
    reaction: stateName(d.state, 0),
    ground:
      c.groundTag === 1 ? 'opens ground window' : c.groundTag === 2 ? 'terminal knockdown' : '—',
    wallBounce: c.wallBounceUsed ? 'used' : 'available',
    groundBounce: c.groundBounceUsed ? 'used' : 'available',
    groundRoute: groundRouteText(d),
    protection: d.protectedRecovery
      ? `protected · ${PROTECT_TEXT[c.ended] ?? 'recovering'}`
      : c.open
        ? '—'
        : (PROTECT_TEXT[c.ended] ?? 'recovered'),
    route: routeNames(c.route),
  };
  const sig = JSON.stringify(view);
  if (sig !== lastTargetSig) {
    lastTargetSig = sig;
    lab.target.value = view;
  }
}

/** Combo contexts already credited per recipe, so each performance counts once. */
const credited = new WeakMap<ComboContext, Set<string>>();
const performedCounts = new Map<string, number>();
let lastRecipeSig = '';

/**
 * Academy recipes for each joined player, ticked off against the route of the dummy the
 * Lab follows. A recipe counts as performed once per combo context.
 */
export function refreshRecipes(session: GameSession, lab: LabState): void {
  const dummies = session.world.bodies.filter((b) => b.team === 'enemy');
  for (const d of dummies) {
    const seen = credited.get(d.ctx) ?? new Set<string>();
    HEROES.forEach((hero, h) => {
      for (const r of hero.recipes) {
        const key = `${hero.id}/${r.id}`;
        if (seen.has(key) || !recipeDone(r, d.ctx.route, h)) continue;
        seen.add(key);
        performedCounts.set(key, (performedCounts.get(key) ?? 0) + 1);
      }
    });
    credited.set(d.ctx, seen);
  }
  const followedDummy = dummies.find((d) => d.id === followed);
  const route = followedDummy?.ctx.route ?? [];
  const views: RecipePlayerView[] = [];
  for (const slot of [0, 1]) {
    const f = heroOf(session.world, slot);
    if (!f) continue;
    const hero = HEROES[f.hero]!;
    views.push({
      slot,
      hero: hero.name,
      recipes: hero.recipes.map((r) => {
        const progress = recipeProgress(r, route, f.hero);
        const attacks = recipeAttackSteps(r).length;
        let k = 0;
        const steps = r.steps.map((s) => {
          if (s.jump) {
            return { label: 'jump chase', jump: true, input: '{action:Jump}', done: progress > k };
          }
          const a = s.any.map((i) => hero.actions[i]!);
          k += 1;
          return {
            label: a.map((x) => x.name).join(' or '),
            jump: false,
            input: a
              .map((x, i) => {
                const t = moveInputText(x.context, x.dir);
                // Alternatives share their context: name it once.
                return i === 0 ? t : t.slice(t.indexOf(': ') + 2);
              })
              .join(' or '),
            done: k <= progress,
          };
        });
        return {
          id: r.id,
          name: r.name,
          family: r.family,
          steps,
          done: progress === attacks,
          performed: performedCounts.get(`${hero.id}/${r.id}`) ?? 0,
          counterHit: r.counterHit,
        };
      }),
    });
  }
  const sig = JSON.stringify(views);
  if (sig !== lastRecipeSig) {
    lastRecipeSig = sig;
    lab.recipes.value = views;
  }
}

const DIR_NAMES: Record<string, string> = {
  '1,0': 'right',
  '-1,0': 'left',
  '0,-1': 'up-stage',
  '0,1': 'down-stage',
  '1,-1': 'right and up',
  '1,1': 'right and down',
  '-1,-1': 'left and up',
  '-1,1': 'left and down',
};

const GOOD = new Set<number>([
  DefEvent.Guard,
  DefEvent.Exact,
  DefEvent.ExactBreak,
  DefEvent.Counter,
  DefEvent.Breaker,
]);

/** The Lab text for a hero's last defensive outcome. */
export function defenseText(f: Fighter): string {
  const t = DEFENSE_TEXT[f.defEvent];
  if (!t) return '';
  const counter =
    f.defEvent === DefEvent.Counter ||
    f.defEvent === DefEvent.CounterMiss ||
    f.defEvent === DefEvent.CounterWrongDir;
  const values: Record<string, string> = {
    o: String(f.defOffset),
    a: f.defAction >= 0 ? (routeAction(f.defAction)?.name ?? 'the attack') : 'the attack',
    w: String(counter ? DEFENSE.counterWindow : DEFENSE.exactWindow),
    reason: BREAKER_DENIED[f.defOffset] ?? '',
  };
  return t.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

const COUNT_OF: Partial<Record<number, keyof DefenseView['counts']>> = {
  [DefEvent.Guard]: 'guard',
  [DefEvent.Cooldown]: 'guard',
  [DefEvent.ExactEarly]: 'early',
  [DefEvent.Exact]: 'exact',
  [DefEvent.ExactBreak]: 'exact',
  [DefEvent.Counter]: 'counter',
  [DefEvent.GuardCrush]: 'crush',
  [DefEvent.Breaker]: 'breaker',
  [DefEvent.Hit]: 'hit',
  [DefEvent.Behind]: 'hit',
  [DefEvent.Pierced]: 'hit',
  [DefEvent.Unblockable]: 'hit',
  [DefEvent.CounterWrongDir]: 'hit',
  [DefEvent.CounterUncounterable]: 'hit',
  [DefEvent.Late]: 'late',
};

const seenDefense = new Map<number, string>();
const defenseLogs = new Map<number, DefenseView['log']>();
const defenseCounts = new Map<number, DefenseView['counts']>();
let lastDefenseSig = '';

const emptyCounts = (): DefenseView['counts'] => ({
  guard: 0,
  exact: 0,
  counter: 0,
  crush: 0,
  breaker: 0,
  hit: 0,
  early: 0,
  late: 0,
});

/** F8: each joined hero's Defense meter, guard facing and timing readouts. */
export function refreshDefense(session: GameSession, lab: LabState): void {
  const views: DefenseView[] = [];
  for (const slot of [0, 1]) {
    const f = heroOf(session.world, slot);
    if (!f) continue;
    const counts = defenseCounts.get(slot) ?? emptyCounts();
    let log = defenseLogs.get(slot) ?? [];
    const key = `${f.defEvent}/${f.defFrame}/${f.defOffset}`;
    if (f.defEvent !== DefEvent.None && seenDefense.get(slot) !== key) {
      seenDefense.set(slot, key);
      const c = COUNT_OF[f.defEvent];
      if (c) counts[c] += 1;
      // "Too late" rewrites the hit it follows: replace that line instead of adding one.
      if (f.defEvent === DefEvent.Late) {
        counts.hit = Math.max(0, counts.hit - 1);
        log = log.slice(1);
      }
      log = [{ frame: f.defFrame, text: defenseText(f), good: GOOD.has(f.defEvent) }, ...log].slice(
        0,
        8,
      );
    }
    defenseCounts.set(slot, counts);
    defenseLogs.set(slot, log);
    const pivot =
      f.pivotAt > session.world.frame ? ` · pivoting in ${f.pivotAt - session.world.frame} f` : '';
    views.push({
      slot,
      defense: f.defense,
      state: stateName(f.state, f.attackKind, f.action),
      guard:
        f.state === MoveState.Guard || f.state === MoveState.Blockstun
          ? `facing ${DIR_NAMES[`${f.guardX},${f.guardZ}`] ?? '?'}${pivot}${f.defense > 0 ? '' : ' · no Defense: Exact Block only'}`
          : '—',
      log,
      counts: { ...counts },
    });
  }
  const sig = JSON.stringify(views);
  if (sig !== lastDefenseSig) {
    lastDefenseSig = sig;
    lab.defense.value = views;
  }
}
