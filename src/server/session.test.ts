import { expect, it, vi } from 'vitest';
import { HttpError, type RequestContext } from '@usevibejs/server';
import { getAuthSession, requireAuthSession } from './session.ts';
import { allPolicies, createAuthGuard } from './guard.ts';

const ctx = () => ({ req: new Request('https://example.test'), params: {} }) as RequestContext;
const identity = {
  user: { id: 'u', emailVerified: false },
  session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 60000), token: 'never-expose' },
};

it('deduplicates by request/source, strips credentials and explicitly revalidates on demand', async () => {
  const source = { api: { getSession: vi.fn(async () => identity) } };
  const context = ctx();
  const [first, second] = await Promise.all([
    getAuthSession(source, context),
    getAuthSession(source, context),
  ]);
  expect(first).toBe(second);
  expect(source.api.getSession).toHaveBeenCalledExactlyOnceWith({
    headers: context.req.headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });
  expect(first.session).not.toHaveProperty('token');
  await getAuthSession(source, context, { fresh: true });
  await getAuthSession(source, ctx());
  expect(source.api.getSession).toHaveBeenCalledTimes(3);
  const other = { api: { getSession: vi.fn(async () => null) } };
  expect((await getAuthSession(other, context)).authenticated).toBe(false);
  expect((await requireAuthSession(source, context)).userId).toBe('u');
  await expect(requireAuthSession(other, context)).rejects.toMatchObject({ status: 401 });
});

it('does not retain failed validations and never turns infrastructure errors into anonymous success', async () => {
  const source = {
    api: {
      getSession: vi
        .fn()
        .mockRejectedValueOnce(new Error('database unavailable'))
        .mockResolvedValue(null),
    },
  };
  const context = ctx();
  await expect(getAuthSession(source, context)).rejects.toThrow('database unavailable');
  expect(await getAuthSession(source, context)).toMatchObject({
    authenticated: false,
    userId: null,
    sessionId: null,
  });
  expect(source.api.getSession).toHaveBeenCalledTimes(2);
});

it('does not let a rejected earlier read evict a newer forced validation', async () => {
  let reject = (_reason: Error) => {};
  const old = new Promise<null>((_resolve, fail) => {
    reject = fail;
  });
  const source = {
    api: { getSession: vi.fn().mockReturnValueOnce(old).mockResolvedValue(identity) },
  };
  const context = ctx();
  const first = getAuthSession(source, context);
  const fresh = getAuthSession(source, context, { fresh: true });
  reject(new Error('stale failure'));
  await expect(first).rejects.toThrow('stale failure');
  expect(await getAuthSession(source, context)).toBe(await fresh);
  expect(source.api.getSession).toHaveBeenCalledTimes(2);
});

it('requires authentication even when optional is combined with a restriction and composes policies', async () => {
  const missing = { api: { getSession: async () => null } };
  for (const options of [
    {},
    { optional: true, verifiedEmail: true },
    { optional: true, policy: () => true },
  ]) {
    await expect(
      new (createAuthGuard(missing, options))().canActivate(ctx()),
    ).rejects.toBeInstanceOf(HttpError);
  }
  expect(await new (createAuthGuard(missing, { optional: true }))().canActivate(ctx())).toBe(true);
  const source = { api: { getSession: async () => identity } };
  expect(await new (createAuthGuard(source))().canActivate(ctx())).toBe(true);
  await expect(
    new (createAuthGuard(source, { policy: () => false }))().canActivate(ctx()),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    new (createAuthGuard(source, { verifiedEmail: true }))().canActivate(ctx()),
  ).rejects.toMatchObject({ status: 403 });
  const authenticated = await requireAuthSession(source, ctx());
  expect(
    await allPolicies(
      () => true,
      async () => true,
    )(authenticated, ctx()),
  ).toBe(true);
  expect(
    await allPolicies(
      () => false,
      () => {
        throw new Error('must short circuit');
      },
    )(authenticated, ctx()),
  ).toBe(false);
});
