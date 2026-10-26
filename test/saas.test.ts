import { expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { getMigrations } from 'better-auth/db/migration';
import { createSaasAuth } from '../examples/saas/server/auth.ts';
import { createSaasApplication } from '../examples/saas/server/application.ts';
import { cookies, credentials } from './fixture.ts';

it('enforces membership, role AND resource tenant on real SaaS business endpoints', async () => {
  const origin = 'https://saas.example.test';
  const mail: string[] = [];
  const context = createSaasAuth({
    database: new DatabaseSync(':memory:'),
    logger: { disabled: true },
    config: {
      baseURL: origin,
      secret: 'deterministic-local-saas-test-secret-only',
      trustedOrigins: [origin],
      secure: true,
      database: ':memory:',
      port: 0,
      socialProviders: {},
      deliver: async (message) => {
        mail.push(message.url);
      },
    },
  });
  await (await getMigrations(context.auth.options)).runMigrations();
  context.database.exec(
    'CREATE TABLE project (id TEXT PRIMARY KEY, name TEXT NOT NULL, organizationId TEXT NOT NULL, createdBy TEXT NOT NULL)',
  );
  const app = await createSaasApplication(context);
  const request = (path: string, cookie = '', body?: unknown, withOrigin = true) =>
    app.fetch(
      new Request(`${origin}/api${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { cookie, ...(withOrigin ? { origin } : {}), 'content-type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  async function register(email: string) {
    await request('/auth/sign-up/email', '', { ...credentials, email });
    await app.fetch(new Request(mail.at(-1)!));
    const response = await request('/auth/sign-in/email', '', { ...credentials, email });
    return { cookie: cookies(response), user: (await response.json()).user };
  }
  try {
    const a = await register('ada@example.test'),
      b = await register('grace@example.test');
    const orgA = await (
      await request('/auth/organization/create', a.cookie, { name: 'Ada', slug: 'ada' })
    ).json();
    const orgB = await (
      await request('/auth/organization/create', b.cookie, { name: 'Grace', slug: 'grace' })
    ).json();
    expect((await request(`/workspaces/${orgA.id}/projects`)).status).toBe(401);
    expect((await request(`/workspaces/${orgA.id}/projects`, b.cookie)).status).toBe(403);
    const projectA = await (
      await request(`/workspaces/${orgA.id}/projects`, a.cookie, { name: 'A private project' })
    ).json();
    const projectB = await (
      await request(`/workspaces/${orgB.id}/projects`, b.cookie, { name: 'B private project' })
    ).json();
    expect(
      (
        await request(`/workspaces/${orgA.id}/projects/${projectB.id}`, a.cookie, {
          name: 'Stolen',
        })
      ).status,
    ).toBe(403);
    await context.auth.api.addMember({
      body: { organizationId: orgA.id, userId: b.user.id, role: 'member' },
    });
    expect((await request(`/workspaces/${orgA.id}/projects`, b.cookie)).status).toBe(200);
    const teamResponse = await request('/auth/organization/create-team', a.cookie, {
      organizationId: orgA.id,
      name: 'Project team',
    });
    expect(teamResponse.status).toBe(200);
    const team = await teamResponse.json();
    expect(
      (
        await request('/auth/organization/add-team-member', a.cookie, {
          teamId: team.id,
          userId: b.user.id,
        })
      ).status,
    ).toBe(200);
    const teamMembers = await request(
      `/auth/organization/list-team-members?teamId=${team.id}`,
      b.cookie,
    );
    expect(teamMembers.status).toBe(200);
    expect(JSON.stringify(await teamMembers.json())).toContain(b.user.id);
    expect(
      (
        await request('/auth/organization/remove-team-member', a.cookie, {
          teamId: team.id,
          userId: b.user.id,
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await request(`/workspaces/${orgA.id}/projects/${projectA.id}`, b.cookie, {
          name: 'Escalated',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(`/workspaces/${orgA.id}/projects/${projectA.id}`, a.cookie, {
          name: 'Updated',
        })
      ).status,
    ).toBe(200);
    expect(
      (await request(`/workspaces/${orgA.id}/projects`, a.cookie, { name: 'CSRF' }, false)).status,
    ).toBe(403);
    const sessions = await request('/account/sessions', a.cookie);
    const list = await sessions.json();
    expect(JSON.stringify(list)).not.toContain('token');
    expect((await request(`/account/sessions/${list[0].id}/revoke`, b.cookie, {})).status).toBe(
      403,
    );
    await request('/auth/sign-out', a.cookie, {});
    expect((await request(`/workspaces/${orgA.id}/projects`, a.cookie)).status).toBe(401);
  } finally {
    await app.close();
    context.database.close();
  }
});
