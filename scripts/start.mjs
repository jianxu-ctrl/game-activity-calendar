import { existsSync } from 'node:fs';
import { run } from './env.mjs';

const entry = [
  'dist/server/main.js',
  'dist/main.js',
  'main.js',
].find((candidate) => existsSync(candidate));

if (!entry) {
  throw new Error('找不到服务入口，请先运行 npm run build。');
}

await run('node', [entry], {
  env: {
    NODE_ENV: 'production',
  },
});
