import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  REPLAY_FORMAT,
  RULES_VERSION,
  type ReplayLog,
  createWorld,
  hashWorld,
  step,
} from '@ffp/sim';
import { SCRIPTS } from './scripts';

/**
 * Re-records the golden replays from scripts.ts. Runs only with RECORD=1:
 *   RECORD=1 pnpm vitest run tests/replays/record.test.ts
 * Do this only together with a RULES_VERSION bump.
 */
test.runIf(process.env.RECORD === '1')('record golden replays', () => {
  for (const s of SCRIPTS) {
    const world = createWorld(s.seed, s.options);
    for (const f of s.frames) step(world, f);
    const log: ReplayLog = {
      version: REPLAY_FORMAT as 2,
      rulesVersion: RULES_VERSION,
      seed: s.seed,
      ...(s.options ? { options: s.options } : {}),
      frames: s.frames,
      expectedHash: hashWorld(world),
    };
    const rows = log.frames.map((f) => `    ${JSON.stringify(f)}`).join(',\n');
    const head: Partial<ReplayLog> = { ...log };
    delete head.frames;
    const headJson = JSON.stringify(head, null, 2).replace(/\n}$/, '');
    const out = `${headJson},\n  "frames": [\n${rows}\n  ]\n}\n`;
    writeFileSync(fileURLToPath(new URL(`./${s.name}.json`, import.meta.url)), out);
  }
});
