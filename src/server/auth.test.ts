import { afterEach, describe, expect, it } from 'vitest';
import { createClient } from '@usevibejs/contract';
import { credentials, cookies, fixture, origin } from '../../test/fixture.ts';

const open: Awaited<ReturnType<typeof fixture>>[] = [];
afterEach(async () => {
  for (const f of open.splice(0)) await f.close();
});
async function setup(options?: Parameters<typeof fixture>[0]) {
  const f = await fixture(options);
  open.push(f);
  return f;
}

describe('real Better Auth + VibeFactory.fetch', () => {
  it('mounts a custom absolute auth path and preserves native unsupported-method responses', async () => {
    const f = await setup({ basePath: '/identity' });
    expect((await f.request('/identity/ok')).status).toBe(200);
    expect((await f.request('/api/identity/ok')).status).toBe(404);
    expect((await f.request('/api/auth/ok')).status).toBe(404);
    expect((await f.request('/identity/sign-in/email')).status).toBe(404);
  });

  it('keeps recovery responses generic and ignores signup role escalation claims', async () => {
    const f = await setup();
    const response = await f.request('/api/auth/sign-up/email', { ...credentials, role: 'admin' });
    expect(response.status).toBe(400);
    const legitimate = await f.request('/api/auth/sign-up/email', credentials);
    expect(legitimate.status).toBe(200);
    expect((await legitimate.json()).user.role).toBe('user');
    const known = await f.request('/api/auth/request-password-reset', { email: credentials.email });
    const unknown = await f.request('/api/auth/request-password-reset', {
      email: 'missing@example.test',
    });
    expect(known.status).toBe(unknown.status);
    expect(await known.json()).toEqual(await unknown.json());
    expect(f.mail.filter((mail) => mail.kind === 'reset')).toHaveLength(1);
  });

  it('checks the current password and revokes other sessions on a password change', async () => {
    const f = await setup();
    const first = cookies(await f.request('/api/auth/sign-up/email', credentials));
    const second = cookies(await f.request('/api/auth/sign-in/email', credentials));
    const newPassword = 'Replacement-password-981!';
    expect(
      (
        await f.request(
          '/api/auth/change-password',
          { currentPassword: 'wrong-password', newPassword, revokeOtherSessions: true },
          second,
        )
      ).status,
    ).toBe(400);
    const changed = await f.request(
      '/api/auth/change-password',
      { currentPassword: credentials.password, newPassword, revokeOtherSessions: true },
      second,
    );
    expect(changed.status).toBe(200);
    expect((await f.request('/api/private/profile', undefined, first)).status).toBe(401);
    expect(
      (await f.request('/api/auth/sign-in/email', { ...credentials, password: newPassword }))
        .status,
    ).toBe(200);
  });
  it('registers, sets secure cookies, authenticates typed APIs, logs out and rejects revoked cookies', async () => {
    const f = await setup();
    expect((await f.request('/api/private/profile')).status).toBe(401);
    const registration = await f.request('/api/auth/sign-up/email', credentials);
    expect(registration.status).toBe(200);
    const setCookies = registration.headers.getSetCookie();
    expect(setCookies.length).toBeGreaterThan(1);
    expect(setCookies.join(' ')).toMatch(/HttpOnly/i);
    expect(setCookies.join(' ')).toMatch(/Secure/i);
    expect(setCookies.join(' ')).toMatch(/SameSite=Lax/i);
    const cookie = cookies(registration);
    const client = createClient(
      { private: f.routes },
      { baseUrl: `${origin}/api`, fetch: f.app.fetch, headers: { cookie } },
    );
    const profile = await client.private.profile();
    expect(profile.ok).toBe(true);
    if (!profile.ok) throw new Error('Expected successful typed API response');
    expect(profile.data.name).toBe('Ada');
    expect((await f.request('/api/private/profile', undefined, cookie)).status).toBe(200);
    const logout = await f.request('/api/auth/sign-out', {}, cookie);
    expect(logout.status).toBe(200);
    expect((await f.request('/api/private/profile', undefined, cookie)).status).toBe(401);
    const login = await f.request('/api/auth/sign-in/email', credentials);
    expect(login.status).toBe(200);
    expect(cookies(login)).not.toEqual(cookie);
  });

  it('rejects forged credentials and isolates concurrent request identities', async () => {
    const f = await setup();
    const a = await f.request('/api/auth/sign-up/email', credentials);
    const b = await f.request('/api/auth/sign-up/email', {
      ...credentials,
      name: 'Grace',
      email: 'grace@example.test',
    });
    const results = await Promise.all(
      [cookies(a), '', cookies(b), '__Secure-better-auth.session_token=forged'].map((cookie) =>
        f.request('/api/private/profile', undefined, cookie),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([200, 401, 200, 401]);
    expect(await results[0].json()).toMatchObject({ name: 'Ada' });
    expect(await results[2].json()).toMatchObject({ name: 'Grace' });
    expect(
      (await f.request('/api/auth/sign-in/email', { ...credentials, password: 'wrong-password' }))
        .status,
    ).toBe(401);
  });

  it('enforces email verification and single-use password recovery with session revocation', async () => {
    const f = await setup({ verified: true });
    const signup = await f.request('/api/auth/sign-up/email', credentials);
    expect(signup.status).toBe(200);
    expect((await f.request('/api/auth/sign-in/email', credentials)).status).toBe(403);
    const verification = f.mail.find((m) => m.kind === 'verify')!;
    expect((await f.app.fetch(new Request(verification.url))).status).toBe(302);
    const login = await f.request('/api/auth/sign-in/email', credentials);
    expect(login.status).toBe(200);
    const cookie = cookies(login);
    expect((await f.request('/api/private/verified', undefined, cookie)).status).toBe(200);
    const reset = await f.request('/api/auth/request-password-reset', {
      email: credentials.email,
      redirectTo: `${origin}/reset-password`,
    });
    expect(reset.status).toBe(200);
    const token = new URL(f.mail.find((m) => m.kind === 'reset')!.url).pathname.split('/').at(-1)!;
    const newPassword = 'Replacement-password-937!';
    expect((await f.request('/api/auth/reset-password', { token, newPassword })).status).toBe(200);
    expect((await f.request('/api/auth/reset-password', { token, newPassword })).status).toBe(400);
    expect((await f.request('/api/private/profile', undefined, cookie)).status).toBe(401);
    expect((await f.request('/api/auth/sign-in/email', credentials)).status).toBe(401);
    expect(
      (await f.request('/api/auth/sign-in/email', { ...credentials, password: newPassword }))
        .status,
    ).toBe(200);
  });

  it('rejects untrusted origins, login CSRF, unsafe callback URLs and invalid OAuth state', async () => {
    const f = await setup();
    const untrusted = await f.request('/api/auth/sign-up/email', credentials, '', 'POST', {
      origin: 'https://attacker.example',
    });
    expect(untrusted.status).toBe(403);
    const csrf = await f.app.fetch(
      new Request(`${origin}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'sec-fetch-site': 'cross-site',
          'sec-fetch-mode': 'navigate',
        },
        body: new URLSearchParams(credentials),
      }),
    );
    expect(csrf.status).toBe(403);
    const callback = await f.request('/api/auth/sign-in/social', {
      provider: 'github',
      callbackURL: 'https://attacker.example/steal',
    });
    expect(callback.status).toBe(403);
    const oauth = await f.request('/api/auth/callback/github?state=forged&code=fake');
    expect(oauth.status).toBe(302);
    expect(oauth.headers.get('location')).toContain('error=');
    expect((await f.request('/api/private/profile')).status).toBe(401);
  });

  it('distinguishes optional, verified and resource authorization', async () => {
    const f = await setup();
    expect(await (await f.request('/api/private/optional')).json()).toBe(false);
    const signup = await f.request('/api/auth/sign-up/email', credentials);
    const cookie = cookies(signup);
    const user = (await signup.json()).user;
    expect((await f.request('/api/private/verified', undefined, cookie)).status).toBe(403);
    expect((await f.request(`/api/private/${user.id}`, {}, cookie)).status).toBe(200);
    expect((await f.request('/api/private/another-user', {}, cookie)).status).toBe(403);
    expect((await f.request('/api/private/another-user', {})).status).toBe(401);
  });

  it('rejects expired sessions and limits repeated requests', async () => {
    const f = await setup({ expiresIn: 1 });
    const signup = await f.request('/api/auth/sign-up/email', credentials);
    const cookie = cookies(signup);
    // Modify only expiry in this isolated database; verification remains Better Auth's real API.
    f.database.prepare('UPDATE session SET expiresAt = ?').run(Date.now() - 10000);
    expect((await f.request('/api/private/profile', undefined, cookie)).status).toBe(401);
    const limited = await setup({ rateLimit: 1 });
    await limited.request('/api/auth/ok');
    expect((await limited.request('/api/auth/ok')).status).toBe(429);
    const invalid = { email: 'missing@example.test', password: 'invalid-password-attempt' };
    expect((await limited.request('/api/auth/sign-in/email', invalid)).status).toBe(401);
    expect((await limited.request('/api/auth/sign-in/email', invalid)).status).toBe(429);
  });
});
