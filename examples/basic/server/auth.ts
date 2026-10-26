import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { betterAuth } from 'better-auth';
import { configuration } from '../../shared/config.ts';

export function createExampleAuth() {
  const config = configuration('basic');
  mkdirSync(dirname(config.database), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(config.database);
  chmodSync(config.database, 0o600);
  const auth = betterAuth({
    database,
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
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
  });
  return { auth, config, database };
}
