// Fight For Peace - local game server for the portable build (docs/review/06 §2.3).
// Node.js built-ins only, so the zip needs no node_modules. Serves ../game on 127.0.0.1,
// port 6006 or the next free one up to 6105, and opens the default browser.
//
//   node server/server.mjs [--port 7000] [--no-open]      (also: FFP_PORT=7000)
//
// M12: the host's game opens a LAN room through /__ffp/room (room.mjs).
// M10: profiles are saved by this server into ../saves (one JSON file per record), so they
// do not depend on the port or the browser; copying the game folder copies the saves.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import http from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROOM_API, createRoomService } from './room.mjs';

export const FIRST_PORT = 6006;
export const LAST_PORT = 6105;
export const HOST = '127.0.0.1';
/** Identifies a Fight For Peace server, and which game folder it serves. */
export const ID_PATH = '/__ffp/id';
/** M10 save API (review 06 §2.4): the game's profiles, as files in `saves/`. */
export const SAVES_PATH = '/__ffp/saves/';
/** Record names the game uses (packages/platform save/backends.ts RECORD_NAME). */
export const RECORD_NAME = /^[a-z0-9][a-z0-9._-]{0,95}$/;
/** Largest save record accepted (a backup of many profiles stays far below this). */
export const MAX_RECORD_BYTES = 4 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

/**
 * One `bytes=` range of a file of `size` bytes: null (no or unsupported header, send the
 * whole file), 'invalid' (unsatisfiable), or the inclusive start and end.
 */
export function byteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(size - 1, Number(m[2]));
  }
  if (start > end || start >= size) return 'invalid';
  return { start, end };
}

export function mimeType(file) {
  return MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Maps a request path to a file inside `root`, or null when it would leave the folder
 * (`..`, encoded separators, absolute paths) or is malformed. "/" serves index.html.
 */
export function resolveRequest(root, urlPath) {
  let path;
  try {
    path = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (path.includes('\0') || path.includes('\\')) return null;
  if (path === '' || path.endsWith('/')) path += 'index.html';
  const base = resolve(root);
  const file = resolve(base, '.' + path);
  if (file !== base && !file.startsWith(base + sep)) return null;
  return file;
}

/** A short id for a game folder, so a second start can find its own running server. */
export function folderId(appDir) {
  return createHash('sha256').update(resolve(appDir)).digest('hex').slice(0, 16);
}

/**
 * GET /__ffp/saves/?prefix=… lists record names; GET, PUT and DELETE /__ffp/saves/<name>
 * read, write and remove one record. Writes go to a temporary file first and are renamed
 * into place, so a crash never leaves half a save. Only requests from the game's own
 * origin are accepted (no cross-site writes from other pages).
 */
function savesHandler(savesDir, req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const name = decodeURIComponent(url.pathname.slice(SAVES_PATH.length));
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host && origin !== `http://${host}`) {
    res.writeHead(403, { 'Content-Type': MIME['.txt'] }).end('Forbidden');
    return;
  }
  const json = (code, body) =>
    res
      .writeHead(code, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' })
      .end(JSON.stringify(body));
  mkdirSync(savesDir, { recursive: true });
  if (name === '') {
    if (req.method !== 'GET') return json(405, { error: 'method' });
    const prefix = url.searchParams.get('prefix') ?? '';
    const names = readdirSync(savesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .filter((n) => RECORD_NAME.test(n) && n.startsWith(prefix))
      .sort();
    return json(200, names);
  }
  if (!RECORD_NAME.test(name)) return json(400, { error: 'name' });
  const file = join(savesDir, `${name}.json`);
  if (req.method === 'GET') {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      return json(404, { error: 'not found' });
    }
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
    res.end(text);
    return;
  }
  if (req.method === 'DELETE') {
    rmSync(file, { force: true });
    return json(200, { ok: true });
  }
  if (req.method === 'PUT') {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_RECORD_BYTES) {
        json(413, { error: 'too large' });
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (size > MAX_RECORD_BYTES) return;
      const tmp = `${file}.${process.pid}.tmp`;
      try {
        writeFileSync(tmp, Buffer.concat(chunks));
        renameSync(tmp, file);
        json(200, { ok: true });
      } catch (err) {
        rmSync(tmp, { force: true });
        json(500, { error: String(err.message ?? err) });
      }
    });
    return;
  }
  json(405, { error: 'method' });
}

