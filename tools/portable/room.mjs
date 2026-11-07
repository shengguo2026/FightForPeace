// Fight For Peace - M12 LAN room server (M15: guests reconnect with their token) (docs/review/03 §1.2, roadmap M12).
// Node.js built-ins only, so the portable zip needs no node_modules. The host's game asks
// its own local server (POST /__ffp/room) to open a room; this module then listens on the
// local network (all interfaces, port 7350 or the next free one up to 7359) and carries
// the two players' messages over WebSocket. The guest's game, running on its own computer,
// joins with the host's LAN address, the port and the room code.
//
// The room server is a relay: it checks the room code and the host's token and forwards
// every message unchanged. The games validate versions, rules and content themselves.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import http from 'node:http';
import { networkInterfaces } from 'node:os';

export const ROOM_FIRST_PORT = 7350;
export const ROOM_LAST_PORT = 7359;
/** The game's local API (same origin as the page): open, inspect and close the room. */
export const ROOM_API = '/__ffp/room';
/** WebSocket path on the room listener. */
export const ROOM_PATH = '/ffp-room';
/** Largest message relayed (a world snapshot is far below this). */
export const MAX_MESSAGE = 8 * 1024 * 1024;
/** A room nobody joined expires after this long (short-lived pairing). */
export const ROOM_TTL_MS = 30 * 60 * 1000;
/** Room codes avoid look-alike characters (0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export function roomCode(pick = (n) => randomInt(n)) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[pick(CODE_ALPHABET.length)];
  return code;
}

/** Normalises what a player typed: case, spaces and dashes do not matter. */
export function normaliseCode(text) {
  return String(text ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
}

/** The computer's IPv4 addresses on the local network (no loopback). */
export function lanAddresses(ifaces = networkInterfaces()) {
  const out = [];
  for (const list of Object.values(ifaces))
    for (const a of list ?? [])
      if ((a.family === 'IPv4' || a.family === 4) && !a.internal) out.push(a.address);
  // Home networks first (192.168.x, then 10.x, then 172.16-31.x), then anything else.
  const rank = (ip) =>
    ip.startsWith('192.168.')
      ? 0
      : ip.startsWith('10.')
        ? 1
        : /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
          ? 2
          : 3;
  return [...new Set(out)].sort((a, b) => rank(a) - rank(b));
}

export function acceptKey(key) {
  return createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64');
}

/** One server-to-client WebSocket frame (never masked). */
export function encodeFrame(payload, opcode = 1) {
  const data = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
  const len = data.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x80 | opcode;
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, data]);
}

/**
 * Incremental WebSocket frame reader. `push` returns the complete frames read so far as
 * { opcode, fin, payload }; throws on a protocol error or a frame over `max` bytes.
 */
export class FrameReader {
  constructor(max = MAX_MESSAGE, requireMask = true) {
    this.max = max;
    this.requireMask = requireMask;
    this.buf = Buffer.alloc(0);
  }

  push(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    const out = [];
    for (;;) {
      const b = this.buf;
      if (b.length < 2) break;
      const fin = (b[0] & 0x80) !== 0;
      const opcode = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      if (this.requireMask && !masked) throw new Error('unmasked client frame');
      let len = b[1] & 0x7f;
      let at = 2;
      if (len === 126) {
        if (b.length < 4) break;
        len = b.readUInt16BE(2);
        at = 4;
      } else if (len === 127) {
        if (b.length < 10) break;
        const big = b.readBigUInt64BE(2);
        if (big > BigInt(this.max)) throw new Error('frame too large');
        len = Number(big);
        at = 10;
      }
      if (len > this.max) throw new Error('frame too large');
      const maskAt = at;
      if (masked) at += 4;
      if (b.length < at + len) break;
      const payload = Buffer.from(b.subarray(at, at + len));
      if (masked) for (let i = 0; i < len; i += 1) payload[i] ^= b[maskAt + (i & 3)];
      out.push({ fin, opcode, payload });
      this.buf = b.subarray(at + len);
    }
    return out;
  }
}

