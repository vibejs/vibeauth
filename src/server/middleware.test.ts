// oxlint-disable typescript/no-extraneous-class -- vibe.js modules are plain classes registered with Module.
import { expect, it, vi } from 'vitest';
import { Module, VibeFactory } from '@usevibejs/server';
import { createAuthMiddleware } from './middleware.ts';

it('forwards every method, exact request, streams, query, redirects and distinct cookies', async () => {
  class Root {}
  Module({})(Root);
  const calls: Request[] = [];
  const handler = vi.fn(async (request: Request) => {
    calls.push(request);
    expect(new URL(request.url).search).toBe('?code=a%2Fb&state=original');
    expect(request.headers.get('cookie')).toBe('original=value');
    expect(await request.text()).toBe(request.method === 'POST' ? 'only read once' : '');
    const headers = new Headers({ location: '/done?code=a%2Fb' });
    headers.append('set-cookie', 'one=1; HttpOnly; Path=/');
    headers.append('set-cookie', 'two=2; HttpOnly; Path=/');
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('stream'));
          controller.close();
        },
      }),
      { status: 307, headers },
    );
  });
  const auth = createAuthMiddleware({ handler });
  const app = await VibeFactory.create(Root, {
    basePath: '/api',
    middleware: [auth],
    guards: [
      class {
        canActivate(): never {
          throw new Error('Auth handler must precede controller guards');
        }
      },
    ],
  });
  try {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
      const request = new Request(
        'https://example.test/api/auth/callback/github?code=a%2Fb&state=original',
        {
          method,
          headers: { cookie: 'original=value' },
          ...(method === 'POST' ? { body: 'only read once' } : {}),
        },
      );
      const response = await app.fetch(request);
      expect(calls.at(-1)).toBe(request);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('/done?code=a%2Fb');
      expect(response.headers.getSetCookie()).toEqual([
        'one=1; HttpOnly; Path=/',
        'two=2; HttpOnly; Path=/',
      ]);
      expect(await response.text()).toBe(method === 'HEAD' ? '' : 'stream');
    }
  } finally {
    await app.close();
  }
});

it('does not capture unrelated prefixes and validates configured absolute base paths', async () => {
  const handler = vi.fn(async () => new Response('auth'));
  const next = vi.fn(async () => new Response('next'));
  const middleware = createAuthMiddleware({ handler });
  for (const path of [
    '/api/authentication',
    '/api/auth-extra',
    '/api/auth%2fcallback',
    '/other/api/auth',
    '/api',
  ]) {
    expect(await (await middleware(new Request(`https://example.test${path}`), next)).text()).toBe(
      'next',
    );
  }
  for (const path of ['/api/auth', '/api/auth/', '/api/auth/unknown']) {
    expect(await (await middleware(new Request(`https://example.test${path}`), next)).text()).toBe(
      'auth',
    );
  }
  expect(handler).toHaveBeenCalledTimes(3);
  const custom = createAuthMiddleware({ handler, options: { basePath: '/identity' } });
  expect(await (await custom(new Request('https://example.test/identity'), next)).text()).toBe(
    'auth',
  );
  expect(() => createAuthMiddleware({ handler }, { basePath: '/bad/' })).toThrow(
    'VIBEAUTH_INVALID_PATH',
  );
  expect(() =>
    createAuthMiddleware({ handler, options: { basePath: '/one' } }, { basePath: '/two' }),
  ).toThrow('VIBEAUTH_PATH_MISMATCH');
});
