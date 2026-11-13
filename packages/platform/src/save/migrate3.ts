import { CAMPAIGN, completeStage, contentIdOf, noteStageStart } from '../progress/campaign';
import { normalizeProfile } from './schema';

/** The content key M20 Lab runs of Stage 2 were recorded under before M21 fixed its ID. */
export const PROVISIONAL_STAGE2 = 'story.stage2';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Renames object keys equal to `from` (a later key wins over a renamed one). */
function renameKey(o: unknown, from: string, to: string): void {
  if (!isObj(o) || !(from in o)) return;
  if (!(to in o)) o[to] = o[from];
  delete o[from];
}

/**
 * Save version 2 → 3 (M21). Works on the raw version 2 data and returns version 3 data:
 * - the provisional Stage 2 key becomes the stable content ID wherever it was used
 *   (mission records, stage records, one-time bonus keys, achievement progress, archive);
 * - `campaign` records the stages already completed and started (from the mission records
 *   and a saved checkpoint), so Stage 2 is open for anyone who cleared Stage 1;
 * - the reserved Museum, Dossier and research slots become their records, with the
 *   entries those completions earned (dated at the profile's last update).
 */
export function migrateToCampaign(d: Record<string, unknown>): Record<string, unknown> {
  const from = PROVISIONAL_STAGE2;
  const to = contentIdOf('stage2');
  renameKey(d.missions, from, to);
  const pr = isObj(d.progress) ? d.progress : null;
  if (pr) {
    renameKey(pr.records, from, to);
    renameKey(pr.cheatHighest, from, to);
    renameKey(pr.progress, `heroes:${from}`, `heroes:${to}`);
    if (Array.isArray(pr.claimed))
      pr.claimed = pr.claimed.map((k) =>
        typeof k === 'string' ? k.replace(/(^|:)story\.stage2(?=$|:)/, `$1${to}`) : k,
      );
  }
  if (Array.isArray(d.runArchive))
    for (const e of d.runArchive) if (isObj(e) && e.contentId === from) e.contentId = to;
  // Reserved slots of version 2 were empty objects: start the records fresh.
  delete d.museum;
  delete d.sponsorDossier;
  delete d.research;
  delete d.campaign;
  const p = normalizeProfile(d);
  const at = typeof d.updatedAt === 'number' ? d.updatedAt : 0;
  const missions = isObj(d.missions) ? d.missions : {};
  // In campaign order, so a completion opens the next stage before it is looked at.
  for (const c of CAMPAIGN) {
    const m = missions[contentIdOf(c.id)];
    if (isObj(m) && typeof m.clears === 'number' && m.clears > 0) completeStage(p, c.id, null, at);
    else if (isObj(d.checkpoint) && d.checkpoint.stage === c.id) noteStageStart(p, c.id, at);
  }
  return { ...d, ...p } as unknown as Record<string, unknown>;
}
