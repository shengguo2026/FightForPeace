import type { NetMessage } from './protocol';

/**
 * M12: how the two games reach each other. Lockstep and the lobby only see this
 * interface, so M15 (or online rooms later) can swap WebSocket for WebRTC or a hosted
 * server without touching gameplay code (docs/review/03 §1).
 */
export interface Transport {
  send(msg: NetMessage): void;
  onMessage: ((msg: NetMessage) => void) | null;
  /** The connection closed (by either side or the network). */
  onClose: (() => void) | null;
  close(): void;
  readonly open: boolean;
}

/**
 * Two connected in-memory transports for tests. Messages are queued until `pump()` (or,
 * with `auto`, delivered on the next microtask); `cut()` drops the connection.
 */
export function memoryPair(auto = false) {
  const queues: [NetMessage[], NetMessage[]] = [[], []];
  let open = true;
  const ends = [0, 1].map((side) => {
    const t: Transport = {
      onMessage: null,
      onClose: null,
      get open() {
        return open;
      },
      send(msg) {
        if (!open) return;
        // A deep copy, as JSON on a real wire.
        queues[1 - side]!.push(JSON.parse(JSON.stringify(msg)) as NetMessage);
        if (auto) queueMicrotask(() => pump());
      },
      close() {
        cut();
      },
    };
    return t;
  }) as [Transport, Transport];
  function pump(max = Infinity): number {
    let n = 0;
    while (open && n < max && (queues[0].length || queues[1].length)) {
      for (const side of [0, 1] as const) {
        const msg = queues[side].shift();
        if (msg) {
          n += 1;
          ends[side].onMessage?.(msg);
        }
      }
    }
    return n;
  }
  function cut() {
    if (!open) return;
    open = false;
    for (const e of ends) e.onClose?.();
  }
  return { a: ends[0], b: ends[1], pump, cut, queued: () => queues[0].length + queues[1].length };
}

/** Why joining or hosting a room failed (each has its own message). */
export type RoomError =
  'unreachable' | 'code' | 'full' | 'expired' | 'closed' | 'token' | 'timeout' | 'api';

/** A WebSocket to the room server. Room notices arrive as `sys` messages. */
export class WebSocketTransport implements Transport {
  onMessage: ((msg: NetMessage) => void) | null = null;
  onClose: (() => void) | null = null;
  private closed = false;

  constructor(private readonly ws: WebSocket) {
    ws.onmessage = (e) => {
      let msg: NetMessage;
      try {
        msg = JSON.parse(String(e.data)) as NetMessage;
      } catch {
        return;
      }
      this.onMessage?.(msg);
    };
    ws.onclose = () => this.finish();
    ws.onerror = () => this.finish();
  }

  get open(): boolean {
    return !this.closed && this.ws.readyState === WebSocket.OPEN;
  }

  send(msg: NetMessage): void {
    if (this.open) this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws.close();
    this.finish();
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    this.onClose?.();
  }
}

/** ws://address:port/ffp-room?… with IPv6 addresses in brackets. */
export function roomUrl(address: string, port: number, query: Record<string, string>): string {
  const host = address.includes(':') && !address.startsWith('[') ? `[${address}]` : address;
  return `ws://${host}:${port}/ffp-room?${new URLSearchParams(query).toString()}`;
}

/**
 * Connects to a room and waits for the server's first notice (`hosting` for the host,
 * `joined` for a guest). Rejects with a RoomError.
 */
export function connectRoom(
  url: string,
  expect: 'hosting' | 'joined',
  timeoutMs = 6000,
): Promise<WebSocketTransport> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      reject(new Error('unreachable' satisfies RoomError));
      return;
    }
    let opened = false;
    let done = false;
    const fail = (why: RoomError) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // already closed
      }
      reject(new Error(why));
    };
    const timer = setTimeout(() => fail(opened ? 'timeout' : 'unreachable'), timeoutMs);
    ws.onopen = () => (opened = true);
    ws.onerror = () => fail(opened ? 'closed' : 'unreachable');
    ws.onclose = () => fail(opened ? 'closed' : 'unreachable');
    ws.onmessage = (e) => {
      let msg: NetMessage;
      try {
        msg = JSON.parse(String(e.data)) as NetMessage;
      } catch {
        return;
      }
      if (msg.t !== 'sys') return;
      if (msg.ev === 'error') fail((msg.reason as RoomError) ?? 'closed');
      else if (msg.ev === expect && !done) {
        done = true;
        clearTimeout(timer);
        resolve(new WebSocketTransport(ws));
      }
    };
  });
}
