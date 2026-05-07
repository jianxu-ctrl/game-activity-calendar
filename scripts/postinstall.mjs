import { spawn } from 'node:child_process';
import { isWindows } from './env.mjs';

const command = isWindows ? 'fullstack-cli.cmd' : 'fullstack-cli';
const child = spawn(command, ['action-plugin', 'init'], {
  stdio: 'inherit',
  shell: isWindows,
});

child.on('error', (error) => {
  if (error.code === 'ENOENT') {
    console.warn('fullstack-cli not found; skipping action plugin init.');
    process.exit(0);
  }

  console.warn(`fullstack-cli init skipped: ${error.message}`);
  process.exit(0);
});

child.on('exit', (code) => {
  if (code && code !== 0) {
    console.warn(`fullstack-cli init exited with ${code}; continuing install.`);
  }

  process.exit(0);
});
