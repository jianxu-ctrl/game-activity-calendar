import { spawn } from 'node:child_process';

export const isWindows = process.platform === 'win32';

export function localEnv(overrides = {}) {
  const env = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    SERVER_HOST: process.env.SERVER_HOST || 'localhost',
    SERVER_PORT: process.env.SERVER_PORT || '3000',
    CLIENT_DEV_HOST: process.env.CLIENT_DEV_HOST || '127.0.0.1',
    CLIENT_DEV_PORT: process.env.CLIENT_DEV_PORT || '5180',
    LOCAL_ACTIVITY_STORE_PATH:
      process.env.LOCAL_ACTIVITY_STORE_PATH || 'data/game-activities.json',
    ...overrides,
  };

  if (!env.FORCE_AUTHN_INNERAPI_DOMAIN) {
    env.FORCE_AUTHN_INNERAPI_DOMAIN = `http://${env.SERVER_HOST}:${env.SERVER_PORT}`;
  }

  if (!env.SUDA_DATABASE_URL && !env.FORCE_FRAMEWORK_DISABLE_DATAPASS) {
    env.FORCE_FRAMEWORK_DISABLE_DATAPASS = 'true';
  }

  return env;
}

export function bin(name) {
  return isWindows ? `${name}.cmd` : name;
}

export function run(command, args, options = {}) {
  const { env: envOverrides, ...spawnOptions } = options;
  const child = spawn(command, args, {
    ...spawnOptions,
    env: localEnv(envOverrides),
    stdio: 'inherit',
    shell: isWindows && command.endsWith('.cmd'),
  });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} failed with ${signal || code}`,
          ),
        );
      }
    });
  });
}
