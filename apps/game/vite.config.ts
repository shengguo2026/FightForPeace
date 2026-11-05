import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { ROOM_API, createRoomService } from '../../tools/portable/room.mjs';

// M9 portable build v1: the game shows the repository version (root package.json).
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * M12: the same LAN room service as the portable server (tools/portable/room.mjs), so
 * `pnpm dev` and `pnpm preview` can host a Wi-Fi game too. The room listener only starts
 * when the host's game opens a room.
 */
function lanRooms(): Plugin {
  const rooms = createRoomService({ log: (line) => console.log(`[ffp] ${line}`) });
  const mount = (server: { middlewares: { use: (fn: never) => void } }) =>
    server.middlewares.use(((
      req: Parameters<typeof rooms.handleApi>[0],
      res: Parameters<typeof rooms.handleApi>[1],
      next: () => void,
    ) => {
      if ((req.url ?? '').split('?')[0] === ROOM_API) rooms.handleApi(req, res);
      else next();
    }) as never);
  return {
    name: 'ffp-lan-rooms',
    configureServer: (server) => {
      mount(server);
    },
    configurePreviewServer: (server) => {
      mount(server);
    },
    buildEnd: () => void rooms.close(),
  };
}

// No fixed origin or port is assumed anywhere in the game code: the same build runs under
// `pnpm dev` and later from the portable zip on whatever port its start script picks.
export default defineConfig({
  define: { __FFP_VERSION__: JSON.stringify(version) },
  plugins: [lanRooms()],
  build: {
    target: 'es2023',
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.3 MB minified
  },
});
