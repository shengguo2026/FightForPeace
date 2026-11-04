import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HEROES } from '@ffp/sim';

/**
 * M8 guardrail: handoffs, team finishers and the co-op actions are keyed by tags. The co-op
 * code and the hit resolver never branch on a hero's id or name.
 */
test('co-op and hit code never branch on a hero name', () => {
  const sim = fileURLToPath(new URL('../../packages/sim/src/', import.meta.url));
  const files = readdirSync(sim + 'coop/').map((f) => readFileSync(sim + 'coop/' + f, 'utf8'));
  files.push(readFileSync(sim + 'combat/hits.ts', 'utf8'));
  for (const src of files) {
    for (const h of HEROES) {
      expect(src).not.toMatch(new RegExp(`['"]${h.id}['"]`));
      expect(src).not.toContain(h.name);
    }
  }
});
