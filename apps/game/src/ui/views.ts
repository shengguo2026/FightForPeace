import { dt, difficultyName, t, type TextId } from '../text/i18n';
import {
  ActionBit,
  type ComboContext,
  DEFENSE,
  DefEvent,
  kitOf,
  loadoutAction,
  meterPercent,
  escapeOpen,
  holdFrame,
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
  EnvEvent,
  WEAPONS,
  WeaponEvent,
  conditionOf,
  ENEMIES,
  budgetOf,
  coopIndex,
  handoffRoute,
  difficultyOf,
  profileOf,
  usage,
  CoopEvent,
  TEAM_FINISHERS,
  handoffLeft,
  inviteLeft,
  ChannelKind,
  DIFFICULTIES,
  RunEvent,
  RunPhase,
  STAGES,
  beatOf,
  clock,
  interactionFor,
  isDowned,
  stageResults,
  CORRIDORS,
  GREENHOUSE,
  ROOMS,
  AssetState,
  ledgerGrade,
  circulating,
  RIDER_ID_BASE,
  mountedKit,
  responseRecord,
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
  COOP_EVENT_TEXT,
  TEAM_DENIED_TEXT,
  BREAKER_DENIED,
  DEFENSE_TEXT,
  GRAB_TEXT,
  VERDICT_TEXT,
  moveInputText,
} from '../text/en';
import {
  type DefenseView,
  type GrabPlayerView,
  HISTORY_LENGTH,
  type HistoryEntry,
  type LabState,
  type PlayerView,
  type RecipePlayerView,
  type TargetView,
  type WeaponPanelView,
  type StageHudView,
  type StagePrompt,
  type ResultsView,
} from './labState';

function stateName(state: number, attackKind: number, action = -1): string {
  if (state !== MoveState.Attack) return STATE_NAMES[state] ?? '?';
  if (action >= 0) return 'action';
  if (attackKind === ActionBit.LowAttack) return 'low attack';
  return 'attack';
}

/** State name of a fighter, naming the category of the running action. */
function fighterState(f: Fighter): string {
  if (f.state !== MoveState.Attack || f.action < 0)
    return stateName(f.state, f.attackKind, f.action);
  const a = kitOf(f)?.actions[f.action];
  return a ? (CATEGORY_NAMES[a.category] ?? 'action') : 'action';
}

const CATEGORY_NAMES: Record<string, string> = {
  special: 'Special',
  ultimate: 'ULTIMATE',
  grab: 'grab attempt',
  grabStrike: 'grab strike',
  throw: 'throw',
};

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
  [MoveState.Grabbing]: 'holding a grab',
  [MoveState.Grabbed]: 'grabbed',
  [MoveState.Restrained]: 'RESTRAINED',
  [MoveState.Flee]: 'fleeing',
  [MoveState.Surrender]: 'surrendered',
  [MoveState.Defeated]: 'defeated',
  [MoveState.PhaseShift]: 'phase change',
  [MoveState.Channel]: 'holding Interact',
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
  if (to === VerdictTo.Grab) return 'grab';
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
        ? `${fighterState(hero)} ${hero.state === MoveState.Idle || hero.state === MoveState.Walk ? '' : hero.stateFrame}`.trim()
        : '—',
      hero: HEROES[session.world.playerHero[slot] ?? 0]?.name ?? '—',
      heroId: HEROES[session.world.playerHero[slot] ?? 0]?.id ?? 'mountain',
      action: hero && hero.action >= 0 ? (kitOf(hero)?.actions[hero.action]?.name ?? '—') : '—',
      phase: hero ? phaseText(hero) : '—',
      verdict: hero ? verdictText(hero) : '—',
      meter: hero ? meterPercent(hero) : 0,
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

const grabLogs = new Map<number, GrabPlayerView['log']>();
const seenGrab = new Map<number, string>();
let lastGrabSig = '';

/** The Lab text for a hero's last grab outcome. */
export function grabText(f: Fighter, window = 0): string {
  const t = GRAB_TEXT[f.grabEvent];
  if (!t) return '';
  return t.replace('{o}', String(f.grabOffset)).replace('{w}', String(window));
}

