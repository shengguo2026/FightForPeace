/**
 * M13 presentation events: one bridge from simulation snapshots to sound and effects.
 * The tracker compares each snapshot with what it saw before and emits events with
 * stable ids (frame, kind, fighter), so a repeated or re-simulated frame never plays the
 * same feedback twice (spec §18.2). It only reads snapshots; it never changes them.
 */
import {
  CoopEvent,
  DefEvent,
  type Fighter,
  GrabEvent,
  MoveState,
  RunEvent,
  type CoopState,
  type StageRun,
  fxToPixels,
  kitOf,
  routeAction,
} from '@ffp/sim';
import { type Tier, tierOfAction } from './spectacle';

export type PresentationEvent =
  | {
      id: string;
      kind: 'hit';
      target: number;
      x: number;
      y: number;
      tier: Tier;
      own: boolean;
      damage: number;
    }
  | {
      id: string;
      kind: 'defense';
      what: 'guard' | 'exact' | 'counter' | 'breaker' | 'crush' | 'armor';
      fighter: number;
      x: number;
      y: number;
    }
  | {
      id: string;
      kind: 'grab';
      what: 'throw' | 'escape' | 'rescue' | 'grabbed';
      fighter: number;
      x: number;
      y: number;
    }
  | {
      id: string;
      kind: 'dash' | 'land' | 'knockdown';
      fighter: number;
      x: number;
      y: number;
      own: boolean;
    }
  | { id: string; kind: 'ultimate'; fighter: number; hero: string; x: number; y: number }
  | { id: string; kind: 'team'; move: string; x: number; y: number }
  | { id: string; kind: 'bossPhase'; phase: number; x: number; y: number }
  | { id: string; kind: 'run'; event: number; detail: number };

export interface EventSnapshot {
  frame: number;
  fighters: readonly Fighter[];
  run: StageRun | null;
  coop: CoopState;
  /** Boss phase (−1: no boss) and its fighter id. */
  bossPhase: number;
  bossId: number;
  /** A new world (restart, arena change): forget everything. */
  generation: number;
}

interface Seen {
  hits: number;
  open: boolean;
  def: string;
  grab: string;
  state: number;
  action: number;
}

const DEF_WHAT: Partial<
  Record<number, 'guard' | 'exact' | 'counter' | 'breaker' | 'crush' | 'armor'>
> = {
  [DefEvent.Exact]: 'exact',
  [DefEvent.ExactBreak]: 'exact',
  [DefEvent.Counter]: 'counter',
  [DefEvent.GuardCrush]: 'crush',
  [DefEvent.Breaker]: 'breaker',
  [DefEvent.Armored]: 'armor',
};
const GRAB_WHAT: Partial<Record<number, 'throw' | 'escape' | 'rescue' | 'grabbed'>> = {
  [GrabEvent.Throw]: 'throw',
  [GrabEvent.Escape]: 'escape',
  [GrabEvent.Rescued]: 'rescue',
  [GrabEvent.RescuedPartner]: 'rescue',
  [GrabEvent.Hold]: 'grabbed',
};

export class PresentationTracker {
  private seen = new Map<number, Seen>();
  private emitted = new Set<string>();
  private order: string[] = [];
  private generation = -1;
  private coopKey = '';
  private runKey = '';
  private bossPhase = -1;
  private lastFrame = -1;