/** A server-side WebSocket connection over a raw socket after the upgrade. */
class Peer {
  constructor(socket, onText, onClose) {
    this.socket = socket;
    this.open = true;
    const reader = new FrameReader();
    let parts = [];
    let size = 0;
    socket.on('data', (chunk) => {
      let frames;
      try {
        frames = reader.push(chunk);
      } catch {
        this.close(1009);
        return;
      }
      for (const f of frames) {
        if (f.opcode === 8) {
          this.close(1000);
          return;
        }
        if (f.opcode === 9) {
          this.write(encodeFrame(f.payload, 10));
          continue;
        }
        if (f.opcode === 10) continue;
        if (f.opcode === 1 || f.opcode === 2 || f.opcode === 0) {
          parts.push(f.payload);
          size += f.payload.length;
          if (size > MAX_MESSAGE) {
            this.close(1009);
            return;
          }
          if (f.fin) {
            const text = Buffer.concat(parts).toString('utf8');
            parts = [];
            size = 0;
            onText(text);
          }
        }
      }
    });
    socket.on('close', () => {
      const was = this.open;
      this.open = false;
      if (was) onClose();
    });
    socket.on('error', () => socket.destroy());
  }

  write(buf) {
    if (this.open && !this.socket.destroyed) this.socket.write(buf);
  }

  send(text) {
    this.write(encodeFrame(text));
  }

  sendJson(msg) {
    this.send(JSON.stringify(msg));
  }