function handler(root, info, savesDir, rooms) {
  return (req, res) => {
    // M12: the LAN room (opened by the host's game on its own server).
    if (rooms && (req.url ?? '').split('?')[0] === ROOM_API) {
      rooms.handleApi(req, res);
      return;
    }
    if (savesDir && (req.url ?? '').startsWith(SAVES_PATH)) {
      savesHandler(savesDir, req, res);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    if (req.url === ID_PATH) {
      res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ...info, saves: Boolean(savesDir) }));
      return;
    }
    const file = resolveRequest(root, req.url ?? '/');
    let size = -1;
    if (file) {
      try {
        const st = statSync(file);
        if (st.isFile()) size = st.size;
      } catch {
        size = -1;
      }
    }
    if (size < 0) {
      res.writeHead(file ? 404 : 400, { 'Content-Type': MIME['.txt'] }).end('Not found');
      return;
    }
    const headers = {
      'Content-Type': mimeType(file),
      // Built assets carry content hashes; index.html must always be fresh.
      'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
    };
    // M13: byte ranges, so browsers can seek in the cinematic clips.
    const range = byteRange(req.headers.range, size);
    if (range === 'invalid') {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` }).end();
      return;
    }
    if (range) {
      res.writeHead(206, {
        ...headers,
        'Content-Length': range.end - range.start + 1,
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
      });
      if (req.method === 'HEAD') res.end();
      else createReadStream(file, range).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  };
}

function listen(server, port, host) {
  return new Promise((ok, fail) => {
    const onError = (err) => {
      server.off('listening', onListening);
      fail(err);
    };
    const onListening = () => {
      server.off('error', onError);
      ok();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

/**
 * Serves `root` on `host`. With `port` set, only that port is tried; otherwise the first
 * free port from `first` to `last`. Resolves with the server and its address.
 */
export async function startServer({
  root,
  port,
  host = HOST,
  first = FIRST_PORT,
  last = LAST_PORT,
  info = {},
  saves,
  rooms,
}) {
  const server = http.createServer(
    handler(root, { app: 'fight-for-peace', ...info, rooms: Boolean(rooms) }, saves, rooms),
  );
  const candidates = port ? [port] : Array.from({ length: last - first + 1 }, (_, i) => first + i);
  for (const p of candidates) {
    try {
      await listen(server, p, host);
      return { server, port: p, url: `http://localhost:${p}/` };
    } catch (err) {
      if (err.code !== 'EADDRINUSE' && err.code !== 'EACCES') throw err;
    }
  }
  throw new Error(
    port ? `Port ${port} is already in use.` : `No free port between ${first} and ${last}.`,
  );
}

export function parseArgs(argv, env = {}) {
  const out = { port: undefined, open: true };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--port') out.port = Number(argv[(i += 1)]);
    else if (argv[i].startsWith('--port=')) out.port = Number(argv[i].slice(7));
    else if (argv[i] === '--no-open') out.open = false;
  }
  if (out.port === undefined && env.FFP_PORT) out.port = Number(env.FFP_PORT);
  if (out.port !== undefined && !(Number.isInteger(out.port) && out.port > 0 && out.port < 65536)) {
    throw new Error('--port needs a number between 1 and 65535');
  }
  return out;
}

export function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: process.platform === 'win32',
    });
    child.on('error', () => console.log(`Open ${url} in your browser.`));
    child.unref();
  } catch {
    console.log(`Open ${url} in your browser.`);
  }
}

/** Is a Fight For Peace server for this same folder already running on `port`? */
async function runningHere(port, id) {
  try {
    const res = await fetch(`http://${HOST}:${port}${ID_PATH}`, {
      signal: AbortSignal.timeout(800),
    });
    const body = await res.json();
    return body.app === 'fight-for-peace' && body.folder === id;
  } catch {
    return false;
  }
}

async function main() {
  const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const gameDir = join(appDir, 'game');
  const logsDir = join(appDir, 'logs');
  mkdirSync(logsDir, { recursive: true });
  const logFile = join(logsDir, 'server.log');
  const log = (line) => {
    console.log(line);
    appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
  };
  let version = 'dev';
  try {
    version = readFileSync(join(appDir, 'VERSION'), 'utf8').trim();
  } catch {
    // running from the repository
  }
  const args = parseArgs(process.argv.slice(2), process.env);
  const id = folderId(appDir);
  const portFile = join(logsDir, 'last-port.txt');
  let last;
  try {
    last = Number(readFileSync(portFile, 'utf8').trim());
  } catch {
    last = undefined;
  }
  if (last && (await runningHere(last, id))) {
    const url = `http://localhost:${last}/`;
    log(`Fight For Peace ${version} is already running at ${url}`);
    if (args.open) openBrowser(url);
    return;
  }
  const { port, url } = await startServer({
    root: gameDir,
    port: args.port,
    info: { folder: id, version },
    saves: join(appDir, 'saves'),
    // M12: Host a Wi-Fi game opens a room listener on the local network (port 7350+).
    rooms: createRoomService({ log }),
  });
  writeFileSync(portFile, `${port}\n`);
  log(`Fight For Peace ${version} running at ${url}`);
  console.log('Close this window (or press Ctrl+C) to stop the game.');
  if (args.open) openBrowser(url);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`Fight For Peace could not start: ${err.message}`);
    process.exitCode = 1;
  });
}