const GOOD_GRAB = new Set([1, 4, 5, 6, 9, 14, 16, 18, 19]);

/** Names in each Special and Ultimate slot of a fighter (neutral, forward, backward, up, down). */
function slotNames(f: Fighter, kind: 'special' | 'ultimate'): string[] {
  return [0, 1, 2, 3, 4].map((dir) => {
    const i = loadoutAction(f, kind, dir);
    return i >= 0 ? (kitOf(f)?.actions[i]?.name ?? '?') : '—';
  });
}

/** F9: each joined hero's grab state, Grab escape window and loadout. */
export function refreshGrab(session: GameSession, lab: LabState): void {
  const world = session.world;
  const views: GrabPlayerView[] = [];
  for (const slot of [0, 1]) {
    const f = heroOf(world, slot);
    if (!f) continue;
    const grabber = f.grabbedBy ? world.bodies.find((b) => b.id === f.grabbedBy) : undefined;
    const ga = grabber && grabber.action >= 0 ? kitOf(grabber)?.actions[grabber.action] : undefined;
    const window = ga?.grab?.escapeWindow ?? 0;
    let log = grabLogs.get(slot) ?? [];
    const key = `${f.grabEvent}/${f.grabFrame}`;
    if (f.grabEvent !== 0 && seenGrab.get(slot) !== key) {
      seenGrab.set(slot, key);
      log = [
        {
          frame: f.grabFrame,
          text: grabText(f, window || lastWindow),
          good: GOOD_GRAB.has(f.grabEvent),
        },
        ...log,
      ].slice(0, 8);
    }
    if (window) lastWindow = window;
    grabLogs.set(slot, log);
    let hold = '—';
    if (f.state === MoveState.Grabbing) {
      const left = f.stun - holdFrame(world, f);
      hold = `holding · ${Math.max(0, left)} f to choose`;
    } else if (f.state === MoveState.Grabbed && grabber && ga?.grab) {
      const h = holdFrame(world, grabber);
      const from = ga.grab.escapeFrom;
      hold = escapeOpen(world, f)
        ? `held by ${ga.name} · ESCAPE open (${from + ga.grab.escapeWindow - h} f left)`
        : h < from
          ? `held by ${ga.name} · escape window in ${from - h} f`
          : `held by ${ga.name} · window passed`;
      if (f.escapeTried) hold += ' · attempt used';
    } else if (f.state === MoveState.Grabbed) hold = 'held';
    else if (f.state === MoveState.Restrained)
      hold = `restrained · ${Math.max(0, f.stun - f.stateFrame)} f left`;
    views.push({
      slot,
      state: fighterState(f),
      hold,
      escape: escapeOpen(world, f),
      log,
      specials: slotNames(f, 'special'),
      ultimates: slotNames(f, 'ultimate'),
      meter: meterPercent(f),
    });
  }
  const sig = JSON.stringify(views);
  if (sig !== lastGrabSig) {
    lastGrabSig = sig;
    lab.grab.value = views;
  }
}

let lastWindow = 0;

const WEAPON_TEXT: Record<number, { text: string; good: boolean }> = {
  [WeaponEvent.Pickup]: { text: 'picked up', good: true },
  [WeaponEvent.Throw]: { text: 'threw it', good: true },
  [WeaponEvent.Break]: { text: 'weapon broke', good: false },
  [WeaponEvent.Disarmed]: { text: 'disarmed: reclaim it within 45 f of it landing', good: false },
  [WeaponEvent.Disarm]: { text: 'disarmed the target', good: true },
  [WeaponEvent.Clash]: { text: 'clash', good: true },
  [WeaponEvent.Reclaim]: { text: 'reclaimed (Short Reclaim Priority)', good: true },
  [WeaponEvent.Contested]: { text: 'pickup contested: the other fighter was closer', good: false },
  [WeaponEvent.Deflect]: { text: 'exact block deflected the thrown weapon', good: true },
  [WeaponEvent.Return]: { text: 'counter returned the thrown weapon', good: true },
  [WeaponEvent.Blocked]: { text: 'guarded the thrown weapon', good: true },
  [WeaponEvent.Discard]: { text: 'dropped it', good: true },
  [WeaponEvent.StruckAside]: { text: 'struck the thrown weapon aside', good: true },
};
const ITEM_STATE = ['on the floor', 'held', 'flying', 'settling', 'gone'];
const BREAK_STATE = ['intact', 'loosened', 'critical', 'broken'];
const HAZARD_PHASE = ['at rest', 'WARNING', 'ACTIVE'];
const CONDITION = ['Ready', 'Worn', 'Critical'];
const weaponLogs = new Map<number, { frame: number; text: string; good: boolean }[]>();
const seenWeapon = new Map<number, string>();

