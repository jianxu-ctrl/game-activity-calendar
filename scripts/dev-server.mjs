import { bin, run } from './env.mjs';

await run(bin('npx'), ['nest', 'start', '--watch']);
