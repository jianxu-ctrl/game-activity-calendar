import { bin, run } from './env.mjs';

await run(bin('npx'), ['nest', 'build'], {
  env: {
    NODE_ENV: 'production',
  },
});

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

await import('./write-netlify-index.mjs');