function envText(world: GameSession['world']): string {
  const l = world.environment.log;
  switch (l.kind) {
    case EnvEvent.Impact:
      return `frame ${l.frame}: IMPACT on the pillar, ${l.damage} damage (${l.detail === 1 ? 'wall rebound' : 'terminal slam'}); one per combo`;
    case EnvEvent.Separation:
      return `frame ${l.frame}: pillar contact, separation only (allowance spent, too slow or not eligible)`;
    case EnvEvent.Break:
      return `frame ${l.frame}: boards took ${l.damage} break power → ${BREAK_STATE[l.detail]}`;
    case EnvEvent.Fragment:
      return `frame ${l.frame}: a timber board fell out (a usable weapon)`;
    case EnvEvent.Corrected:
      return `frame ${l.frame}: landing corrected to ${l.detail === 1 ? 'its spawn spot' : 'the nearest legal spot'}`;
    case EnvEvent.HazardHit:
      return `frame ${l.frame}: the cog hit for ${l.damage}; 120 f hazard safety`;
    case EnvEvent.HazardGuard:
      return `frame ${l.frame}: guarded the cog`;
    default:
      return 'no environment event yet';
  }
}

/** F10: what each hero holds, every item on stage and the scenery's state. */
export function refreshWeapons(session: GameSession, lab: LabState): void {
  if (!lab.weaponOpen.value) return;
  const world = session.world;
  const players: WeaponPanelView['players'] = [];
  for (const slot of [0, 1]) {
    const f = heroOf(world, slot);
    if (!f) continue;
    const item = world.items.find((i) => i.id === f.item);
    const def = item ? WEAPONS[item.def] : undefined;
    const holding =
      item && def
        ? `${def.name} · ${CONDITION[conditionOf(def, item.integrity)]} ${item.integrity}/${def.integrity.max}${def.ammo > 0 ? ` · ammo ${item.ammo}/${def.ammo}` : ''}${def.hands === 2 ? ' · two-handed: Specials and Ultimates locked' : ''}`
        : 'empty hands · Interact next to a weapon picks it up';
    let log = weaponLogs.get(slot) ?? [];
    const key = `${f.weaponEvent}/${f.weaponFrame}`;
    const t = WEAPON_TEXT[f.weaponEvent];
    if (t && seenWeapon.get(slot) !== key) {
      seenWeapon.set(slot, key);
      log = [{ frame: f.weaponFrame, ...t }, ...log].slice(0, 8);
    }
    weaponLogs.set(slot, log);
    players.push({ slot, holding, log });
  }
  const items = world.items.map((i) => {
    const def = WEAPONS[i.def]!;
    const who = i.holder
      ? ` by ${i.holder < 100 ? `P${i.holder}` : `Dummy ${i.holder - 100}`}`
      : '';
    const reserved =
      i.reserveFor && world.frame < i.reserveUntil
        ? ` · reserved for ${i.reserveFor < 100 ? `P${i.reserveFor}` : `Dummy ${i.reserveFor - 100}`} ${i.reserveUntil - world.frame} f`
        : '';
    return `${def.name}: ${ITEM_STATE[i.state]}${who} · ${i.integrity}/${def.integrity.max}${reserved}`;
  });
  const env = world.environment;
  const scenery = [
    ...env.surfaces.map(
      (s) => `Stone pillar: ${s.cracked ? 'cracked' : 'intact'} · ${s.impacts} impacts`,
    ),
    ...env.breakables.map(
      (b) => `Sluice boards: ${BREAK_STATE[b.state]} · ${b.power}/${b.thresholds[2]} break power`,
    ),
    ...env.hazards.map((h) => {
      const left = (h.phase === 0 ? h.rest : h.phase === 1 ? h.warn : h.active) - h.phaseFrame;
      return `Mill cog: ${HAZARD_PHASE[h.phase]} · ${left} f · ${h.damage} damage`;
    }),
  ];
  lab.weapons.value = { players, items, scenery, lastEvent: envText(world) };
}

