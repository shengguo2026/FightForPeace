import { hashWorld, heroOf, runReplay } from '@ffp/sim';
import type { GameSession } from './game';
import type { LabState } from './ui/labState';
import { setFakePads, useFakePads } from './input/browserInput';

/** Installs window.__ffp for automated tests. Called in dev and e2e builds only. */
export function installDebugHook(session: GameSession, lab: LabState): void {
  window.__ffp = {
    frame: () => session.world.frame,
    body: (id) => {
      const b = session.world.bodies.find((x) => x.id === id);
      return b ? { x: b.x, z: b.z, y: b.y, state: b.state, facing: b.facing } : undefined;
    },
    hero: (slot) => {
      const b = heroOf(session.world, slot);
      return b ? { x: b.x, z: b.z, y: b.y, state: b.state, facing: b.facing } : undefined;
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
