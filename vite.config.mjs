import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@lark-apaas/fullstack-vite-preset';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
});
