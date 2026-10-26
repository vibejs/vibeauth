// oxlint-disable typescript/no-extraneous-class -- Vibe.js modules are plain classes registered with Module.
import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { Module, VibeFactory } from '@usevibejs/server';
import { createAuthMiddleware } from '../src/server.ts';
import * as schema from './generated/pg-schema.ts';
import { cookies, credentials } from './fixture.ts';

it('runs official generated migrations and real auth through Drizzle with embedded PostgreSQL', async () => {
  const postgres = new PGlite();
  const sql = await readFile(
    new URL('./generated/migrations/0000_tiresome_kabuki.sql', import.meta.url),
    'utf8',
  );
  await postgres.exec(sql);
  const auth = betterAuth({
    baseURL: 'https://postgres.example.test',
    secret: 'deterministic-local-postgres-test-secret-only',
    database: drizzleAdapter(drizzle(postgres, { schema }), { provider: 'pg', schema }),
    emailAndPassword: { enabled: true },
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    logger: { disabled: true },
  });
  class Root {}
  Module({})(Root);
  const app = await VibeFactory.create(Root, { middleware: [createAuthMiddleware(auth)] });
  const request = (path: string, body: unknown, cookie = '') =>
    app.fetch(
      new Request(`https://postgres.example.test/api/auth/${path}`, {
        method: 'POST',
        headers: {
          origin: 'https://postgres.example.test',
          'content-type': 'application/json',
          cookie,
        },
        body: JSON.stringify(body),
      }),
    );
  try {
    const signup = await request('sign-up/email', credentials);
    expect(signup.status).toBe(200);
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookies(signup) }),
      query: { disableCookieCache: true, disableRefresh: true },
    });
    expect(session?.user.email).toBe(credentials.email);
    expect((await request('sign-out', {}, cookies(signup))).status).toBe(200);
    expect(await auth.api.getSession({ headers: new Headers({ cookie: cookies(signup) }) })).toBe(
      null,
    );
    expect((await request('sign-in/email', credentials)).status).toBe(200);
  } finally {
    await app.close();
    await postgres.close();
  }
});
