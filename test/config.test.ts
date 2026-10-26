import { expect, it } from 'vitest';
import { configuration } from '../examples/shared/config.ts';
const local = {
  BETTER_AUTH_SECRET: 'deterministic-local-configuration-test-secret',
  VIBEAUTH_LOCAL_MAIL: '1',
};
it('validates example configuration without implicit development security changes', () => {
  expect(() => configuration('basic', {})).toThrow('BETTER_AUTH_SECRET');
  expect(() =>
    configuration('basic', {
      ...local,
      BETTER_AUTH_SECRET: 'replace-with-a-random-secret-at-least-32-characters',
    }),
  ).toThrow('BETTER_AUTH_SECRET');
  expect(configuration('basic', local).baseURL).toBe('http://127.0.0.1:5173');
  expect(configuration('saas', local).baseURL).toBe('http://localhost:5174');
  expect(configuration('basic', local).secure).toBe(false);
  for (const url of [
    'http://app.example.test',
    'https://app.example.test/path',
    'https://user:pass@app.example.test',
  ])
    expect(() => configuration('basic', { ...local, BETTER_AUTH_URL: url })).toThrow(
      /Invalid URL|BETTER_AUTH_URL|TRUSTED_ORIGINS/,
    );
  expect(() =>
    configuration('basic', { ...local, BETTER_AUTH_URL: 'https://app.example.test' }),
  ).toThrow('loopback');
  expect(() => configuration('basic', { ...local, VIBEAUTH_LOCAL_MAIL: '0' })).toThrow(
    'email delivery',
  );
  expect(() =>
    configuration('basic', { ...local, EMAIL_DELIVERY_URL: 'http://mail.example.test' }),
  ).toThrow('HTTPS');
  for (const trusted of ['*', 'https://*.example.test', 'ftp://localhost'])
    expect(() => configuration('basic', { ...local, TRUSTED_ORIGINS: trusted })).toThrow(
      /Invalid URL|BETTER_AUTH_URL|TRUSTED_ORIGINS/,
    );
  expect(() => configuration('basic', { ...local, PORT: 'invalid' })).toThrow('PORT');
  expect(() => configuration('saas', { ...local, GITHUB_CLIENT_ID: 'incomplete' })).toThrow('both');
  const secure = configuration('basic', {
    BETTER_AUTH_SECRET: local.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: 'https://app.example.test',
    EMAIL_DELIVERY_URL: 'https://mail.example.test',
    EMAIL_DELIVERY_TOKEN: 'local-test-placeholder',
  });
  expect(secure.secure).toBe(true);
  expect(secure.trustedOrigins).toEqual(['https://app.example.test']);
});