const AI_MODE = [
  'idle',
  'approach',
  'hold',
  'flank',
  'kite',
  'warning',
  'group',
  'weapon',
  'objective',
  'enter',
];

/** M7 arena panel: budget used / total, pressure per hero, the director's last verdict. */
const HOLD_TEXT: Partial<Record<number, TextId>> = {
  [ChannelKind.Worker]: 'prompt.holdWorker',
  [ChannelKind.Revive]: 'prompt.holdRevive',
  [ChannelKind.Clue]: 'prompt.holdClue',
  [ChannelKind.Evidence]: 'prompt.holdEvidence',
};
const holdText = (kind: number) => {
  const k = HOLD_TEXT[kind];
  return k ? t(k) : '';
};
/** Frames a clue or the evidence text stays on screen; frames a notice stays. */
const STORY_FRAMES = 600;
const NOTICE_FRAMES = 150;
/** The results screen opens this long after the evidence is secured. */
export const RESULTS_DELAY = 150;

/** M9: the stage's interaction prompts, story text, notices and the results screen. */
export function refreshStage(session: GameSession, lab: LabState): void {
  const world = session.world;
  const run = world.run;
  if (!run) {
    if (lab.stage.value.active)
      lab.stage.value = { active: false, prompts: [], story: '', notice: '' };
    if (lab.results.value) lab.results.value = null;
    return;
  }
  const beat = beatOf(world)!;
  const prompts: StagePrompt[] = [];
  for (const slot of [0, 1]) {
    const h = heroOf(world, slot);
    if (!h || run.phase === RunPhase.Complete) continue;
    if (isDowned(h)) {
      if (world.bodies.some((b) => b.team === 'hero' && b !== h && !b.ko))
        prompts.push({ slot, text: t('prompt.downedWait'), progress: -1 });
      continue;
    }
    const c = run.channel[slot];
    if (h.state === MoveState.Channel && c && c.kind !== ChannelKind.None) {
      prompts.push({
        slot,
        text: holdText(c.kind),
        progress: c.progress / Math.max(1, c.need),
      });
      continue;
    }
    const kind = interactionFor(world, h);
    if (kind !== ChannelKind.None) prompts.push({ slot, text: holdText(kind), progress: -1 });
  }
  const e = run.event;
  const age = world.frame - e.frame;
  let story = '';
  const beatKey = `stage.${STAGES[run.stage]!.id}.beat.${beat.id}`;
  if (e.kind === RunEvent.Clue && age < STORY_FRAMES && beat.clue)
    story = dt(`${beatKey}.clue`, beat.clue.text);
  if (e.kind === RunEvent.Complete && beat.evidence)
    story = dt(`${beatKey}.evidence`, beat.evidence.text);
  const notices: Partial<Record<number, string>> = {
    [RunEvent.Checkpoint]: t('run.checkpoint'),
    [RunEvent.WorkerFreed]: t('run.workerFreed'),
    [RunEvent.CacheOpen]: t('run.cacheOpen'),
    [RunEvent.ContinueUsed]: t('run.continued'),
    [RunEvent.StageRestart]: t('run.restarted'),
    [RunEvent.ExitOpen]: t('run.exitOpen'),
    [RunEvent.Revived]: t('run.revived', { n: e.detail + 1 }),
    [RunEvent.Rejoined]: t('run.rejoined', { n: e.detail + 1 }),
    [RunEvent.Downed]: t('run.downed', { n: e.detail + 1 }),
  };
  const notice = age < NOTICE_FRAMES ? (notices[e.kind] ?? '') : '';
  const next: StageHudView = { active: true, prompts, story, notice };
  const prev = lab.stage.value;
  if (JSON.stringify(prev) !== JSON.stringify(next)) lab.stage.value = next;
  const done = run.phase === RunPhase.Complete && world.frame - run.phaseFrame >= RESULTS_DELAY;
  if (!done) {
    if (lab.results.value) lab.results.value = null;
    return;
  }
  if (lab.results.value) return;
  const r = stageResults(world)!;
  const st = r.stats;
  const view: ResultsView = {
    title: t('run.resultsTitle'),
    difficulty:
      difficultyName(DIFFICULTIES[r.difficulty]?.id ?? '') +
      (r.startBeat > 0 ? ` · ${t('run.practice', { n: r.startBeat + 1 })}` : ''),
    startBeat: r.startBeat,
    grades: r.grades.map((g) => ({
      label: dt(`grade.${g.id}`, g.id),
      value: g.value,
      grade: g.grade,
    })),
    overall: r.overall,
    points: r.points,
    capped: r.capped ? dt(`grade.${r.capped}`, r.capped) : null,
    score: r.score,
    standard: r.standard,
    cheatAssisted: r.cheatAssisted,
    cheatCodes: r.cheatCodes,
    lines: [
      t('results.line1', { time: clock(st.frames), n: r.continuesUsed }),
      t('results.line2', { defeated: st.defeated, surrendered: st.surrendered, fled: st.fled }),
      t('results.line3', { damage: st.damageTaken, food: st.food }),
      t('results.line4', { downs: st.downs, revives: st.revives }),
      t('run.sponsorHook'),
    ],
  };
  lab.results.value = view;
}

