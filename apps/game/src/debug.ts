import { hashWorld, runReplay } from '@ffp/sim';
import type { GameSession } from './game';

/** Installs window.__ffp for automated tests. Called in dev and e2e builds only. */
export function installDebugHook(session: GameSession): void {
  window.__ffp = {
    frame: () => session.world.frame,
    body: (id) => {
      const b = session.world.bodies.find((x) => x.id === id);
      return b ? { x: b.x, z: b.z } : undefined;
    },
    hash: () => hashWorld(session.world),
    runReplay: (log) => runReplay(log),
  };
}
