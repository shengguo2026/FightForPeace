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
import { createRequire } from 'node:module';
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

/**
 * M14 browser matrix: `FFP_SMOKE_BROWSER=msedge` (or chromium, firefox, webkit) also plays
 * the first launch in that browser against the unzipped game and records its System check
 * (every capability and what it falls back to) in release/system-check-<browser>.json.
 */
async function browserCheck(name) {
  const require = createRequire(join(REPO, 'apps', 'game', 'package.json'));
  const pw = require('@playwright/test');
  const engine = name === 'firefox' ? pw.firefox : name === 'webkit' ? pw.webkit : pw.chromium;
  const channel = name === 'msedge' || name === 'chrome' ? name : undefined;
  const browser = await engine.launch({ channel });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${port}/`);
    const id = (t) => page.locator(`[data-testid="${t}"]`);
    await id('setup-language-en').click({ timeout: 60_000 });
    await id('setup-next').click();
    await id('setup-layout-qwerty').click();
    await page.keyboard.press('Enter');
    await id('setup-finish').click();
    await id('village').waitFor();
    await id('menu-settings').click();
    await id('settings-system').click();
    await id('system-check').waitFor();
    const caps = await page
      .locator('[data-testid^="system-cap-"]')
      .evaluateAll((rows) =>
        rows.map((r) => ({
          id: r.getAttribute('data-testid').slice('system-cap-'.length),
          ok: r.getAttribute('data-ok') === 'true',
          text: r.innerText.replace(/\s+/g, ' ').trim(),
        })),
      );
    const browserLine = await id('system-browser').innerText();
    mkdirSync(join(REPO, 'release'), { recursive: true });
    writeFileSync(
      join(REPO, 'release', `system-check-${name}.json`),
      JSON.stringify({ browser: browserLine, caps }, null, 2),
    );
    await page.screenshot({ path: join(REPO, 'release', `system-check-${name}.png`) });
    for (const c of caps) console.log(`  ${c.ok ? 'ok     ' : 'missing'} ${c.text}`);
    const missingRequired = caps.filter((c) => ['renderer', 'keyboard'].includes(c.id) && !c.ok);
    if (missingRequired.length) throw new Error(`${name}: required capability missing`);
    if (!caps.find((c) => c.id === 'storage')?.ok) throw new Error(`${name}: saves are not kept`);
    if (errors.length) throw new Error(`${name}: page errors: ${errors.join('; ')}`);
    console.log(`${browserLine}: first launch and System check passed`);
  } finally {
    await browser.close();
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
    // M12: the LAN room opens (a code, a port, the host token) and closes again.
    const res = await fetch(`http://127.0.0.1:${port}/__ffp/room`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });
    const room = await res.json();
    if (!res.ok || !/^[A-Z2-9]{4}$/.test(room.code ?? '') || !room.port || !room.token)
      throw new Error(`the room API answered ${res.status} ${JSON.stringify(room)}`);
    const ping = await fetch(`http://127.0.0.1:${room.port}/ffp-room/ping`, {
      signal: AbortSignal.timeout(3000),
    });
    if ((await ping.json()).app !== 'fight-for-peace-room')
      throw new Error('the room listener does not answer');
    await fetch(`http://127.0.0.1:${port}/__ffp/room`, { method: 'DELETE' });
    console.log(`Room ${room.code} opened on port ${room.port} and closed again`);
    const last = readFileSync(join(app, 'logs', 'last-port.txt'), 'utf8').trim();
    if (last !== String(port)) throw new Error(`logs/last-port.txt says ${last}`);
    if (process.env.FFP_SMOKE_BROWSER) await browserCheck(process.env.FFP_SMOKE_BROWSER);
    console.log(`Portable smoke test passed: Fight For Peace ${version} on port ${port}`);
  } catch (err) {
    fail(err.message);
    console.error(output);
  } finally {
    stop(child);
  }
}

main().catch((err) => fail(err.message));
