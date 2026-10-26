import { afterEach, expect, it } from 'vitest';
import { base32 } from '@better-auth/utils/base32';
import { cookies, credentials, fixture } from '../../test/fixture.ts';

let f: Awaited<ReturnType<typeof fixture>>;
afterEach(async () => {
  await f?.close();
});

it('uses official MFA enrollment, TOTP, unauthenticated challenge and single-use backup codes', async () => {
  f = await fixture();
  let cookie = cookies(await f.request('/api/auth/sign-up/email', credentials));
  const enable = await f.request(
    '/api/auth/two-factor/enable',
    { password: credentials.password },
    cookie,
  );
  expect(enable.status).toBe(200);
  const { totpURI, backupCodes } = await enable.json();
  const secret = new TextDecoder().decode(
    base32.decode(new URL(totpURI).searchParams.get('secret')!),
  );
  // Supported Better Auth server-only test utility; no custom TOTP generation or verification.
  const { code } = await f.auth.api.generateTOTP({ body: { secret } });
  const verified = await f.request('/api/auth/two-factor/verify-totp', { code }, cookie);
  expect(verified.status).toBe(200);
  cookie = cookies(verified);
  await f.request('/api/auth/sign-out', {}, cookie);
  const challenge = await f.request('/api/auth/sign-in/email', credentials);
  expect(await challenge.clone().json()).toMatchObject({ twoFactorRedirect: true });
  const challengeCookie = cookies(challenge);
  expect((await f.request('/api/private/profile', undefined, challengeCookie)).status).toBe(401);
  expect(
    (await f.request('/api/auth/two-factor/verify-totp', { code: 'invalid' }, challengeCookie))
      .status,
  ).toBe(401);
  const recovered = await f.request(
    '/api/auth/two-factor/verify-backup-code',
    { code: backupCodes[0] },
    challengeCookie,
  );
  expect(recovered.status).toBe(200);
  expect((await f.request('/api/private/profile', undefined, cookies(recovered))).status).toBe(200);
  await f.request('/api/auth/sign-out', {}, cookies(recovered));
  const secondChallenge = await f.request('/api/auth/sign-in/email', credentials);
  expect(
    (
      await f.request(
        '/api/auth/two-factor/verify-backup-code',
        { code: backupCodes[0] },
        cookies(secondChallenge),
      )
    ).status,
  ).toBe(401);
  const trusted = await f.request(
    '/api/auth/two-factor/verify-totp',
    { code, trustDevice: true },
    cookies(secondChallenge),
  );
  expect(trusted.status).toBe(200);
  const trustedCookie = cookies(trusted);
  await f.request('/api/auth/sign-out', {}, trustedCookie);
  const trustedLogin = await f.request('/api/auth/sign-in/email', credentials, trustedCookie);
  expect(trustedLogin.status).toBe(200);
  expect(await trustedLogin.clone().json()).not.toHaveProperty('twoFactorRedirect');
  expect(
    (
      await f.request(
        '/api/auth/two-factor/disable',
        { password: credentials.password },
        cookies(trustedLogin),
      )
    ).status,
  ).toBe(200);
});

it('isolates organizations, invitations and roles and rejects privilege escalation', async () => {
  f = await fixture();
  const a = await f.request('/api/auth/sign-up/email', credentials);
  const b = await f.request('/api/auth/sign-up/email', {
    ...credentials,
    email: 'grace@example.test',
    name: 'Grace',
  });
  for (const email of f.mail.filter((mail) => mail.kind === 'verify'))
    await f.app.fetch(new Request(email.url));
  const owner = cookies(await f.request('/api/auth/sign-in/email', credentials));
  const member = cookies(
    await f.request('/api/auth/sign-in/email', { ...credentials, email: 'grace@example.test' }),
  );
  const orgResponse = await f.request(
    '/api/auth/organization/create',
    { name: 'Ada workspace', slug: 'ada-workspace' },
    owner,
  );
  expect(orgResponse.status).toBe(200);
  const org = await orgResponse.json();
  const ownOrg = await f.request(
    '/api/auth/organization/create',
    { name: 'Grace workspace', slug: 'grace-workspace' },
    member,
  );
  expect(ownOrg.status).toBe(200);
  expect(
    (
      await f.request(
        `/api/auth/organization/get-full-organization?organizationId=${org.id}`,
        undefined,
        member,
      )
    ).status,
  ).toBe(403);
  expect(
    (await f.request('/api/auth/organization/set-active', { organizationId: org.id }, member))
      .status,
  ).toBeGreaterThanOrEqual(400);
  const invite = await f.request(
    '/api/auth/organization/invite-member',
    { organizationId: org.id, email: 'grace@example.test', role: 'member' },
    owner,
  );
  expect(invite.status).toBe(200);
  const invitation = await invite.json();
  expect(
    (
      await f.request(
        '/api/auth/organization/accept-invitation',
        { invitationId: invitation.id },
        member,
      )
    ).status,
  ).toBe(200);
  const full = await f.request(
    `/api/auth/organization/get-full-organization?organizationId=${org.id}`,
    undefined,
    member,
  );
  expect(full.status).toBe(200);
  const members = await (
    await f.request(
      `/api/auth/organization/get-full-organization?organizationId=${org.id}`,
      undefined,
      owner,
    )
  ).json();
  const grace = members.members.find((entry: { role: string }) => entry.role === 'member');
  expect(grace).toBeTruthy();
  expect(
    (
      await f.request(
        '/api/auth/organization/update-member-role',
        { organizationId: org.id, memberId: grace.id, role: 'owner' },
        member,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await f.request(
        '/api/auth/admin/set-role',
        { userId: (await b.json()).user.id, role: 'admin' },
        member,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await f.request(
        '/api/auth/organization/update-member-role',
        { organizationId: org.id, memberId: grace.id, role: 'admin' },
        owner,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await f.request(
        '/api/auth/organization/remove-member',
        { organizationId: org.id, memberIdOrEmail: grace.id },
        owner,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await f.request(
        `/api/auth/organization/get-full-organization?organizationId=${org.id}`,
        undefined,
        member,
      )
    ).status,
  ).toBe(403);
  expect((await a.json()).user.id).toBeTruthy();
});

it('lists sessions and revokes other/all sessions using Better Auth', async () => {
  f = await fixture();
  const first = cookies(await f.request('/api/auth/sign-up/email', credentials));
  const second = cookies(await f.request('/api/auth/sign-in/email', credentials));
  const sessions = await f.request('/api/auth/list-sessions', undefined, first);
  expect(sessions.status).toBe(200);
  expect((await sessions.json()).length).toBe(2);
  expect((await f.request('/api/auth/revoke-other-sessions', {}, second)).status).toBe(200);
  expect((await f.request('/api/private/profile', undefined, first)).status).toBe(401);
  expect((await f.request('/api/private/profile', undefined, second)).status).toBe(200);
  expect((await f.request('/api/auth/revoke-sessions', {}, second)).status).toBe(200);
  expect((await f.request('/api/private/profile', undefined, second)).status).toBe(401);
});
