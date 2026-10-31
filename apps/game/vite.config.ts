import { defineConfig } from 'vite';

// No fixed origin or port is assumed anywhere in the game code: the same build runs under
// `pnpm dev` and later from the portable zip on whatever port its start script picks.
export default defineConfig({
  build: {
    target: 'es2023',
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.3 MB minified
  },
});
