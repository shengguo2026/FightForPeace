// Portable build (docs/review/06 §2): local server and release zip. Paths are built with
// path.join and compared after normalising, so these pass on Windows and Linux alike.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import {
  ID_PATH,
  SAVES_PATH,
  byteRange,
  mimeType,
  parseArgs,
  resolveRequest,
  startServer,
} from '../../tools/portable/server.mjs';
import { assemble, crlf, lf } from '../../tools/release.mjs';
import { buildZip, readZip } from '../../tools/zip.mjs';

const REPO = resolve(__dirname, '..', '..');
const servers: Server[] = [];
let tmp = '';

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'ffp portable '));
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((ok) => s.close(ok))));
  rmSync(tmp, { recursive: true, force: true });
});

function fakeGame(): string {
  const game = join(tmp, 'game');
  mkdirSync(join(game, 'assets'), { recursive: true });
  writeFileSync(join(game, 'index.html'), '<!doctype html><title>Fight For Peace</title>');
  writeFileSync(join(game, 'assets', 'main.js'), 'console.log(1);');
  writeFileSync(join(tmp, 'secret.txt'), 'outside');
  return game;
}

async function freePort(): Promise<number> {
  const s = createServer();
  await new Promise<void>((ok) => s.listen(0, '127.0.0.1', ok));
  const { port } = s.address() as AddressInfo;
  await new Promise((ok) => s.close(ok));
  return port;
}

function rawStatus(port: number, path: string): Promise<number> {
  return new Promise((ok, fail) => {
    const req = request({ host: '127.0.0.1', port, path }, (res) => {
      res.resume();
      ok(res.statusCode ?? 0);
    });
    req.on('error', fail);
    req.end();
  });
}