/** M9 Arena panel lines for a stage run: beat, phase, locks, continues and checkpoint. */
function stageLines(session: GameSession): string[] {
  const world = session.world;
  const run = world.run;
  if (!run) return [];
  const def = STAGES[run.stage]!;
  const beat = def.beats[run.beat]!;
  const phase = ['walking', 'camera lock', 'transition', 'defeated', 'complete'][run.phase] ?? '?';
  const cp = run.checkpoint ? `beat ${run.checkpoint.beat + 1}` : 'none';
  return [
    `${def.name} · beat ${run.beat + 1}/${def.beats.length} ${beat.name} · ${phase}`,
    `locks ${run.locksDone}/${beat.locks.length} · continues ${run.continues} (used ${run.continuesUsed}) · checkpoint ${cp}`,
    `workers ${run.stats.workersFreed}/${run.workersTotal} · clues ${run.stats.clues + run.stats.evidence}/${run.cluesTotal} · time ${clock(run.stats.frames)}`,
  ];
}

const RIDER_STATE_TEXT = ['riding', 'action', 'skid', 'down: rescue window', 'out', 'dismounted'];
const ENEMY_STATE_TEXT = [
  'entering (warned)',
  'approach',
  'wind-up',
  'strike',
  'recovery',
  'cutoff',
  'brake-fade',
  'crash',
  'dismounted',
  'breakaway',
];

/** M17 Arena panel lines for a mounted pursuit: riders, Road Riders and the record. */
function pursuitLines(session: GameSession): string[] {
  const p = session.world.pursuit!;
  const c = CORRIDORS[p.corridor]!;
  const r = p.record;
  const pct = (x: number) => Math.round((100 * (x - c.start)) / (c.finish - c.start));
  const riders = p.riders.map((x) => {
    const f = heroOf(session.world, x.slot);
    const kit = f ? mountedKit(f.hero) : [];
    const act = x.action >= 0 ? ` · ${kit[x.action]?.name ?? ''}` : '';
    return `P${x.slot + 1} ${RIDER_STATE_TEXT[x.state] ?? '?'}${act} · ${pct(x.x)}% · Stability ${x.stability}${x.critical ? ' CRITICAL' : ''} · speed ${(x.speed / 256).toFixed(1)}`;
  });
  const enemies = p.enemies.map(
    (e) =>
      `Road Rider ${e.id - RIDER_ID_BASE + 1}: ${ENEMY_STATE_TEXT[e.state] ?? '?'} · Stability ${e.stability}/${e.maxStability}${e.critical ? ' CRITICAL' : ''} · Health ${e.health}${e.target >= 0 ? ` · on P${e.target + 1}` : e.equipment >= 0 ? ' · on equipment' : ''}`,
  );
  const rec = responseRecord(p);
  const phase = ['riding', 'braking at the gate', 'complete'][p.phase] ?? '?';
  return [
    `${c.name} · ${phase} · gate ${p.checkpoint + 1}/${c.checkpoints.length} · time ${clock(r.frames)}${p.assist ? ' · steering assistance' : ''}`,
    ...riders,
    `impacts ${r.impacts} · crashes ${r.crashes} · rewinds ${r.rewinds} · rescues ${r.rescues}/${r.rescueChances} · dismounted ${r.dismounted} · broke away ${r.brokeAway} · equipment lost ${r.equipmentLost} · saves ${r.saves} · intercepts ${r.intercepts}`,
    `record ${rec.lines.map((l) => `${l.id} ${l.grade}`).join(' · ')} · mastery ${rec.mastery ? 'yes' : 'no'}`,
    ...enemies.slice(0, 6),
  ];
}

