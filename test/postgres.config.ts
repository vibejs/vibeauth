import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';

export const auth = betterAuth({
  baseURL: 'https://postgres.example.test',
  secret: 'deterministic-local-postgres-test-secret-only',
  database: drizzleAdapter(drizzle(new PGlite()), { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  advanced: { disableOriginCheck: false, disableCSRFCheck: false },
});
