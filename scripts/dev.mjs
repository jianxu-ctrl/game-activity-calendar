import { spawn } from 'node:child_process';
import { bin, isWindows, localEnv } from './env.mjs';

const env = localEnv();

const children = [
  spawn(bin('npm'), ['run', 'dev:server'], {
    env,
    stdio: 'inherit',
    shell: isWindows,
  }),
  spawn(bin('npm'), ['run', 'dev:client'], {
    env,
    stdio: 'inherit',
    shell: isWindows,
  }),
];

let shuttingDown = false;

function stopAll() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) {
      stopAll();
      process.exitCode = code;
    }
  });
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
