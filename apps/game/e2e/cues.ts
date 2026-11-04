import type { Page } from '@playwright/test';

/**
 * One scripted press: when `when` holds. It is an expression over h = hero 1, d = dummy 1
 * and since = simulation frames since the previous cue fired.
 */
export interface Cue {
  when: string;
  keys: string[];
  hold?: string[];
}

/**
 * Starts playing cues in the page. The cues run before every simulation step (not on
 * animation frames), so each press lands on an exact simulation frame however slowly the
 * browser renders: each cue waits for its condition, then presses its keys (holding `hold`
 * for four simulation frames around the press). Await `cuesDone` for the result.
 */
export async function startCues(page: Page, cues: Cue[]) {
  await page.evaluate((list) => {
    const w = window as unknown as { __cues: Promise<void> };
    w.__cues = new Promise<void>((resolve, reject) => {
      const key = (type: string, code: string) =>
        window.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
      let i = 0;
      let steps = 0;
      let last = window.__ffp!.frame();
      const releases: { at: number; keys: string[] }[] = [];
      // 'Pause' in `keys` pauses on that very step (no further simulation step runs).
      window.__ffp!.onStep(() => {
        const frame = window.__ffp!.frame();
        for (const r of releases.splice(0))
          if (frame >= r.at) for (const k of r.keys) key('keyup', k);
          else releases.push(r);
        if (i === list.length) {
          if (releases.length > 0) return false;
          resolve();
          return true;
        }
        const h = window.__ffp!.hero(0)!;
        const d = window.__ffp!.body(101)!;
        const c = list[i]!;
        if (new Function('h', 'd', 'since', `return ${c.when}`)(h, d, frame - last)) {
          last = frame;
          const held = c.hold ?? [];
          for (const k of held) key('keydown', k);
          const keys = c.keys.filter((k) => k !== 'Pause');
          for (const k of keys) key('keydown', k);
          for (const k of keys) key('keyup', k);
          if (keys.length < c.keys.length) window.__ffp!.pauseNow();
          if (held.length > 0) releases.push({ at: frame + 4, keys: held });
          i += 1;
          // Done at once when nothing is held (the last cue may have paused the game).
          if (i === list.length && releases.length === 0) {
            resolve();
            return true;
          }
        }
        if ((steps += 1) > 2400) {
          reject(new Error(`cue ${i} timed out: ${c.when}`));
          return true;
        }
        return false;
      });
    });
  }, cues);
}

export const cuesDone = (page: Page) =>
  page.evaluate(() => (window as unknown as { __cues: Promise<void> }).__cues);

export async function play(page: Page, cues: Cue[]) {
  await startCues(page, cues);
  await cuesDone(page);
}
