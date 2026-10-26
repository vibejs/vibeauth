import { DatabaseSync } from 'node:sqlite';
import { isIP } from 'node:net';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { admin, organization, twoFactor } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc,
} from 'better-auth/plugins/organization/access';
import { passkey } from '@better-auth/passkey';
import { configuration } from '../../shared/config.ts';

export function createSaasAuth(
  options: {
    config?: ReturnType<typeof configuration>;
    database?: DatabaseSync;
    logger?: BetterAuthOptions['logger'];
  } = {},
) {
  const config = options.config ?? configuration('saas');
  if (isIP(new URL(config.baseURL).hostname))
    throw new Error('Passkeys require a DNS hostname; use localhost for local SaaS development.');
  if (!options.database) mkdirSync(dirname(config.database), { recursive: true, mode: 0o700 });
  const database = options.database ?? new DatabaseSync(config.database);
  if (!options.database) chmodSync(config.database, 0o600);
  const ac = createAccessControl({
    ...defaultStatements,
    project: ['read', 'create', 'update', 'delete'],
  });
  const auth = betterAuth({
    logger: options.logger,
    database,
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    socialProviders: config.socialProviders,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        config.deliver({ kind: 'reset', email: user.email, url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) =>
        config.deliver({ kind: 'verify', email: user.email, url }),
    },
    session: { expiresIn: 604800, updateAge: 86400, freshAge: 300 },
    rateLimit: { enabled: true, storage: 'database' },
    advanced: {
      useSecureCookies: config.secure,
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
    plugins: [
      admin(),
      organization({
        ac,
        roles: {
          owner: ac.newRole({
            ...ownerAc.statements,
            project: ['read', 'create', 'update', 'delete'],
          }),
          admin: ac.newRole({ ...adminAc.statements, project: ['read', 'create', 'update'] }),
          member: ac.newRole({ ...memberAc.statements, project: ['read'] }),
        },
        teams: { enabled: true },
        sendInvitationEmail: (data) =>
          config.deliver({
            kind: 'invite',
            email: data.email,
            url: `${config.baseURL}/?invitationId=${encodeURIComponent(data.id)}`,
          }),
      }),
      twoFactor({ issuer: 'VibeAuth' }),
      passkey({
        rpID: new URL(config.baseURL).hostname,
        rpName: 'VibeAuth',
        origin: config.baseURL,
      }),
    ],
  });
  return { auth, config, database };
}
