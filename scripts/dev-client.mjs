import { bin, localEnv, run } from './env.mjs';

const env = localEnv();

await run(bin('npx'), [
  'vite',
  '--config',
  'vite.config.mjs',
  '--configLoader',
  'native',
  '--host',
  env.CLIENT_DEV_HOST,
  '--port',
  env.CLIENT_DEV_PORT,
  '--strictPort',
]);
