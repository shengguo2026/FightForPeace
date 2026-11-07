import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  CODE_ALPHABET,
  FrameReader,
  createRoomService,
  encodeFrame,
  lanAddresses,
  normaliseCode,
  roomCode,
  type RoomService,
} from '../../tools/portable/room.mjs';

type Msg = {
  t: string;
  ev?: string;
  reason?: string;
  n?: number;
  big?: string;
  token?: string;
};

/** A WebSocket client that collects every message and waits for the next one. */
function client(url: string) {
  const ws = new WebSocket(url);
  const got: Msg[] = [];
  const waiters: (() => void)[] = [];
  let closed = false;
  ws.onmessage = (e) => {
    got.push(JSON.parse(String(e.data)) as Msg);
    waiters.splice(0).forEach((w) => w());
  };
  ws.onclose = () => {
    closed = true;
    waiters.splice(0).forEach((w) => w());
  };
  const until = async (test: (m: Msg[]) => boolean, ms = 3000) => {
    const end = Date.now() + ms;
    while (!test(got)) {
      if (Date.now() > end) throw new Error(`timeout; got ${JSON.stringify(got)}`);
      await new Promise<void>((ok) => {
        waiters.push(ok);
        setTimeout(ok, 50);
      });
    }
  };
  const opened = new Promise<void>((ok, fail) => {
    ws.onopen = () => ok();
    ws.onerror = () => fail(new Error('connect failed'));
  });
  return { ws, got, until, opened, isClosed: () => closed };
}

