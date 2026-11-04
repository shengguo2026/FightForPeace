import { COOP_DATA } from '../combat/heroes.gen';
import type { CoopActionDef, CoopDef, HandoffDef, TeamFinisherDef } from '../combat/types';
import type { CoopLog, CoopState, World } from '../world/types';
import type { ByteWriter } from '../state/encode';

/** Co-op rules from packages/data/coop/coop.yaml: tags and numbers, never hero names. */
export const COOP: CoopDef = COOP_DATA;
export const TEAM_FINISHERS: readonly TeamFinisherDef[] = COOP.finishers;

/** The one co-op action of a kind (the generator guarantees exactly one). */
export function coopAction(kind: CoopActionDef['kind']): CoopActionDef {
  return COOP.actions.find((a) => a.kind === kind)!;
}

/** Handoff state a sender action opens (its first sender tag), if any. */
export function senderHandoff(tags: readonly string[]): HandoffDef | undefined {
  return COOP.handoffs.find((h) => tags.includes(h.tag));
}

export function newCoopState(): CoopState {
  return {
    invite: null,
    log: { kind: 0, frame: 0, actor: 0, partner: 0, target: 0, detail: 0 },
    bundleFrame: 0,
    bundleTarget: 0,
    bundleHits: 0,
    bundleDominant: 0,
    handoffs: 0,
    finishers: 0,
    assists: 0,
    rescues: 0,
    bundles: 0,
  };
}

export function logCoop(
  world: World,
  kind: number,
  actor: number,
  partner = 0,
  target = 0,
  detail = 0,
): void {
  const log: CoopLog = { kind, frame: world.frame, actor, partner, target, detail };
  world.coop.log = log;
}

export function encodeCoop(w: ByteWriter, c: CoopState): void {
  const i = c.invite;
  w.u8(i ? 1 : 0);
  if (i) {
    w.u32(i.from);
    w.u32(i.target);
    w.u32(i.finisher);
    w.i32(i.at);
    w.i32(i.until);
  }
  const l = c.log;
  w.u8(l.kind);
  w.u32(l.frame);
  w.u32(l.actor);
  w.u32(l.partner);
  w.u32(l.target);
  w.i32(l.detail);
  w.u32(c.bundleFrame);
  w.u32(c.bundleTarget);
  w.u32(c.bundleHits);
  w.u32(c.bundleDominant);
  w.u32(c.handoffs);
  w.u32(c.finishers);
  w.u32(c.assists);
  w.u32(c.rescues);
  w.u32(c.bundles);
}
