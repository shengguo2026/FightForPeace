import { RULES_VERSION, STATE_FORMAT, cheatRegistryHash, rulesHash } from '@ffp/sim';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import manifest from '../../packages/platform/src/assets/manifest.json';
import { NET_PROTOCOL, contentHash } from '../../packages/platform/src/net/protocol';

/**
 * M23 release manifest (Stage 2 spec §18, "Release package"): what a release of this
 * version is made of, in one file shipped inside the zip (tools/release.mjs). The game,
 * rules, protocol, state-format and cheat-registry versions; the rules and content hashes
 * Wi-Fi peers compare; every golden replay's hash; and the provenance of each approved
 * art, clip and music file (the source in the Pictures repository it was imported from,
 * docs/art/stage2/approved-variants.md). `RECORD=1` rewrites it; otherwise any change that
 * is not recorded here fails, so a release never ships with an unrecorded rules or content
 * change.
 */
const REPO = resolve(__dirname, '../..');
const FILE = join(REPO, 'docs/release-manifest.json');

function build() {
  const replays = join(REPO, 'tests/replays');
  const golden: Record<string, number> = {};
  for (const f of readdirSync(replays).sort())
    if (f.endsWith('.json'))
      golden[f.replace(/\.json$/, '')] = (
        JSON.parse(readFileSync(join(replays, f), 'utf8')) as { expectedHash: number }
      ).expectedHash;
  const provenance: Record<string, string> = {};
  const assets = (manifest as { assets: Record<string, { provenance?: { source?: string } }> })
    .assets;
  for (const id of Object.keys(assets).sort()) {
    const source = assets[id]!.provenance?.source;
    if (source) provenance[id] = source;
  }
  const { version } = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as {
    version: string;
  };
  return {
    game: version,
    rulesVersion: RULES_VERSION,
    stateFormat: STATE_FORMAT,
    netProtocol: NET_PROTOCOL,
    rulesHash: rulesHash(),
    contentHash: contentHash(),
    cheatRegistryHash: cheatRegistryHash(),
    goldenReplays: golden,
    acceptance: 'docs/review/09-stage2-acceptance.md',
    provenanceFrom: 'docs/art/stage2/approved-variants.md',
    provenance,
  };
}

describe('release manifest', () => {
  test('docs/release-manifest.json matches this build (RECORD=1 rewrites it)', () => {
    const now = build();
    if (process.env.RECORD)
      writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(now);
  });

  test('every golden replay was recorded under the current rules', () => {
    for (const f of readdirSync(join(REPO, 'tests/replays')))
      if (f.endsWith('.json'))
        expect(
          (
            JSON.parse(readFileSync(join(REPO, 'tests/replays', f), 'utf8')) as {
              rulesVersion: string;
            }
          ).rulesVersion,
          f,
        ).toBe(RULES_VERSION);
  });

  test('every approved Stage 2 file has its source recorded', () => {
    const ids = Object.keys(build().provenance);
    expect(ids.some((i) => i.startsWith('cine.stage2.'))).toBe(true);
    expect(ids.some((i) => i.startsWith('mus.stage2.'))).toBe(true);
    expect(ids.some((i) => i.startsWith('bg.stage2.'))).toBe(true);
  });
});