  close(code = 1000) {
    if (!this.open) return;
    const body = Buffer.alloc(2);
    body.writeUInt16BE(code, 0);
    this.write(encodeFrame(body, 8));
    this.socket.end();
    // A peer that never answers the close is cut after a moment.
    setTimeout(() => this.socket.destroy(), 1000).unref();
  }
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
 * The room service of one game installation. `open()` starts the LAN listener (once) and
 * makes a new room with a fresh code and host token; rooms whose host went away are
 * dropped when the next one opens. (Normally one room exists: the player's own.)
 */
export function createRoomService({
  host = '0.0.0.0',
  port,
  first = ROOM_FIRST_PORT,
  last = ROOM_LAST_PORT,
  log = () => {},
  now = () => Date.now(),
  addresses = () => lanAddresses(),
} = {}) {
  let server = null;
  let boundPort = 0;
  /** code → room */
  const rooms = new Map();
  let latest = null;
  const sockets = new Set();

  function endRoom(r) {
    if (!r || !rooms.has(r.code)) return;
    rooms.delete(r.code);
    if (latest === r) latest = null;
    r.host?.close(1001);
    r.guest?.close(1001);
    log(`Room ${r.code} closed`);
  }

  function reject(socket, reason) {
    // The handshake completed, so the browser can read why it is refused.
    const peer = new Peer(
      socket,
      () => {},
      () => {},
    );
    peer.sendJson({ t: 'sys', ev: 'error', reason });
    peer.close(4000);
  }

  function onUpgrade(req, socket) {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    const url = new URL(req.url ?? '/', 'http://room');
    const key = req.headers['sec-websocket-key'];
    if (
      url.pathname !== ROOM_PATH ||
      String(req.headers.upgrade).toLowerCase() !== 'websocket' ||
      typeof key !== 'string'
    ) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return;
    }
    socket.setNoDelay(true);
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    const role = url.searchParams.get('role');
    if (role === 'host') {
      const token = url.searchParams.get('token');
      const r = [...rooms.values()].find((x) => x.token === token);
      if (!r) return reject(socket, rooms.size ? 'token' : 'closed');
      r.host?.close(4001);
      const peer = new Peer(
        socket,
        (text) => r.guest?.send(text),
        () => {
          if (r.host !== peer) return;
          r.host = null;
          r.guest?.sendJson({ t: 'sys', ev: 'peer-left' });
        },
      );
      r.host = peer;
      peer.sendJson({ t: 'sys', ev: 'hosting', code: r.code });
      if (r.guest) peer.sendJson({ t: 'sys', ev: 'peer-joined' });
      return;
    }
    if (role !== 'guest') return reject(socket, 'role');
    if (rooms.size === 0) return reject(socket, 'closed');
    const r = rooms.get(normaliseCode(url.searchParams.get('code')));
    if (!r) return reject(socket, 'code');
    if (!r.joined && now() - r.opened > ROOM_TTL_MS) return reject(socket, 'expired');
    // M15: a guest whose connection broke takes its place again with its token (the old
    // connection may still look open after a pulled cable).
    const rejoin = url.searchParams.get('token');
    const stale = r.guest && rejoin && rejoin === r.guestToken ? r.guest : null;
    if (r.guest && !stale) return reject(socket, 'full');
    if (!r.host) return reject(socket, 'closed');
    const peer = new Peer(
      socket,
      (text) => r.host?.send(text),
      () => {
        if (r.guest !== peer) return;
        r.guest = null;
        r.host?.sendJson({ t: 'sys', ev: 'peer-left' });
        log(`Room ${r.code}: the guest left`);
      },
    );
    r.guest = peer;
    r.joined = true;
    if (!stale) r.guestToken = randomBytes(16).toString('hex');
    stale?.close(4001);
    peer.sendJson({ t: 'sys', ev: 'joined', code: r.code, token: r.guestToken });
    r.host.sendJson({ t: 'sys', ev: 'peer-joined' });
    log(`Room ${r.code}: a guest joined from ${req.socket.remoteAddress}`);
  }

  async function start() {
    if (server) return;
    const s = http.createServer((req, res) => {
      // A plain GET answers "this is a Fight For Peace room" (reachability check).
      res.writeHead(req.url === `${ROOM_PATH}/ping` ? 200 : 404, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify({ app: 'fight-for-peace-room', open: rooms.size > 0 }));
    });
    s.on('upgrade', onUpgrade);
    const candidates = port
      ? [port]
      : Array.from({ length: last - first + 1 }, (_, i) => first + i);
    for (const p of candidates) {
      try {
        await listen(s, p, host);
        server = s;
        boundPort = p;
        log(`Room server listening on port ${p}`);
        return;
      } catch (err) {
        if (err.code !== 'EADDRINUSE' && err.code !== 'EACCES') throw err;
      }
    }
    throw new Error(`No free room port between ${first} and ${last}.`);
  }

  const service = {
    /** Opens a new room. */
    async open() {
      await start();
      // Rooms whose host is gone (a closed tab) are dropped.
      for (const r of [...rooms.values()]) if (!r.host && now() - r.opened > 15_000) endRoom(r);
      let code = roomCode();
      while (rooms.has(code)) code = roomCode();
      const room = {
        code,
        token: randomBytes(16).toString('hex'),
        opened: now(),
        joined: false,
        host: null,
        guest: null,
        guestToken: null,
      };
      rooms.set(code, room);
      latest = room;
      log(`Room ${room.code} opened on port ${boundPort}`);
      return service.status(true);
    },
    /** The newest room (the one this computer's player opened last). */
    status(withToken = false) {
      const room = latest;
      if (!room) return { open: false, port: boundPort || null };
      return {
        open: true,
        code: room.code,
        port: boundPort,
        addresses: addresses(),
        guest: Boolean(room.guest),
        ...(withToken ? { token: room.token } : {}),
      };
    },
    /** Closes the room with `code`, or every room. */
    closeRoom(code) {
      if (code) endRoom(rooms.get(normaliseCode(code)));
      else for (const r of [...rooms.values()]) endRoom(r);
    },
    /** Stops the listener and drops every connection. */
    async close() {
      service.closeRoom();
      for (const s of sockets) s.destroy();
      if (server) {
        server.closeAllConnections?.();
        await new Promise((ok) => server.close(() => ok()));
      }
      server = null;
      boundPort = 0;
    },
    /**
     * The game's local API on its own server: POST opens a room, GET reports it, DELETE
     * closes it. Only the game's own page may call it.
     */
    handleApi(req, res) {
      const json = (code, body) =>
        res
          .writeHead(code, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          })
          .end(JSON.stringify(body));
      const origin = req.headers.origin;
      const hostHeader = req.headers.host;
      if (origin && hostHeader && origin !== `http://${hostHeader}`)
        return json(403, { error: 'origin' });
      if (req.method === 'POST')
        return void service.open().then(
          (info) => json(200, info),
          (err) => json(500, { error: String(err.message ?? err) }),
        );
      if (req.method === 'GET') return json(200, service.status());
      if (req.method === 'DELETE') {
        service.closeRoom(new URL(req.url ?? '/', 'http://x').searchParams.get('code'));
        return json(200, { ok: true });
      }
      return json(405, { error: 'method' });
    },
  };
  return service;
}
