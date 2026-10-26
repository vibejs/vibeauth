import { afterEach, expect, it, vi } from 'vitest';
import { createApp, effectScope, watch } from '@usevibejs/ui';
import { createVibeAuthClient } from './client.ts';
import {
  authKey,
  createAuthPlugin,
  provideAuth,
  useAuth,
  useAuthStatus,
  useIsAuthenticated,
  useSession,
  useUser,
} from './context.ts';

afterEach(() => {
  vi.useRealTimers();
});
const session = (id = 'ada', expiry = Date.now() + 60000) => ({
  user: {
    id,
    name: id,
    email: `${id}@example.test`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: `session-${id}`,
    userId: id,
    token: 'hidden',
    expiresAt: new Date(expiry),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});

function setup() {
  let current: ReturnType<typeof session> | null = null;
  let failure = false;
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/sign-in/email')) current = session();
    if (url.includes('/sign-out')) current = null;
    if (failure) return Response.json({ message: 'Unavailable' }, { status: 503 });
    return Response.json(url.includes('/get-session') ? current : { success: true });
  });
  const auth = createVibeAuthClient({
    baseURL: 'https://example.test',
    fetchOptions: { customFetchImpl: fetch },
    sessionOptions: { refetchOnWindowFocus: false },
  });
  return {
    auth,
    fetch,
    set: (value: typeof current) => {
      current = value;
    },
    fail: (value: boolean) => {
      failure = value;
    },
  };
}

it('starts pending, derives identity from the vanilla store, updates login/logout and masks tokens', async () => {
  const { auth, fetch } = setup();
  expect(auth.status.value).toBe('loading');
  expect(auth.isPending.value).toBe(true);
  expect(auth.isAuthenticated.value).toBe(false);
  const release = auth.mount();
  await auth.ready();
  expect(auth.status.value).toBe('unauthenticated');
  await auth.client.signIn.email({ email: 'ada@example.test', password: 'password' });
  await vi.waitFor(() => expect(auth.status.value).toBe('authenticated'));
  expect(auth.user.value?.id).toBe('ada');
  expect(auth.session.value?.id).toBe('session-ada');
  expect(auth.session.value).not.toHaveProperty('token');
  await auth.client.signOut();
  await vi.waitFor(() => expect(auth.status.value).toBe('unauthenticated'));
  expect(auth.user.value).toBe(null);
  expect(
    fetch.mock.calls.filter(([url]) => String(url).includes('/get-session')).length,
  ).toBeLessThanOrEqual(3);
  release();
  release();
});

it('shares one subscription across scopes and cleans it when the last consumer stops', async () => {
  const { auth } = setup();
  const subscribe = vi.spyOn(auth.client.useSession, 'subscribe');
  const first = effectScope(),
    second = effectScope();
  first.run(() => useAuth(auth));
  second.run(() => auth.useAuth());
  expect(subscribe).toHaveBeenCalledTimes(1);
  first.stop();
  await auth.ready();
  second.stop();
  const last = auth.status.value;
  // No VibeAuth listener remains after disposal.
  auth.client.hydrateSession(session());
  expect(auth.status.value).toBe(last);
  expect(() => auth.useAuth()).toThrow('VIBEAUTH_SCOPE');
});

it('revalidates, exposes errors and recovers without merging separate applications', async () => {
  const a = setup(),
    b = setup();
  const releaseA = a.auth.mount(),
    releaseB = b.auth.mount();
  a.set(session());
  await a.auth.refreshSession();
  await b.auth.refreshSession();
  expect(a.auth.isAuthenticated.value).toBe(true);
  expect(b.auth.isAuthenticated.value).toBe(false);
  a.fail(true);
  await a.auth.refreshSession();
  expect(a.auth.status.value).toBe('error');
  expect(a.auth.error.value).toBeTruthy();
  expect(a.auth.user.value).toBe(null);
  a.fail(false);
  await a.auth.refreshSession();
  expect(a.auth.status.value).toBe('authenticated');
  releaseA();
  releaseB();
});

it('exposes refreshing and cancels a superseded session request', async () => {
  let resolveOld: (response: Response) => void = () => {};
  let calls = 0;
  const auth = createVibeAuthClient({
    baseURL: 'https://example.test',
    fetchOptions: {
      customFetchImpl: async () => {
        if (++calls === 2)
          return new Promise<Response>((resolve) => {
            resolveOld = resolve;
          });
        return Response.json(calls === 1 ? session() : null);
      },
    },
  });
  const release = auth.mount();
  await auth.ready();
  const older = auth.refreshSession();
  await vi.waitFor(() => expect(auth.status.value).toBe('refreshing'));
  await auth.refreshSession();
  resolveOld(Response.json(session('stale')));
  await older;
  expect(auth.user.value).toBe(null);
  expect(auth.status.value).toBe('unauthenticated');
  release();
});

it('expires identity on time and revalidates once without polling', async () => {
  vi.useFakeTimers();
  const { auth, set } = setup();
  set(session('ada', Date.now() + 100));
  const release = auth.mount();
  await auth.refreshSession();
  expect(auth.status.value).toBe('authenticated');
  await vi.advanceTimersByTimeAsync(101);
  expect(auth.status.value).toBe('expired');
  expect(auth.isAuthenticated.value).toBe(false);
  release();
});

it('rejects invalid/elapsed expirations and supports long sessions', async () => {
  vi.useFakeTimers();
  const { auth, set } = setup();
  const release = auth.mount();
  set(session('ada', Date.now() - 1));
  await auth.refreshSession();
  expect(auth.status.value).toBe('expired');
  set(session('ada', Date.now() + 2_147_483_648));
  await auth.refreshSession();
  await vi.advanceTimersByTimeAsync(2_147_483_647);
  expect(auth.status.value).toBe('authenticated');
  release();
});

it('provides application and subtree clients through native DI and composables', async () => {
  const a = setup(),
    b = setup();
  const seen: string[] = [];
  const root = {
    setup() {
      expect(useSession().value).toBe(null);
      expect(useUser().value).toBe(null);
      expect(useIsAuthenticated().value).toBe(false);
      expect(useAuthStatus().value).toBe('loading');
      watch(useAuth().status, (status) => seen.push(status));
      provideAuth(b.auth);
    },
    render: () => document.createElement('div'),
  };
  const app = createApp(root).use(createAuthPlugin(a.auth));
  const element = document.createElement('div');
  app.mount(element);
  await a.auth.ready();
  expect(seen).toContain('unauthenticated');
  app.unmount();
  expect(() => useAuth()).toThrow('VIBEAUTH_CONTEXT');
  const missing = createApp({
    setup: () => {
      useAuth();
    },
    render: () => document.createElement('div'),
  });
  const errors = vi.fn();
  missing.config.errorHandler = errors;
  missing.mount(document.createElement('div'));
  expect(String(errors.mock.calls[0][0])).toContain('VIBEAUTH_CONTEXT');
  missing.unmount();
  expect(authKey).toBeTypeOf('symbol');
});

it('supports explicit session refresh and ready outside a mounted application', async () => {
  const { auth, set } = setup();
  set(session());
  await auth.refreshSession();
  await auth.ready();
  expect(auth.isAuthenticated.value).toBe(true);
});
