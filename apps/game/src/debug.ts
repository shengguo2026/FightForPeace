import { type Fighter, HEROES, hashWorld, heroOf, runReplay } from '@ffp/sim';
import type { GameSession } from './game';
import type { LabState } from './ui/labState';
import { setFakePads, useFakePads } from './input/browserInput';

/** Installs window.__ffp for automated tests. Called in dev and e2e builds only. */
export function installDebugHook(session: GameSession, lab: LabState): void {
  window.__ffp = {
    frame: () => session.world.frame,
    body: (id) => {
      const b = session.world.bodies.find((x) => x.id === id);
      return b ? view(b) : undefined;
    },
    hero: (slot) => {
      const b = heroOf(session.world, slot);
      return b ? view(b) : undefined;
    },
    place: (slot, dx, dz) => {
      const h = heroOf(session.world, slot);
      const d = session.world.bodies.find((b) => b.team === 'enemy');
      if (!h || !d) return;
      h.x = d.x + dx * 256;
      h.z = d.z + dz * 256;
      h.facing = dx < 0 ? 1 : -1;
    },
    hash: () => hashWorld(session.world),
    runReplay: (log) => runReplay(log),
    fakePads: (pads) => {
      useFakePads(true);
      setFakePads(pads);
    },
    paused: () => lab.paused.value,
    slots: () => session.devices.slots.map((s) => ({ ...s })),
  };
}

function view(b: Fighter) {
  return {
    x: b.x,
    z: b.z,
    y: b.y,
    state: b.state,
    facing: b.facing,
    attackKind: b.attackKind,
    action: b.action >= 0 ? (HEROES[b.hero]?.actions[b.action]?.id ?? null) : null,
    category: b.action >= 0 ? (HEROES[b.hero]?.actions[b.action]?.category ?? null) : null,
    stateFrame: b.stateFrame,
    hero: HEROES[b.hero]?.id ?? null,
    meter: b.meter,
    health: b.health,
    combo: { open: b.ctx.open, hits: b.ctx.hits, damage: b.ctx.damage, scale: b.ctx.scale },
  };
}
