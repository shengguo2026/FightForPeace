// `pnpm release`: packs the production build into release/FightForPeace-<version>.zip
// (docs/review/06 §2.6). Run after `pnpm build` (the package script does both).
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildZip } from './zip.mjs';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORTABLE = join(REPO, 'tools', 'portable');

/** Text with Windows line endings (for cmd.exe and Notepad), whatever the checkout has. */
export function crlf(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
}

/** Text with Unix line endings (a CRLF shebang line breaks start.sh). */
export function lf(text) {
  return text.replace(/\r\n/g, '\n');
}

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else out.push(full);
  }
  return out;
}

/** Zip entry name for a file under `base`: always "/" separators. */
export function entryName(prefix, base, file) {
  return `${prefix}/${relative(base, file).split(sep).join('/')}`;
}

/**
 * Assembles the release folder and zip. Returns the paths and the zip's entry names.
 * @param {{ version: string, gameDir: string, outDir: string, portableDir?: string }} o
 */
export function assemble({ version, gameDir, outDir, portableDir = PORTABLE }) {
  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error(`No built game in ${gameDir}. Run pnpm build first.`);
  }
  const name = `FightForPeace-${version}`;
  const stage = join(outDir, name);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(join(stage, 'server'), { recursive: true });
  cpSync(gameDir, join(stage, 'game'), { recursive: true });
  const read = (f) => readFileSync(join(portableDir, f), 'utf8');
  const text = {
    'start.bat': crlf(read('start.bat')),
    'start.sh': lf(read('start.sh')),
    'start.command': lf(read('start.sh')),
    'README.txt': crlf(read('README.txt')),
    'runtime.json': lf(read('runtime.json')),
    VERSION: `${version}\n`,
    'server/server.mjs': lf(read('server.mjs')),
    'server/get-node.ps1': crlf(read('get-node.ps1')),
  };
  for (const [file, body] of Object.entries(text)) writeFileSync(join(stage, file), body);
  const executable = new Set(['start.sh', 'start.command']);
  const entries = files(stage).map((f) => {
    const rel = relative(stage, f).split(sep).join('/');
    return {
      name: entryName(name, stage, f),
      data: readFileSync(f),
      mode: executable.has(rel) ? 0o755 : 0o644,
    };
  });
  const zipPath = join(outDir, `${name}.zip`);
  writeFileSync(zipPath, buildZip(entries));
  return { stage, zipPath, names: entries.map((e) => e.name) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { version } = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const { zipPath, names } = assemble({
    version,
    gameDir: join(REPO, 'apps', 'game', 'dist'),
    outDir: join(REPO, 'release'),
  });
  console.log(`Wrote ${relative(REPO, zipPath)} (${names.length} files)`);
}
