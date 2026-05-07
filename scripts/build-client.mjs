import { bin, run } from './env.mjs';

await run(bin('npx'), [
  'vite',
  'build',
  '--config',
  'vite.config.mjs',
  '--configLoader',
  'native',
], {
  env: {
    NODE_ENV: 'production',
  },
});
