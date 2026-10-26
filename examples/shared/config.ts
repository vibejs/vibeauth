import { appendFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export function configuration(mode: 'basic' | 'saas', env = process.env) {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('replace-with-'))
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
  const url = new URL(
    env.BETTER_AUTH_URL ?? (mode === 'basic' ? 'http://127.0.0.1:5173' : 'http://localhost:5174'),
  );
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    throw new Error('BETTER_AUTH_URL must use HTTPS outside loopback development.');
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password)
    throw new Error('BETTER_AUTH_URL must be an origin.');
  const localMail = env.VIBEAUTH_LOCAL_MAIL === '1';
  if (localMail && !local)
    throw new Error('Local email delivery is restricted to a loopback origin.');
  if (!localMail && (!env.EMAIL_DELIVERY_URL || !env.EMAIL_DELIVERY_TOKEN))
    throw new Error('Configure email delivery or explicitly enable loopback local mail.');
  if (env.EMAIL_DELIVERY_URL && new URL(env.EMAIL_DELIVERY_URL).protocol !== 'https:')
    throw new Error('EMAIL_DELIVERY_URL must use HTTPS.');
  const trustedOrigins = (env.TRUSTED_ORIGINS ?? url.origin)
    .split(',')
    .map((value) => value.trim());
  for (const origin of trustedOrigins) {
    const parsed = new URL(origin);
    if (
      parsed.origin !== origin ||
      origin.includes('*') ||
      (parsed.protocol !== 'https:' &&
        !(
          parsed.protocol === 'http:' &&
          local &&
          ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
        ))
    )
      throw new Error('TRUSTED_ORIGINS must contain exact, secure origins.');
  }
  const port = Number(env.PORT ?? (mode === 'basic' ? 3001 : 3002));
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('PORT must be an integer between 0 and 65535.');
  for (const provider of ['GITHUB', 'GOOGLE', 'APPLE']) {
    if (Boolean(env[`${provider}_CLIENT_ID`]) !== Boolean(env[`${provider}_CLIENT_SECRET`]))
      throw new Error(`${provider} requires both client ID and secret.`);
  }
  const directory = resolve('.local');
  return {
    secret,
    baseURL: url.origin,
    trustedOrigins,
    secure: url.protocol === 'https:',
    database: resolve(env.DATABASE_PATH ?? `.local/${mode}.sqlite`),
    port,
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
      ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
        ? {
            apple: {
              clientId: env.APPLE_CLIENT_ID,
              clientSecret: env.APPLE_CLIENT_SECRET,
              appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
            },
          }
        : {}),
    },
    async deliver(message: { kind: string; email: string; url: string }) {
      if (localMail) {
        // Explicit local mail transport, never an auth log or public HTTP endpoint.
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await appendFile(resolve(directory, 'outbox.jsonl'), `${JSON.stringify(message)}\n`, {
          mode: 0o600,
        });
      } else {
        const response = await fetch(env.EMAIL_DELIVERY_URL!, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${env.EMAIL_DELIVERY_TOKEN}`,
          },
          body: JSON.stringify(message),
        });
        if (!response.ok) throw new Error('Email delivery failed.');
      }
    },
  };
}
