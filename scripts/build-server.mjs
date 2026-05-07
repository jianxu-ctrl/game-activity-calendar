import { bin, run } from './env.mjs';

await run(bin('npx'), ['nest', 'build'], {
  env: {
    NODE_ENV: 'production',
  },
});
