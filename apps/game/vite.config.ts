import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// M9 portable build v1: the game shows the repository version (root package.json).
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

// No fixed origin or port is assumed anywhere in the game code: the same build runs under
// `pnpm dev` and later from the portable zip on whatever port its start script picks.
export default defineConfig({
  define: { __FFP_VERSION__: JSON.stringify(version) },
  build: {
    target: 'es2023',
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.3 MB minified
  },
});
