// `pnpm smoke:portable [zip]`: the portable build's unzip-and-start smoke test (M9).
// Unzips the release zip into a fresh temp folder whose path has a space in it, starts
// the game with the zip's own start script (start.bat on Windows, start.sh elsewhere) the
// way a player would, waits for the local server, checks the page, the game script (it
// must carry this version) and the server's id answer, then stops the server again.
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { readZip } from './zip.mjs';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const { version } = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
const zipPath = resolve(process.argv[2] ?? join(REPO, 'release', `FightForPeace-${version}.zip`));
const port = Number(process.env.FFP_SMOKE_PORT ?? 6400 + Math.floor(Math.random() * 200));
const windows = process.platform === 'win32';

function fail(message) {
  console.error(`Portable smoke test FAILED: ${message}`);
  process.exitCode = 1;
}

function unzip(file, into) {
  const zip = readFileSync(file);
  for (const e of readZip(zip)) {
    if (e.name.endsWith('/')) continue;
    const raw = zip.subarray(e.start, e.start + e.size);
    const out = join(into, ...e.name.split('/'));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, e.method === 8 ? inflateRawSync(raw) : raw);
    if (!windows) chmodSync(out, e.mode & 0o777 || 0o644);
  }
}

async function get(path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return res.text();
}

function stop(child) {
  if (child.exitCode !== null) return;
  if (windows) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

async function main() {
  if (!existsSync(zipPath)) throw new Error(`${zipPath} not found. Run pnpm release first.`);
  const tmp = mkdtempSync(join(tmpdir(), 'ffp smoke '));
  unzip(zipPath, tmp);
  const app = join(tmp, `FightForPeace-${version}`);
  for (const f of [
    'start.bat',
    'start.sh',
    'start.command',
    'README.txt',
    'THIRD-PARTY-NOTICES.txt',
  ]) {
    if (!existsSync(join(app, f))) throw new Error(`${f} is missing from the zip`);
  }
  console.log(`Unzipped to "${app}"; starting on port ${port}`);
  const args = ['--no-open', '--port', String(port)];
  const child = windows
    ? // With /s, cmd strips the outermost pair of quotes, so the quoted path (it has a space)
      // goes inside one more pair, as Explorer does when the player double-clicks start.bat.
      spawn('cmd.exe', ['/d', '/s', '/c', `""${join(app, 'start.bat')}" ${args.join(' ')}"`], {
        cwd: app,
        windowsVerbatimArguments: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : spawn(join(app, 'start.sh'), args, {
        cwd: app,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  try {
    let html = '';
    const until = Date.now() + 90_000;
    while (!html) {
      if (child.exitCode !== null) throw new Error(`the start script exited (${child.exitCode})`);
      if (Date.now() > until) throw new Error('the server did not answer within 90 s');
      try {
        html = await get('/');
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!html.includes('<title>Fight For Peace</title>')) throw new Error('/ is not the game page');
    const script = /<script[^>]+src="\.?\/?([^"]+\.js)"/.exec(html)?.[1];
    if (!script) throw new Error('the page has no game script');
    const js = await get(`/${script}`);
    if (!js.includes(version)) throw new Error(`the game script does not carry version ${version}`);
    const id = JSON.parse(await get('/__ffp/id'));
    if (id.version !== version) throw new Error(`the server reports version ${id.version}`);
    const last = readFileSync(join(app, 'logs', 'last-port.txt'), 'utf8').trim();
    if (last !== String(port)) throw new Error(`logs/last-port.txt says ${last}`);
    console.log(`Portable smoke test passed: Fight For Peace ${version} on port ${port}`);
  } catch (err) {
    fail(err.message);
    console.error(output);
  } finally {
    stop(child);
  }
}

main().catch((err) => fail(err.message));