const ASSET_STATE_TEXT = ['sound', 'damaged', 'critical', 'safe fallback', 'lost'];

/** M18 Arena panel lines for a greenhouse room: the Ledger, the room's systems and the record. */
function greenhouseLines(session: GameSession): string[] {
  const gh = session.world.greenhouse;
  if (!gh) return [];
  const room = ROOMS[gh.room]!;
  const G = GREENHOUSE!;
  const grade = ledgerGrade(gh);
  const r = gh.record;
  const assets = gh.assets.map(
    (a) =>
      `${a.name} ${a.condition}/${G.ledger[a.kind]!.condition} ${ASSET_STATE_TEXT[a.state] ?? '?'}`,
  );
  const lost = gh.assets.filter((a) => a.state === AssetState.Lost).length;
  return [
    `${room.name} · Ledger ${grade.name} ${grade.score}% · circulation ${circulating(gh) ? 'on' : 'off'} · lost ${lost}`,
    assets.join(' · '),
    `opened ${r.opened} · broken ${r.broken} · eaten ${r.eaten} · repairs ${r.repairs} (+${r.repaired}) · asset hits ${r.assetHits} (-${r.damage}) · fallbacks ${r.fallbacks}`,
    `rack topples ${r.topples} · righted ${r.rights} · fits ${r.fits} · purges ${r.purges} · redirects ${r.redirects} (co-op ${r.coopRedirects}) · lashes ${r.lashes} · grenades: blasts ${r.blasts} secured ${r.secured} returned ${r.returned}`,
  ];
}

export function refreshArena(session: GameSession, lab: LabState): void {
  const world = session.world;
  if (lab.riding.value !== (world.pursuit !== null)) lab.riding.value = world.pursuit !== null;
  if (world.pursuit) {
    if (!lab.visible.value && lab.arena.value.running) return;
    const lines = pursuitLines(session);
    const prev = lab.arena.value;
    if (!(prev.running && prev.lines.join('|') === lines.join('|')))
      lab.arena.value = { running: true, lines };
    return;
  }
  const enc = world.encounter;
  if (!enc) {
    if (lab.arena.value.running || lab.arena.value.lines.length === 0)
      lab.arena.value = { running: false, lines: ['Lab mode: pick an arena and press Start.'] };
    return;
  }
  if (!lab.visible.value && lab.arena.value.running) return;
  const d = difficultyOf(world);
  const u = usage(world);
  const heroes = [0, 1].flatMap((slot) => {
    const h = heroOf(world, slot);
    return h ? [`P${slot + 1} pressure ${u.pressure.get(h.id) ?? 0}/${d.cap}`] : [];
  });
  const l = enc.log;
  const who = world.bodies.find((b) => b.id === l.enemy);
  const verdict =
    l.frame > 0 && who
      ? `last: ${ENEMIES[who.hero]?.name ?? '?'} ${routeAction(l.code)?.name ?? ''} → ${VERDICT_TEXT[l.verdict] ?? '?'} (f${l.frame})`
      : 'last: no decision yet';
  const enemies = world.bodies
    .filter((b) => b.team === 'enemy' && profileOf(b))
    .map((e) => {
      const mode = e.threat > 0 ? `commits ${e.threat}` : (AI_MODE[e.aiMode] ?? '');
      return `${ENEMIES[e.hero]?.name ?? '?'} ${e.health}/${e.maxHealth} · ${STATE_NAMES[e.state] ?? e.state} · ${mode}`;
    });
  const lines = [
    ...stageLines(session),
    ...greenhouseLines(session),
    `threat ${u.total}/${budgetOf(world)} · attackers ${u.attackers}/${d.attackers[coopIndex(world)]} · projectiles ${u.projectiles}/${d.projectiles[coopIndex(world)]} · hard CC ${u.hardCC}/${d.hardCC}`,
    heroes.join(' · '),
    `peak committed ${enc.peakCommitted} · off-screen warned ${enc.offscreenWarned} · unwarned ${enc.offscreenUnwarned}`,
    verdict,
    ...enemies.slice(0, 8),
  ];
  const prev = lab.arena.value;
  if (prev.running && prev.lines.join('|') === lines.join('|')) return;
  lab.arena.value = { running: true, lines };
}

