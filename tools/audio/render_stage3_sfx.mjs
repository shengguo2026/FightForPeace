#!/usr/bin/env node
/**
 * Writes every Stage 3 sound (made in code, packages/platform/src/media/stage3sfx.ts) to
 * a 16-bit mono WAV file so the sounds can be heard and checked outside the game.
 *
 * Usage (from the repository root, Node 24 or newer):
 *
 *     node tools/audio/render_stage3_sfx.mjs [out-folder]
 *
 * The default folder is `out/stage3-sfx` (not committed). Files are named
 * `<group>/<id>.wav`, plus `index.csv` with id, group, mixer category, length and use.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  SFX3_RATE,
  STAGE3_SFX,
  renderStage3Sfx,
} from '../../packages/platform/src/media/stage3sfx.ts';

const out = resolve(process.argv[2] ?? 'out/stage3-sfx');

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SFX3_RATE, 24);
  h.writeUInt32LE(SFX3_RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const rows = ['id,group,category,ms,use'];
for (const d of STAGE3_SFX) {
  const dir = join(out, d.group);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${d.id}.wav`), wav(renderStage3Sfx(d.id)));
  rows.push([d.id, d.group, d.category, d.ms, `"${d.use.replaceAll('"', '""')}"`].join(','));
}
writeFileSync(join(out, 'index.csv'), rows.join('\n') + '\n');
console.log(`${STAGE3_SFX.length} Stage 3 sounds written to ${out}`);
