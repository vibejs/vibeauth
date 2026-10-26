import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(join(tmpdir(), 'vibeauth-examples-'));
try {
  for (const example of ['basic', 'saas']) {
    const cwd = resolve(root, 'examples', example);
    const origin = example === 'basic' ? 'http://127.0.0.1:5173' : 'http://localhost:5174';
    const env = {
      ...process.env,
      BETTER_AUTH_SECRET: 'disposable-example-check-secret-at-least-32-characters',
      BETTER_AUTH_URL: origin,
      TRUSTED_ORIGINS: origin,
      VIBEAUTH_LOCAL_MAIL: '1',
      DATABASE_PATH: join(temporary, `${example}.sqlite`),
      PORT: '0',
    };
    const migration = spawnSync(process.execPath, ['dist/server/migrate.js', '--apply'], {
      cwd,
      env,
      encoding: 'utf8',
    });
    if (migration.status !== 0) throw new Error(`${example} migration failed: ${migration.stderr}`);
    const child = spawn(process.execPath, ['dist/server/main.js'], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let error = '';
    child.stderr.on('data', (chunk) => {
      error += String(chunk);
    });
    try {
      const url = await new Promise<string>((resolveURL, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`${example} did not start: ${error}`)),
          15000,
        );
        let text = '';
        child.stdout.on('data', (chunk) => {
          text += String(chunk);
          const lines = text.split('\n');
          text = lines.pop()!;
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.msg === 'listening') {
                clearTimeout(timer);
                resolveURL(data.url);
              }
            } catch {
              /* Only structured startup logs are relevant. */
            }
          }
        });
        child.once('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`${example} exited (${code}): ${error}`));
        });
      });
      const ok = await fetch(new URL('/api/auth/ok', url));
      if (ok.status !== 200) throw new Error(`${example} auth handler failed (${ok.status}).`);
      const privateResponse = await fetch(new URL('/api/account/profile', url));
      if (privateResponse.status !== 401)
        throw new Error(`${example} protected API accepted anonymous access.`);
      console.info(
        `${example}: generated migration, production startup, handler and protected API passed.`,
      );
    } finally {
      if (child.exitCode === null) {
        const exited = new Promise<void>((resolveExit) => child.once('exit', () => resolveExit()));
        child.kill('SIGTERM');
        await exited;
      }
    }
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