const TARGET_STATE_TEXT = ['', 'airborne', 'stagger', 'down'];

/** M16: a reciprocal handoff names its route (Crosswind Temper, Rising Ember Relay). */
function routeText(b: Fighter): string {
  const r = handoffRoute(b);
  return r ? ` (${r.name})` : '';
}

/** M8 Co-op panel: invitation, open handoffs, the last bundle and event, telemetry. */
export function refreshCoop(session: GameSession, lab: LabState): void {
  const world = session.world;
  const c = world.coop;
  const who = (id: number) => {
    const b = world.bodies.find((x) => x.id === id);
    if (!b) return '?';
    if (b.team === 'hero') return `P${b.slot + 1}`;
    return kitOf(b)?.name ?? ENEMIES[b.hero]?.name ?? 'Dummy';
  };
  const inv = c.invite;
  const from = inv ? world.bodies.find((b) => b.id === inv.from) : undefined;
  const invite =
    inv && from
      ? {
          from: from.slot,
          to: 1 - from.slot,
          left: inviteLeft(world),
          name: TEAM_FINISHERS[inv.finisher]?.name ?? 'Team finisher',
        }
      : null;
  const handoffs = world.bodies
    .filter((b) => b.handoff > 0 && world.frame >= b.handoffAt)
    .map(
      (b) =>
        `handoff on ${who(b.id)}: ${TARGET_STATE_TEXT[b.handoff] ?? '?'}${routeText(b)} from ${who(b.handoffFrom)}, ${handoffLeft(world, b)} frames left`,
    );
  const l = c.log;
  const denied =
    l.kind === CoopEvent.Unavailable || l.kind === CoopEvent.Invalid
      ? ` (${TEAM_DENIED_TEXT[l.detail] ?? '?'})`
      : '';
  const last =
    l.frame > 0
      ? `last: ${COOP_EVENT_TEXT[l.kind] ?? '?'}${denied} · ${who(l.actor)} (f${l.frame})`
      : 'last: none yet';
  const bundle =
    c.bundleFrame > 0
      ? `last bundle: ${c.bundleHits} hits on ${who(c.bundleTarget)}, dominant ${routeAction(c.bundleDominant)?.name ?? '?'} (f${c.bundleFrame})`
      : 'last bundle: none yet';
  const lines = [
    invite
      ? `invitation: P${invite.from + 1} → P${invite.to + 1} confirm, ${invite.left} frames left`
      : 'invitation: none',
    ...(handoffs.length ? handoffs : ['handoff: none open']),
    bundle,
    last,
    `handoffs ${c.handoffs} (reciprocal ${c.reciprocal}) · team finishers ${c.finishers} · bundles ${c.bundles} · assists ${c.assists} · rescues ${c.rescues}`,
  ];
  const prev = lab.coop.value;
  const same =
    prev.lines.join('|') === lines.join('|') &&
    JSON.stringify(prev.invite) === JSON.stringify(invite);
  if (!same) lab.coop.value = { lines, invite };
}