describe('portable server', () => {
  it('maps request paths inside the game folder and refuses to leave it', () => {
    const root = join(tmp, 'game');
    expect(resolveRequest(root, '/')).toBe(join(resolve(root), 'index.html'));
    expect(resolveRequest(root, '/assets/main.js?v=1')).toBe(
      join(resolve(root), 'assets', 'main.js'),
    );
    for (const bad of ['/../secret.txt', '/assets/../../secret.txt', '/%2e%2e/secret.txt']) {
      expect(resolveRequest(root, bad)).toBeNull();
    }
    expect(resolveRequest(root, '/..%5csecret.txt')).toBeNull();
    expect(resolveRequest(root, '/%E0%A4%A')).toBeNull();
    const ok = resolveRequest(root, '/assets/main.js')!;
    expect(ok.startsWith(resolve(root) + sep)).toBe(true);
  });

  it('knows the MIME types the game needs', () => {
    expect(mimeType('index.html')).toMatch(/^text\/html/);
    expect(mimeType(join('assets', 'main.JS'))).toMatch(/^text\/javascript/);
    expect(mimeType('a.webp')).toBe('image/webp');
    expect(mimeType('a.ogg')).toBe('audio/ogg');
    expect(mimeType('a.unknown')).toBe('application/octet-stream');
    expect(mimeType('a.webm')).toBe('video/webm');
    expect(mimeType('a.mp4')).toBe('video/mp4');
  });

  it('answers byte ranges so the cinematic clips can seek (M13)', async () => {
    expect(byteRange(undefined, 100)).toBeNull();
    expect(byteRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
    expect(byteRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
    expect(byteRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(byteRange('bytes=0-500', 100)).toEqual({ start: 0, end: 99 });
    expect(byteRange('bytes=200-300', 100)).toBe('invalid');
    expect(byteRange('items=0-1', 100)).toBeNull();
    const game = fakeGame();
    const port = await freePort();
    const { server, url } = await startServer({ root: game, port });
    servers.push(server);
    const res = await fetch(`${url}index.html`, { headers: { Range: 'bytes=0-4' } });
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toMatch(/^bytes 0-4\/\d+$/);
    expect((await res.text()).length).toBe(5);
  });

  it('serves files, answers the id check, and refuses traversal', async () => {
    const game = fakeGame();
    const port = await freePort();
    const { server, url } = await startServer({ root: game, port, info: { folder: 'abc' } });
    servers.push(server);
    expect(url).toBe(`http://localhost:${port}/`);
    const base = `http://127.0.0.1:${port}`;
    const index = await fetch(`${base}/`);
    expect(index.status).toBe(200);
    expect(index.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await index.text()).toContain('Fight For Peace');
    const js = await fetch(`${base}/assets/main.js`);
    expect(js.headers.get('content-type')).toMatch(/^text\/javascript/);
    const id = (await (await fetch(`${base}${ID_PATH}`)).json()) as Record<string, string>;
    expect(id).toEqual({ app: 'fight-for-peace', folder: 'abc', saves: false, rooms: false });
    // fetch() would normalise "..", so send the raw path.
    expect(await rawStatus(port, '/../secret.txt')).toBe(400);
    expect(await rawStatus(port, '/%2e%2e/secret.txt')).toBe(400);
    expect((await fetch(`${base}/missing.js`)).status).toBe(404);
    expect((await fetch(`${base}/`, { method: 'POST' })).status).toBe(405);
  });

  it('stores save records in the saves folder, atomically and only by name', async () => {
    const game = fakeGame();
    const saves = join(game, '..', 'saves');
    const port = await freePort();
    const { server } = await startServer({ root: game, port, saves });
    servers.push(server);
    const base = `http://127.0.0.1:${port}`;
    const id = (await (await fetch(`${base}${ID_PATH}`)).json()) as Record<string, unknown>;
    expect(id.saves).toBe(true);
    expect((await fetch(`${base}${SAVES_PATH}profile.p1`)).status).toBe(404);
    const put = await fetch(`${base}${SAVES_PATH}profile.p1`, { method: 'PUT', body: '{"a":1}' });
    expect(put.status).toBe(200);
    expect(readFileSync(join(saves, 'profile.p1.json'), 'utf8')).toBe('{"a":1}');
    expect(await (await fetch(`${base}${SAVES_PATH}profile.p1`)).text()).toBe('{"a":1}');
    await fetch(`${base}${SAVES_PATH}device`, { method: 'PUT', body: '{}' });
    expect(await (await fetch(`${base}${SAVES_PATH}?prefix=profile.`)).json()).toEqual([
      'profile.p1',
    ]);
    expect(await (await fetch(`${base}${SAVES_PATH}`)).json()).toEqual(['device', 'profile.p1']);
    expect(
      (await fetch(`${base}${SAVES_PATH}Bad%20Name`, { method: 'PUT', body: 'x' })).status,
    ).toBe(400);
    expect(await rawStatus(port, `${SAVES_PATH}..%2Fescape`)).toBe(400);
    const foreign = await fetch(`${base}${SAVES_PATH}profile.p1`, {
      method: 'PUT',
      body: 'x',
      headers: { Origin: 'http://evil.example' },
    });
    expect(foreign.status).toBe(403);
    expect((await fetch(`${base}${SAVES_PATH}profile.p1`, { method: 'DELETE' })).status).toBe(200);
    expect((await fetch(`${base}${SAVES_PATH}profile.p1`)).status).toBe(404);
  });

  it('moves to the next port when the first is busy', async () => {
    const game = fakeGame();
    const first = await freePort();
    const blocker = createServer();
    await new Promise<void>((ok) => blocker.listen(first, '127.0.0.1', ok));
    servers.push(blocker);
    const { server, port } = await startServer({ root: game, first, last: first + 20 });
    servers.push(server);
    expect(port).toBeGreaterThan(first);
    expect(port).toBeLessThanOrEqual(first + 20);
    await expect(startServer({ root: game, port: first })).rejects.toThrow(/in use/);
  });

  it('reads --port, --no-open and FFP_PORT', () => {
    expect(parseArgs([])).toEqual({ port: undefined, open: true });
    expect(parseArgs(['--port', '7000', '--no-open'])).toEqual({ port: 7000, open: false });
    expect(parseArgs(['--port=7001'])).toEqual({ port: 7001, open: true });
    expect(parseArgs([], { FFP_PORT: '7002' }).port).toBe(7002);
    expect(() => parseArgs(['--port', 'abc'])).toThrow(/port/);
  });
});

describe('release zip', () => {
  it('converts line endings either way', () => {
    expect(crlf('a\nb\r\nc\n')).toBe('a\r\nb\r\nc\r\n');
    expect(lf('a\r\nb\nc\r\n')).toBe('a\nb\nc\n');
  });

  it('round-trips entries and keeps permissions', () => {
    const zip = buildZip([
      { name: 'x/run.sh', data: Buffer.from('#!/bin/sh\n'), mode: 0o755 },
      { name: 'x/a.txt', data: Buffer.from('hello '.repeat(50)) },
    ]);
    const entries = readZip(zip);
    expect(entries.map((e) => [e.name, e.mode])).toEqual([
      ['x/run.sh', 0o755],
      ['x/a.txt', 0o644],
    ]);
    expect(() => buildZip([{ name: 'x\\y.txt', data: Buffer.alloc(1) }])).toThrow();
  });

  it('packs the game with start scripts, "/" names and the right line endings', () => {
    const game = fakeGame();
    const out = join(tmp, 'release');
    const { zipPath, names } = assemble({ version: '9.9.9', gameDir: game, outDir: out });
    const root = 'FightForPeace-9.9.9';
    for (const n of names) {
      expect(n.startsWith(`${root}/`)).toBe(true);
      expect(n).not.toContain('\\');
    }
    expect(names).toEqual(
      expect.arrayContaining([
        `${root}/start.bat`,
        `${root}/start.sh`,
        `${root}/README.txt`,
        `${root}/THIRD-PARTY-NOTICES.txt`,
        `${root}/VERSION`,
        `${root}/runtime.json`,
        `${root}/server/server.mjs`,
        `${root}/server/room.mjs`,
        `${root}/server/get-node.ps1`,
        `${root}/game/index.html`,
        `${root}/game/assets/main.js`,
      ]),
    );
    const zip = readFileSync(zipPath);
    const body = (name: string): { text: string; mode: number } => {
      const e = readZip(zip).find((r) => r.name === `${root}/${name}`)!;
      const raw = zip.subarray(e.start, e.start + e.size);
      const data = e.method === 8 ? inflateRawSync(raw) : raw;
      return { text: data.toString('utf8'), mode: e.mode };
    };
    const bat = body('start.bat');
    expect(bat.text).toContain('\r\n');
    expect(bat.text.replace(/\r\n/g, '')).not.toContain('\n');
    const sh = body('start.sh');
    expect(sh.text.startsWith('#!')).toBe(true);
    expect(sh.text).not.toContain('\r');
    expect(sh.mode).toBe(0o755);
    expect(body('server/server.mjs').text).not.toContain('\r');
    expect(body('VERSION').text).toBe('9.9.9\n');
    const readme = body('README.txt').text;
    expect(readme).toContain('Fight For Peace 9.9.9');
    expect(readme).not.toContain('@VERSION@');
    const notices = body('THIRD-PARTY-NOTICES.txt').text;
    for (const pkg of ['phaser', 'preact', '@preact/signals', '@preact/signals-core']) {
      expect(notices).toMatch(
        new RegExp(`^${pkg.replace('/', '\\/')} \\d+\\.\\d+\\.\\d+ \\(MIT\\)`, 'm'),
      );
    }
    expect(notices).toContain('Permission is hereby granted');
    expect(notices).toContain('Node.js');
    const runtime = JSON.parse(body('runtime.json').text) as { node: string };
    expect(runtime.node).toMatch(/^24\./);
  });

  it('pins a checksum for every Node download', () => {
    const runtime = JSON.parse(
      readFileSync(join(REPO, 'tools', 'portable', 'runtime.json'), 'utf8'),
    ) as { files: Record<string, { url: string; sha256: string }> };
    const platforms = Object.values(runtime.files);
    expect(platforms.length).toBeGreaterThanOrEqual(4);
    for (const p of platforms) {
      expect(p.url).toMatch(/^https:\/\/nodejs\.org\/dist\//);
      expect(p.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
