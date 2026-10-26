import { expect, it, vi } from 'vitest';
import { computed, shallowRef } from '@usevibejs/ui';
import { createMemoryHistory, createRouter } from '@usevibejs/ui/router';
import type { AuthState } from '../client/client.ts';
import type { SessionData } from '../shared/types.ts';
import { createAuthRouteGuard } from './guard.ts';
import { safeReturnURL } from './redirect.ts';

function setup() {
  const user = shallowRef<{ id: string; emailVerified: boolean } | null>(null);
  const error = shallowRef(false);
  const auth: AuthState<SessionData> = {
    user: computed(() => user.value),
    data: computed(() => null),
    session: computed(() => null),
    status: computed(() =>
      error.value ? 'error' : user.value ? 'authenticated' : 'unauthenticated',
    ),
    isAuthenticated: computed(() => !!user.value),
    isPending: computed(() => false),
    error: computed(() => null),
    ready: vi.fn(async () => {}),
    mount: () => () => {},
    refreshSession: async () => {},
  };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/' },
      { path: '/login', meta: { auth: { mode: 'guest' } } },
      { path: '/public', meta: { auth: { mode: 'public' } } },
      { path: '/dashboard', meta: { auth: { mode: 'authenticated' } } },
      { path: '/verified', meta: { auth: { verifiedEmail: true } } },
      { path: '/verify-email' },
      { path: '/forbidden' },
      { path: '/org', meta: { auth: { organization: true, permissions: ['project:update'] } } },
      {
        path: '/parent',
        meta: { auth: { mode: 'authenticated' } },
        children: [{ path: 'child', meta: { auth: { mode: 'public' } } }],
      },
    ],
  });
  return { auth, user, error, router };
}

it('handles public, guest, protected, nested and verified routes using the real router', async () => {
  const { auth, user, router } = setup();
  router.beforeEach(createAuthRouteGuard({ auth }));
  await router.push('/public');
  expect(auth.ready).not.toHaveBeenCalled();
  await router.push('/dashboard?filter=mine#top');
  expect(router.currentRoute.value.path).toBe('/login');
  expect(router.currentRoute.value.query.returnTo).toBe('/dashboard?filter=mine#top');
  await router.push('/parent/child');
  expect(router.currentRoute.value.path).toBe('/login');
  await router.push('/verified');
  expect(router.currentRoute.value.path).toBe('/login');
  user.value = { id: 'ada', emailVerified: false };
  await router.push('/verified');
  expect(router.currentRoute.value.path).toBe('/verify-email');
  user.value = { id: 'ada', emailVerified: true };
  await router.push('/verified');
  expect(router.currentRoute.value.path).toBe('/verified');
  await router.push('/login');
  expect(router.currentRoute.value.path).toBe('/');
  await router.push('/dashboard');
  expect(router.currentRoute.value.path).toBe('/dashboard');
});

it('fails closed for policies and errors, and prevents a misconfigured redirect loop', async () => {
  const { auth, user, error, router } = setup();
  const guard = createAuthRouteGuard({ auth, login: '/dashboard', forbidden: '/org' });
  expect(await guard(router.resolve('/dashboard'), router.resolve('/'))).toBe(false);
  user.value = { id: 'ada', emailVerified: true };
  expect(await guard(router.resolve('/org'), router.resolve('/'))).toBe(false);
  const deny = createAuthRouteGuard({ auth });
  expect(await deny(router.resolve('/org'), router.resolve('/'))).toMatchObject({
    path: '/forbidden',
  });
  const grant = createAuthRouteGuard({ auth, authorize: async () => true });
  expect(await grant(router.resolve('/org'), router.resolve('/'))).toBeUndefined();
  error.value = true;
  expect(await grant(router.resolve('/dashboard'), router.resolve('/'))).toBe(false);
});

it('waits for session resolution, discards superseded navigations and rechecks account switching', async () => {
  const { auth, user, router } = setup();
  let resolveReady = () => {};
  auth.ready = () =>
    new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
  const guard = createAuthRouteGuard({ auth });
  const older = guard(router.resolve('/dashboard'), router.resolve('/'));
  await guard(router.resolve('/public'), router.resolve('/'));
  resolveReady();
  expect(await older).toBe(false);
  auth.ready = async () => {};
  user.value = { id: 'ada', emailVerified: true };
  let authorize = async () => {
    user.value = null;
    return true;
  };
  const policy = createAuthRouteGuard({ auth, authorize: () => authorize() });
  expect(await policy(router.resolve('/org'), router.resolve('/'))).toMatchObject({
    path: '/login',
  });
  user.value = { id: 'ada', emailVerified: true };
  authorize = async () => {
    user.value = { id: 'grace', emailVerified: true };
    return true;
  };
  expect(await policy(router.resolve('/org'), router.resolve('/'))).toBe(false);
});

it('rejects open redirects, ambiguous encoding and unsafe characters while preserving local returns', () => {
  for (const value of [
    null,
    '/..//evil.test',
    '/%2e%2e//evil.test',
    '/a/./b',
    ['x'],
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%2f%2fevil.test',
    '/%252f%252fevil.test',
    '/%zz',
    '/%0aLocation:evil',
    '/%20evil',
    '/%252525252525252f',
  ]) {
    expect(safeReturnURL(value)).toBe('/');
  }
  expect(safeReturnURL('/dashboard?q=one%20two#tab')).toBe('/');
  expect(safeReturnURL('/dashboard?q=mine#tab')).toBe('/dashboard?q=mine#tab');
  expect(safeReturnURL('https://evil.test', '/login')).toBe('/login');
});

it('discards policies that finish after a newer navigation, for both grants and denials', async () => {
  for (const granted of [true, false]) {
    const { auth, user, router } = setup();
    user.value = { id: 'ada', emailVerified: true };
    let resolvePolicy = (_value: boolean) => {};
    const guard = createAuthRouteGuard({
      auth,
      authorize: () =>
        new Promise<boolean>((resolve) => {
          resolvePolicy = resolve;
        }),
    });
    const old = guard(router.resolve('/org'), router.resolve('/'));
    await Promise.resolve();
    await guard(router.resolve('/public'), router.resolve('/'));
    resolvePolicy(granted);
    expect(await old).toBe(false);
  }
});

it('validates fallback redirects as well', () => {
  expect(safeReturnURL(null, 'https://evil.test')).toBe('/');
});