describe('M12 room server', () => {
  let rooms: RoomService;
  let port = 0;
  let api: Server;
  let apiPort = 0;

  beforeAll(async () => {
    rooms = createRoomService({
      host: '127.0.0.1',
      first: 17350,
      last: 17400,
      addresses: () => ['192.168.1.23'],
    });
    api = createServer((req, res) => rooms.handleApi(req, res));
    await new Promise<void>((ok) => api.listen(0, '127.0.0.1', ok));
    apiPort = (api.address() as AddressInfo).port;
  });
  afterAll(async () => {
    await rooms.close();
    await new Promise((ok) => api.close(ok));
  });

  it('makes four-character codes without look-alike characters and reads typed codes', () => {
    const code = roomCode();
    expect(code).toHaveLength(4);
    for (const c of code) expect(CODE_ALPHABET).toContain(c);
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(normaliseCode(' k7q-2 ')).toBe('K7Q2');
  });

  it('lists home-network addresses first and never loopback', () => {
    expect(
      lanAddresses({
        lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
        eth: [
          { address: '10.0.0.5', family: 'IPv4', internal: false },
          { address: 'fe80::1', family: 'IPv6', internal: false },
        ],
        wlan: [{ address: '192.168.1.23', family: 'IPv4', internal: false }],
      }),
    ).toEqual(['192.168.1.23', '10.0.0.5']);
  });

  it('reads masked, fragmented and long frames', () => {
    const mask = (payload: Buffer, opcode: number, fin = true) => {
      const key = Buffer.from([1, 2, 3, 4]);
      const head =
        payload.length < 126
          ? Buffer.from([(fin ? 0x80 : 0) | opcode, 0x80 | payload.length])
          : Buffer.from([
              (fin ? 0x80 : 0) | opcode,
              0x80 | 126,
              payload.length >> 8,
              payload.length & 255,
            ]);
      const body = Buffer.from(payload.map((b, i) => b ^ key[i & 3]!));
      return Buffer.concat([head, key, body]);
    };
    const r = new FrameReader();
    const long = Buffer.alloc(300, 65);
    const all = Buffer.concat([
      mask(Buffer.from('he'), 1, false),
      mask(Buffer.from('llo'), 0),
      mask(long, 1),
    ]);
    // Arrives split at an awkward place.
    const frames = [...r.push(all.subarray(0, 5)), ...r.push(all.subarray(5))];
    expect(frames.map((f) => f.payload.toString())).toEqual(['he', 'llo', 'A'.repeat(300)]);
    expect(() => new FrameReader().push(encodeFrame('x'))).toThrow(); // clients must mask
  });

  it('opens a room through the local API and relays between host and guest', async () => {
    const res = await fetch(`http://127.0.0.1:${apiPort}/__ffp/room`, { method: 'POST' });
    const info = (await res.json()) as {
      code: string;
      port: number;
      token: string;
      addresses: string[];
    };
    expect(info.code).toHaveLength(4);
    expect(info.addresses).toEqual(['192.168.1.23']);
    port = info.port;
    const status = (await (await fetch(`http://127.0.0.1:${apiPort}/__ffp/room`)).json()) as Record<
      string,
      unknown
    >;
    expect(status.open).toBe(true);
    expect(status.token).toBeUndefined(); // only the opening call learns the host token
    const other = await fetch(`http://127.0.0.1:${apiPort}/__ffp/room`, {
      method: 'POST',
      headers: { Origin: 'http://evil.example' },
    });
    expect(other.status).toBe(403);

    const base = `ws://127.0.0.1:${port}/ffp-room`;
    const host = client(`${base}?role=host&token=${info.token}`);
    await host.opened;
    await host.until((m) => m.some((x) => x.ev === 'hosting'));

    const wrong = client(`${base}?role=guest&code=ZZZZ`);
    await wrong.opened;
    await wrong.until((m) => m.some((x) => x.reason === 'code'));
    const thief = client(`${base}?role=host&token=nope`);
    await thief.opened;
    await thief.until((m) => m.some((x) => x.reason === 'token'));

    const guest = client(`${base}?role=guest&code=${info.code.toLowerCase()}`);
    await guest.opened;
    await guest.until((m) => m.some((x) => x.ev === 'joined'));
    await host.until((m) => m.some((x) => x.ev === 'peer-joined'));

    const third = client(`${base}?role=guest&code=${info.code}`);
    await third.opened;
    await third.until((m) => m.some((x) => x.reason === 'full'));

    guest.ws.send(JSON.stringify({ t: 'hello', n: 1 }));
    await host.until((m) => m.some((x) => x.t === 'hello'));
    // A snapshot-sized message goes through in one piece.
    const big = 'x'.repeat(400_000);
    host.ws.send(JSON.stringify({ t: 'snap', big }));
    await guest.until((m) => m.some((x) => x.t === 'snap' && x.big === big));

    guest.ws.close();
    await host.until((m) => m.some((x) => x.ev === 'peer-left'));
    await fetch(`http://127.0.0.1:${apiPort}/__ffp/room`, { method: 'DELETE' });
    await host.until(() => host.isClosed());
    const late = client(`${base}?role=guest&code=${info.code}`);
    await late.opened;
    await late.until((m) => m.some((x) => x.reason === 'closed'));
  });

  it('M15: a guest whose connection broke takes its place again with its token', async () => {
    const res = await fetch(`http://127.0.0.1:${apiPort}/__ffp/room`, { method: 'POST' });
    const info = (await res.json()) as { code: string; port: number; token: string };
    const base = `ws://127.0.0.1:${info.port}/ffp-room`;
    const host = client(`${base}?role=host&token=${info.token}`);
    await host.opened;
    await host.until((m) => m.some((x) => x.ev === 'hosting'));
    const guest = client(`${base}?role=guest&code=${info.code}`);
    await guest.opened;
    await guest.until((m) => m.some((x) => x.ev === 'joined'));
    const token = guest.got.find((x) => x.ev === 'joined')!.token!;
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    // The old connection still looks open (a pulled cable): without the token the room is full.
    const stranger = client(`${base}?role=guest&code=${info.code}&token=nope`);
    await stranger.opened;
    await stranger.until((m) => m.some((x) => x.reason === 'full'));
    const again = client(`${base}?role=guest&code=${info.code}&token=${token}`);
    await again.opened;
    await again.until((m) => m.some((x) => x.ev === 'joined'));
    await guest.until(() => guest.isClosed());
    // The host was not told that its guest left: the same player is back.
    expect(host.got.filter((x) => x.ev === 'peer-left')).toHaveLength(0);
    again.ws.send(JSON.stringify({ t: 'rejoin' }));
    await host.until((m) => m.some((x) => x.t === 'rejoin'));
    rooms.closeRoom(info.code);
  });
});