  update(s: EventSnapshot): PresentationEvent[] {
    if (s.generation !== this.generation) {
      this.generation = s.generation;
      this.seen.clear();
      this.bossPhase = s.bossPhase;
      this.coopKey = `${s.coop.log.kind}/${s.coop.log.frame}`;
      this.runKey = s.run ? `${s.run.event.kind}/${s.run.event.frame}` : '';
      this.prime(s.fighters);
      this.lastFrame = s.frame;
      return [];
    }
    if (s.frame === this.lastFrame) return [];
    this.lastFrame = s.frame;
    const out: PresentationEvent[] = [];
    const push = (e: PresentationEvent) => {
      if (this.emitted.has(e.id)) return;
      this.emitted.add(e.id);
      this.order.push(e.id);
      if (this.order.length > 512) this.emitted.delete(this.order.shift()!);
      out.push(e);
    };
    const byId = new Map(s.fighters.map((f) => [f.id, f]));
    for (const f of s.fighters) {
      const x = fxToPixels(f.x);
      const y = fxToPixels(f.z) - fxToPixels(f.y);
      const prev = this.seen.get(f.id);
      const now = this.record(f);
      this.seen.set(f.id, now);
      if (!prev) continue;
      const hits = f.ctx.open ? f.ctx.hits : 0;
      if (hits > (prev.open ? prev.hits : 0)) {
        const code = f.ctx.route[f.ctx.route.length - 1];
        const a = code === undefined ? undefined : routeAction(code);
        const weapon = code !== undefined && Math.trunc(code / 64) >= 1024;
        push({
          id: `${s.frame}:hit:${f.id}:${hits}`,
          kind: 'hit',
          target: f.id,
          x,
          y: y - 150,
          tier: tierOfAction(a?.category, a?.tags ?? [], weapon),
          own: f.team !== 'hero',
          damage: f.ctx.lastDamage,
        });
      }
      if (now.def !== prev.def) {
        const what = DEF_WHAT[f.defEvent];
        if (what)
          push({
            id: `${s.frame}:def:${f.id}:${now.def}`,
            kind: 'defense',
            what,
            fighter: f.id,
            x,
            y: y - 150,
          });
      }
      if (f.state === MoveState.Blockstun && prev.state !== MoveState.Blockstun)
        push({
          id: `${s.frame}:guard:${f.id}`,
          kind: 'defense',
          what: 'guard',
          fighter: f.id,
          x,
          y: y - 150,
        });
      if (now.grab !== prev.grab) {
        const what = GRAB_WHAT[f.grabEvent];
        if (what)
          push({
            id: `${s.frame}:grab:${f.id}:${now.grab}`,
            kind: 'grab',
            what,
            fighter: f.id,
            x,
            y: y - 150,
          });
      }
      const own = f.team === 'hero';
      if (f.state !== prev.state) {
        if (f.state === MoveState.Dash)
          push({ id: `${s.frame}:dash:${f.id}`, kind: 'dash', fighter: f.id, x, y, own });
        if (f.state === MoveState.Landing)
          push({ id: `${s.frame}:land:${f.id}`, kind: 'land', fighter: f.id, x, y, own });
        if (f.state === MoveState.Down)
          push({ id: `${s.frame}:down:${f.id}`, kind: 'knockdown', fighter: f.id, x, y, own });
      }
      if (f.action !== prev.action && f.action >= 0 && f.team === 'hero') {
        const a = kitOf(f)?.actions[f.action];
        // A contact-confirmed conversion continues the same Ultimate: no second burst.
        const before = prev.action >= 0 ? kitOf(f)?.actions[prev.action] : undefined;
        if (a?.category === 'ultimate' && before?.category !== 'ultimate')
          push({
            id: `${s.frame}:ult:${f.id}`,
            kind: 'ultimate',
            fighter: f.id,
            hero: kitOf(f)?.id ?? '',
            x,
            y,
          });
      }
    }
    const log = s.coop.log;
    const ck = `${log.kind}/${log.frame}`;
    if (ck !== this.coopKey) {
      this.coopKey = ck;
      if (log.kind === CoopEvent.Finisher && log.frame > 0) {
        const t = byId.get(log.target);
        const actor = byId.get(log.actor);
        const move =
          actor && actor.action >= 0 ? (kitOf(actor)?.actions[actor.action]?.id ?? '') : '';
        push({
          id: `${log.frame}:team`,
          kind: 'team',
          move,
          x: t ? fxToPixels(t.x) : 960,
          y: t ? fxToPixels(t.z) - fxToPixels(t.y) - 150 : 600,
        });
      }
    }
    if (s.bossPhase !== this.bossPhase) {
      if (s.bossPhase > this.bossPhase && this.bossPhase >= 0) {
        const b = byId.get(s.bossId);
        push({
          id: `${s.frame}:phase:${s.bossPhase}`,
          kind: 'bossPhase',
          phase: s.bossPhase,
          x: b ? fxToPixels(b.x) : 960,
          y: b ? fxToPixels(b.z) - 150 : 600,
        });
      }
      this.bossPhase = s.bossPhase;
    }
    if (s.run) {
      const e = s.run.event;
      const rk = `${e.kind}/${e.frame}`;
      if (rk !== this.runKey) {
        this.runKey = rk;
        if (e.kind !== RunEvent.None)
          push({ id: `${e.frame}:run:${e.kind}`, kind: 'run', event: e.kind, detail: e.detail });
      }
    }
    return out;
  }

  private prime(fighters: readonly Fighter[]): void {
    for (const f of fighters) this.seen.set(f.id, this.record(f));
  }

  private record(f: Fighter): Seen {
    return {
      hits: f.ctx.hits,
      open: f.ctx.open,
      def: `${f.defEvent}/${f.defFrame}`,
      grab: `${f.grabEvent}/${f.grabFrame}`,
      state: f.state,
      action: f.action,
    };
  }
}
